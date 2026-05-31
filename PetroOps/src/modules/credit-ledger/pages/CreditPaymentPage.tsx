import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Landmark, CreditCard, Smartphone, Check, 
  AlertTriangle, DollarSign, Calculator, RefreshCw 
} from 'lucide-react';
import { CreditCustomer, CreditTransaction } from '../../../types/CreditCustomer';
import { ShiftRecord } from '../../../types';

// Safe inline calculation evaluator
const evaluateMathExpression = (input: string): number => {
  const sanitized = input.replace(/[^0-9+\-*/().]/g, '');
  if (!sanitized) return 0;
  try {
    const result = new Function(`return ${sanitized}`)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : 0;
  } catch {
    return parseFloat(input) || 0;
  }
};

export default function CreditPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Load state parameter if navigated from details page
  const selectCustomerId = location.state?.selectCustomerId || '';

  // Data lists
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState(selectCustomerId);
  const [amountInput, setAmountInput] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>('CASH');
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Alerts & UX
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  // Glove-Safe Numpad state
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');

  // 1. Initial Data Load
  useEffect(() => {
    const savedCustomers = localStorage.getItem('pumpai_credit_customers');
    const savedTransactions = localStorage.getItem('pumpai_credit_transactions');
    const activeShiftDraft = localStorage.getItem('pumpai_active_shift_draft');

    let loadedCustomers: CreditCustomer[] = [];
    let loadedTransactions: CreditTransaction[] = [];
    let shiftRecord: ShiftRecord | null = null;

    if (savedCustomers) {
      try { loadedCustomers = JSON.parse(savedCustomers); } catch {}
    }
    if (savedTransactions) {
      try { loadedTransactions = JSON.parse(savedTransactions); } catch {}
    }
    if (activeShiftDraft) {
      try {
        const shifts: ShiftRecord[] = JSON.parse(activeShiftDraft);
        const active = shifts.find(s => s.status === 'NEEDS_REVIEW');
        if (active) shiftRecord = active;
      } catch {}
    }

    setTransactions(loadedTransactions);
    setActiveShift(shiftRecord);

    // Compute deterministic dues outstanding for dropdown selection
    const reconciledCustomers = loadedCustomers.map(cust => {
      const balance = loadedTransactions
        .filter(t => t.customerId === cust.id)
        .reduce((sum, tx) => {
          if (tx.type === 'FUEL_SALE') return sum + tx.amount;
          if (tx.type === 'PAYMENT_RECOVERY') return sum - tx.amount;
          if (tx.type === 'ADJUSTMENT') return sum + tx.amount;
          return sum;
        }, 0);
      return { ...cust, outstandingBalance: balance };
    });

    setCustomers(reconciledCustomers);
  }, []);

  // 2. Select customer info
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const calculatedAmount = useMemo(() => {
    return evaluateMathExpression(amountInput);
  }, [amountInput]);

  // Pre-validate for duplicates or overpayment on amount change
  useEffect(() => {
    setWarningMessage('');
    if (!selectedCustomer) return;

    if (calculatedAmount > selectedCustomer.outstandingBalance) {
      setWarningMessage(`Warning: Recovering ₹${calculatedAmount.toLocaleString('en-IN')}, which exceeds the client's current outstanding dues of ₹${selectedCustomer.outstandingBalance.toLocaleString('en-IN')}.`);
    }
  }, [calculatedAmount, selectedCustomer]);

  // 3. Quick Preset Adds
  const handleAddPreset = (val: number) => {
    const current = evaluateMathExpression(amountInput);
    setAmountInput(String(current + val));
  };

  const handleNumpadConfirm = () => {
    setAmountInput(numpadValue);
    setShowNumpad(false);
  };

  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setNumpadValue('');
    } else if (val === 'DEL') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else {
      if (val === '.' && numpadValue.includes('.')) return;
      setNumpadValue(prev => prev + val);
    }
  };

  // 4. Handle recovery posting
  const handlePostRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setWarningMessage('');

    if (!selectedCustomer) {
      setErrorMessage("Please select a registered credit customer.");
      return;
    }

    if (calculatedAmount <= 0) {
      setErrorMessage("Enter a valid recovery amount greater than zero.");
      return;
    }

    // Evaluate split values
    const cashVal = paymentMode === 'CASH' ? calculatedAmount : (paymentMode === 'SPLIT' ? evaluateMathExpression(splitCash) : 0);
    const upiVal = paymentMode === 'UPI' ? calculatedAmount : (paymentMode === 'SPLIT' ? evaluateMathExpression(splitUpi) : 0);
    const cardVal = paymentMode === 'CARD' ? calculatedAmount : (paymentMode === 'SPLIT' ? evaluateMathExpression(splitCard) : 0);

    // Validate splits match total recovery amount exactly if SPLIT is selected
    if (paymentMode === 'SPLIT') {
      const sumSplits = cashVal + upiVal + cardVal;
      if (Math.abs(sumSplits - calculatedAmount) > 0.01) {
        setErrorMessage(`SPLIT ALLOCATION MISMATCH: The sum of Cash (₹${cashVal}), UPI (₹${upiVal}), and Card (₹${cardVal}) allocations is ₹${sumSplits.toLocaleString('en-IN')}, which does not match the total recovery amount of ₹${calculatedAmount.toLocaleString('en-IN')}. Please balance the split allocations exactly.`);
        return;
      }
    }

    // A. DUPLICATE TRANSACTION PREVENTION
    // Check if another recovery for this exact customer with the exact same amount was posted in the last 60 seconds
    const duplicate = transactions.find(t => {
      if (t.customerId !== selectedCustomerId) return false;
      if (t.type !== 'PAYMENT_RECOVERY') return false;
      if (t.amount !== calculatedAmount) return false;

      const diffMs = Date.now() - new Date(t.date).getTime();
      return diffMs >= 0 && diffMs < 60000; // Posted in the last 60 seconds
    });

    if (duplicate) {
      setErrorMessage("DUPLICATE ENTRY DETECTED: A payment recovery of the exact same amount was recorded for this customer in the last 60 seconds. To prevent double charging, this transaction has been blocked.");
      return;
    }

    // B. Build the Transaction Event Log
    const newTx: CreditTransaction = {
      id: `tx_${Date.now()}`,
      customerId: selectedCustomerId,
      customerName: selectedCustomer.name,
      type: 'PAYMENT_RECOVERY',
      amount: calculatedAmount,
      date: new Date().toISOString(),
      paymentMode,
      splitDetails: paymentMode === 'SPLIT' ? {
        cash: cashVal,
        upi: upiVal,
        card: cardVal
      } : undefined,
      referenceId: slipNumber.trim() || `REC_${Date.now().toString().slice(-6)}`,
      remarks: remarks.trim() || (paymentMode === 'SPLIT'
        ? `Payment recovered via SPLIT (Cash: ₹${cashVal}, UPI: ₹${upiVal}, Card: ₹${cardVal})`
        : `Payment recovered via ${paymentMode}`)
    };

    const updatedTxs = [...transactions, newTx];

    // C. Replay-Safe Recalculation verification
    // Verify that the customer's new balance evaluates correctly after appending
    const expectedNewBalance = selectedCustomer.outstandingBalance - calculatedAmount;
    const replayedNewBalance = updatedTxs
      .filter(t => t.customerId === selectedCustomerId)
      .reduce((sum, tx) => {
        if (tx.type === 'FUEL_SALE') return sum + tx.amount;
        if (tx.type === 'PAYMENT_RECOVERY') return sum - tx.amount;
        if (tx.type === 'ADJUSTMENT') return sum + tx.amount;
        return sum;
      }, 0);

    if (replayedNewBalance !== expectedNewBalance) {
      setErrorMessage("REPLAY INTEGRITY ERROR: Financial calculation mismatch during ledger simulation. Transaction aborted.");
      return;
    }

    // D. Persist Customer & Transaction Storage
    const updatedCustomers = customers.map(c => c.id === selectedCustomerId ? {
      ...c,
      outstandingBalance: replayedNewBalance
    } : c);

    localStorage.setItem('pumpai_credit_customers', JSON.stringify(updatedCustomers));
    localStorage.setItem('pumpai_credit_transactions', JSON.stringify(updatedTxs));

    // E. Double-Entry active shift credit recovery integration
    if (activeShift) {
      const shiftDraftKey = 'pumpai_active_shift_draft';
      const rawShifts = localStorage.getItem(shiftDraftKey);
      if (rawShifts) {
        try {
          const shiftList: ShiftRecord[] = JSON.parse(rawShifts);
          const updatedShifts = shiftList.map(s => {
            if (s.id === activeShift.id) {
              const currentRecovery = typeof s.creditRecovery === 'number' ? s.creditRecovery : 0;
              const prevSplits = s.creditRecoverySplits || { cash: 0, upi: 0, card: 0 };
              const updatedSplits = {
                cash: (prevSplits.cash || 0) + cashVal,
                upi: (prevSplits.upi || 0) + upiVal,
                card: (prevSplits.card || 0) + cardVal
              };

              const updatedS = {
                ...s,
                creditRecovery: currentRecovery + calculatedAmount,
                creditRecoverySplits: updatedSplits
              };

              // Append audit trail log
              updatedS.auditHistory?.push({
                editor: "Station Manager",
                timestamp: new Date().toISOString(),
                previousValues: {
                  note: `Recorded split client dues recovery: Collected ₹${calculatedAmount} from ${selectedCustomer.name} (Ref: ${newTx.referenceId}). Split: Cash: ₹${cashVal}, UPI: ₹${upiVal}, Card: ₹${cardVal}`,
                  previousRecovery: currentRecovery,
                  previousSplits: prevSplits
                }
              });

              return updatedS;
            }
            return s;
          });

          localStorage.setItem(shiftDraftKey, JSON.stringify(updatedShifts));
        } catch (err) {
          console.error("Failed to link recovery directly into active shift stats:", err);
        }
      }
    }

    // UX success state
    setPostedSuccess(true);
    setAmountInput('');
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setSlipNumber('');
    setRemarks('');
    setSelectedCustomerId('');

    setTimeout(() => {
      setPostedSuccess(false);
      navigate(`/credit-ledger/customer/${selectedCustomerId}`);
    }, 1500);
  };

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 bg-[#F9F9F8] min-h-screen text-[#1A1A1A] select-none">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/credit-ledger')}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-2xl border border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1] min-h-[48px] shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Ledger
        </button>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1A1A] flex items-center gap-2.5">
          <Landmark className="w-8 h-8 text-[#D35400]" /> Dues Recovery Collection Pad
        </h1>
        <p className="text-[10px] sm:text-xs text-[#666666] mt-1 font-semibold uppercase tracking-wider">
          Log cash, card, or UPI recoveries from credit clients. Records immediately update client ledger & active shift reconciliation cash counts.
        </p>
      </div>

      {/* Recovery Container */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        
        {/* Left Customer Info column */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="p-6 rounded-3xl bg-white border-2 border-[#EBEBEA] shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#666666] font-bold">Selected Customer Dues</span>
              <div className="mt-2">
                <span className="text-3xl sm:text-4xl font-black text-[#1A1A1A] tracking-tight block">
                  {selectedCustomer ? `₹${selectedCustomer.outstandingBalance.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
            </div>

            {selectedCustomer && (
              <div className="border-t border-[#EBEBEA] pt-4 text-xs space-y-2.5 font-medium text-[#666666]">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <strong className="text-[#1A1A1A] font-extrabold">{selectedCustomer.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Credit Limit:</span>
                  <strong className="text-[#1A1A1A] font-extrabold">₹{selectedCustomer.creditLimit.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <strong className="text-[#1A1A1A] font-extrabold">{selectedCustomer.phone}</strong>
                </div>
              </div>
            )}
          </div>

          {activeShift ? (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/15 text-xs leading-relaxed text-emerald-800">
              <span className="font-extrabold uppercase block mb-1">Shift double-entry posting active</span>
              Collected recovery payments will immediately increment expected cash in active shift: <strong>{activeShift.shiftLabel}</strong>.
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/5 border-2 border-amber-500/15 text-xs leading-relaxed text-amber-800">
              <span className="font-extrabold uppercase block mb-1">No active shift detected</span>
              Payment will update the customer ledger, but will not affect shift till cash reconciliation sheets.
            </div>
          )}
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-2">
          <form onSubmit={handlePostRecovery} className="p-6 rounded-3xl bg-white border-2 border-[#EBEBEA] shadow-sm flex flex-col gap-5">
            
            {postedSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-black uppercase flex items-center gap-2 animate-pulse">
                <Check className="w-5 h-5 text-emerald-600 animate-bounce" /> Ledger recovery committed successfully!
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-[#C62828] text-xs font-extrabold flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {warningMessage && (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-700 text-xs font-extrabold flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span>{warningMessage}</span>
              </div>
            )}

            {/* Selector registered customer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                Select Credit Customer *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-3 text-xs sm:text-sm font-extrabold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[50px] appearance-none cursor-pointer"
              >
                <option value="">-- Choose Whitelisted Client --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Dues: ₹{Math.round(c.outstandingBalance).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Input Recovery Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider flex justify-between">
                <span>Recovered Amount (INR) *</span>
                {amountInput && calculatedAmount > 0 && (
                  <span className="text-emerald-700 font-mono font-bold">Evaluated: ₹{calculatedAmount.toLocaleString('en-IN')}</span>
                )}
              </label>
              
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 5000 or expressions like 2500+2500"
                    className="w-full px-4 py-3.5 text-lg font-mono font-bold border-2 border-[#D9D9D6] focus:border-[#D35400] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large pr-10"
                  />
                  <Calculator className="w-5 h-5 text-[#666666] absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const baseAmount = evaluateMathExpression(amountInput) || 0;
                    setNumpadValue(baseAmount ? String(baseAmount) : '');
                    setShowNumpad(true);
                  }}
                  className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 min-h-[54px] glove-safe-target-large cursor-pointer shrink-0"
                >
                  <Calculator className="w-4.5 h-4.5 text-[#D35400]" /> Tap Pad
                </button>
              </div>

              {/* Calculator Presets Grid (Glove-Safe & Premium) */}
              {selectedCustomer && selectedCustomer.outstandingBalance > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 w-full">
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(selectedCustomer.outstandingBalance))}
                    className="col-span-2 sm:col-span-1 px-4 py-3 border-2 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-950 font-sans font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center min-h-[54px] glove-safe-target-large"
                  >
                    Clear All (₹{Math.round(selectedCustomer.outstandingBalance).toLocaleString('en-IN')})
                  </button>
                  {[1000, 5000, 10000, 25000].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => handleAddPreset(preset)}
                      className="px-4 py-3 border border-[#D9D9D6] hover:bg-[#F3F3F1] font-mono font-black text-xs rounded-xl transition-all flex items-center justify-center min-h-[54px] glove-safe-target-large text-[#1A1A1A] bg-[#F9F9F8]"
                    >
                      +₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                Recovery Payment Mode *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'CASH', label: 'Cash till', icon: DollarSign },
                  { id: 'UPI', label: 'UPI / QR Scan', icon: Smartphone },
                  { id: 'CARD', label: 'Credit Card', icon: CreditCard },
                  { id: 'SPLIT', label: 'Split Pay', icon: RefreshCw }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`py-3.5 rounded-2xl border-2 text-center font-bold transition-all flex items-center justify-center gap-1.5 text-xs min-h-[54px] glove-safe-target-large cursor-pointer ${
                        isSelected 
                          ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400] font-black shadow-xs' 
                          : 'border-[#D9D9D6] bg-white text-[#666666] hover:bg-[#F3F3F1] focus:border-[#1A1A1A]'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" /> {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Recovery Inputs */}
            {paymentMode === 'SPLIT' && (
              <div className="p-5 rounded-2xl bg-amber-500/5 border-2 border-amber-500/15 flex flex-col gap-4">
                <span className="text-xs text-amber-900 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-700" /> Split Recovery Shares Allocation
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cash Share */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-[#666666] uppercase font-bold">Cash Portion</label>
                      {calculatedAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentOther = evaluateMathExpression(splitUpi) + evaluateMathExpression(splitCard);
                            setSplitCash(String(Math.max(0, calculatedAmount - currentOther)));
                          }}
                          className="text-[10px] font-bold text-[#D35400] hover:underline px-1 py-0.5"
                        >
                          Fill Remaining
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="₹ Cash"
                      className="w-full px-4 py-3 text-sm font-mono font-bold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large"
                    />
                  </div>

                  {/* UPI Share */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-[#666666] uppercase font-bold">UPI Portion</label>
                      {calculatedAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentOther = evaluateMathExpression(splitCash) + evaluateMathExpression(splitCard);
                            setSplitUpi(String(Math.max(0, calculatedAmount - currentOther)));
                          }}
                          className="text-[10px] font-bold text-[#D35400] hover:underline px-1 py-0.5"
                        >
                          Fill Remaining
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                      placeholder="₹ UPI"
                      className="w-full px-4 py-3 text-sm font-mono font-bold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large"
                    />
                  </div>

                  {/* Card Share */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-[#666666] uppercase font-bold">Card Portion</label>
                      {calculatedAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentOther = evaluateMathExpression(splitCash) + evaluateMathExpression(splitUpi);
                            setSplitCard(String(Math.max(0, calculatedAmount - currentOther)));
                          }}
                          className="text-[10px] font-bold text-[#D35400] hover:underline px-1 py-0.5"
                        >
                          Fill Remaining
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      placeholder="₹ Card"
                      className="w-full px-4 py-3 text-sm font-mono font-bold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large"
                    />
                  </div>
                </div>

                {/* Validation Banner */}
                {(() => {
                  const cashVal = evaluateMathExpression(splitCash);
                  const upiVal = evaluateMathExpression(splitUpi);
                  const cardVal = evaluateMathExpression(splitCard);
                  const totalAllocated = cashVal + upiVal + cardVal;
                  const diff = calculatedAmount - totalAllocated;
                  const isMatch = Math.abs(diff) < 0.01;
                  
                  return (
                    <div className={`p-4 rounded-xl border-2 flex items-center justify-between text-xs font-bold ${
                      isMatch 
                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-800' 
                        : 'bg-amber-500/5 border-amber-500/15 text-amber-800'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isMatch ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                        )}
                        <span>
                          {isMatch 
                            ? `Balanced! Total ₹${totalAllocated.toLocaleString('en-IN')} allocated correctly.` 
                            : `Allocation Mismatch: Allocated ₹${totalAllocated.toLocaleString('en-IN')} of ₹${calculatedAmount.toLocaleString('en-IN')}`
                          }
                        </span>
                      </div>
                      {!isMatch && (
                        <span className="font-mono text-sm">
                          {diff > 0 
                            ? `Short: ₹${diff.toLocaleString('en-IN')}` 
                            : `Over: ₹${Math.abs(diff).toLocaleString('en-IN')}`
                          }
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}


            {/* Slip Receipt details & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                  Slip / Receipt Number
                </label>
                <input
                  type="text"
                  value={slipNumber}
                  onChange={(e) => setSlipNumber(e.target.value)}
                  placeholder="e.g. SLIP-9981"
                  className="w-full px-4 py-3 text-xs sm:text-sm font-bold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                  Operator Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment receipt note..."
                  className="w-full px-4 py-3 text-xs sm:text-sm font-bold border-2 border-[#D9D9D6] focus:border-[#1A1A1A] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[54px] glove-safe-target-large"
                />
              </div>
            </div>

            {/* Post Recovery Button */}
            <button
              type="submit"
              className="w-full py-4 mt-2 bg-[#D35400] hover:bg-[#B34700] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 min-h-[54px] glove-safe-target-large cursor-pointer"
            >
              <Check className="w-5 h-5 shrink-0" /> Replay Recovery & Post Ledger Dues
            </button>

          </form>
        </div>

      </div>

      {/* OVERLAY GLOVE-PROOF NUMPAD */}
      {showNumpad && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-[#EBEBEA] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#F9F9F8] p-4 flex items-center justify-between border-b border-[#EBEBEA]">
              <span className="text-[10px] text-[#1A1A1A] font-bold uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-[#D35400]" />
                Glove-Safe Dues Keypad
              </span>
              <button 
                type="button" 
                onClick={() => setShowNumpad(false)}
                className="text-[#666666] hover:text-[#1A1A1A] p-2 cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>

            <div className="bg-[#F9F9F8] p-6 text-right font-mono text-3xl font-black text-[#1A1A1A] border-b border-[#EBEBEA] min-h-[78px]">
              ₹ {numpadValue || '0'}
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-3 bg-white">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleNumpadPress(key)}
                  className="bg-[#F9F9F8] hover:bg-[#F3F3F1] active:bg-[#D35400] active:text-white text-[#1A1A1A] font-mono font-black text-2xl rounded-2xl py-5 min-h-[64px] glove-safe-target-large cursor-pointer border border-[#EBEBEA] transition-all active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-3 bg-white border-t border-[#EBEBEA]">
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className="bg-[#F3F3F1] hover:bg-[#EBEBEA] text-[#1A1A1A] font-bold py-4 rounded-xl text-xs uppercase cursor-pointer min-h-[54px] glove-safe-target-large transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleNumpadConfirm}
                className="bg-[#D35400] hover:bg-[#A04000] text-white font-bold py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer min-h-[54px] glove-safe-target-large transition-all active:scale-95 shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
