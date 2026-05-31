import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationalWorkflowService } from '../../shared/services/OperationalWorkflowService';
import { ShiftRecord } from '../../../types';
import { CreditCustomer, CreditTransaction } from '../../../types/CreditCustomer';
import { 
  DollarSign, 
  UserCheck, 
  Landmark, 
  Smartphone, 
  Activity, 
  ArrowLeft, 
  Calculator, 
  Check, 
  Sun, 
  Moon, 
  Sparkles, 
  AlertCircle,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

const TRANSACTION_DRAFTS_KEY = 'pumpai_tx_form_drafts';

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

interface ConsoleProps {
  initialTab?: 'expenses' | 'credit-sales' | 'recoveries' | 'testing' | 'upi';
}

export function UnifiedTransactionConsole({ initialTab = 'expenses' }: ConsoleProps) {
  const navigate = useNavigate();

  // Outdoor Sunlight Toggle State
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_sunlight_mode') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'expenses' | 'credit-sales' | 'recoveries' | 'testing' | 'upi'>(initialTab);
  
  // Active shift state
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [nozzleCode, setNozzleCode] = useState<string>('Nozzle - 01');
  const [postedSuccess, setPostedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // --- Upgrade states for registered credit customers ledger ---
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [customVehicle, setCustomVehicle] = useState<string>('');
  
  // Split payment details
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitUpiInput, setSplitUpiInput] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('pumpai_sunlight_mode', String(sunlightMode));
  }, [sunlightMode]);

  // Load active shift and credit customers
  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const list: ShiftRecord[] = JSON.parse(draft);
        const active = list.find(s => s.status === 'NEEDS_REVIEW');
        if (active) {
          setActiveShift(active);
        }
      } catch {}
    }

    const savedCustomers = localStorage.getItem('pumpai_credit_customers');
    if (savedCustomers) {
      try {
        setCreditCustomers(JSON.parse(savedCustomers));
      } catch {}
    }
  }, [postedSuccess]);

  // Selected customer details
  const selectedCustDetails = useMemo(() => {
    return creditCustomers.find(c => c.id === selectedCustomerId) || null;
  }, [creditCustomers, selectedCustomerId]);

  // Autosave / Recover drafts to avoid data loss
  useEffect(() => {
    const saved = localStorage.getItem(TRANSACTION_DRAFTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeTab === activeTab) {
          setAmountInput(parsed.amountInput || '');
          setDescriptionInput(parsed.descriptionInput || '');
          setCustomerName(parsed.customerName || '');
          setNozzleCode(parsed.nozzleCode || 'Nozzle - 01');
          setSelectedCustomerId(parsed.selectedCustomerId || '');
          setVehicleNumber(parsed.vehicleNumber || '');
        }
      } catch {}
    }
  }, [activeTab]);

  // Save drafts on input changes
  const saveDraft = (amount: string, desc: string, cust: string, noz: string, custId = '', veh = '') => {
    const draftData = {
      activeTab,
      amountInput: amount,
      descriptionInput: desc,
      customerName: cust,
      nozzleCode: noz,
      selectedCustomerId: custId,
      vehicleNumber: veh
    };
    localStorage.setItem(TRANSACTION_DRAFTS_KEY, JSON.stringify(draftData));
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') { setActiveTab('expenses'); e.preventDefault(); }
        if (e.key === '2') { setActiveTab('credit-sales'); e.preventDefault(); }
        if (e.key === '3') { setActiveTab('recoveries'); e.preventDefault(); }
        if (e.key === '4') { setActiveTab('testing'); e.preventDefault(); }
        if (e.key === '5') { setActiveTab('upi'); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live evaluated amount
  const calculatedAmount = useMemo(() => {
    return evaluateMathExpression(amountInput);
  }, [amountInput]);

  const parsedCashSplit = useMemo(() => {
    return evaluateMathExpression(splitCashInput);
  }, [splitCashInput]);

  const parsedUpiSplit = useMemo(() => {
    return evaluateMathExpression(splitUpiInput);
  }, [splitUpiInput]);

  // Total credit portion of the transaction
  const netCreditSalesAmount = useMemo(() => {
    if (activeTab !== 'credit-sales') return calculatedAmount;
    if (!isSplitPayment) return calculatedAmount;
    return Math.max(0, calculatedAmount - parsedCashSplit - parsedUpiSplit);
  }, [activeTab, calculatedAmount, isSplitPayment, parsedCashSplit, parsedUpiSplit]);

  // Quick preset adding
  const handleAddPreset = (value: number) => {
    const current = evaluateMathExpression(amountInput);
    const nextValue = current + value;
    setAmountInput(String(nextValue));
    saveDraft(String(nextValue), descriptionInput, customerName, nozzleCode, selectedCustomerId, vehicleNumber);
  };

  // Submission posting handler
  const handlePostTransaction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!activeShift) {
      setErrorMessage("No active shift found. Please start a shift first before posting transactions.");
      return;
    }

    if (calculatedAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than zero.");
      return;
    }

    let type: 'EXPENSE' | 'CREDIT_SALE' | 'CREDIT_RECOVERY' | 'UPI_SETTLEMENT' | 'NOZZLE_TESTING';
    let description = descriptionInput;
    let finalCustomerName = customerName;

    // Load transactions log for duplicate detection and replay safety
    const savedTxs = localStorage.getItem('pumpai_credit_transactions');
    let creditTxs: CreditTransaction[] = [];
    if (savedTxs) {
      try { creditTxs = JSON.parse(savedTxs); } catch {}
    }

    if (activeTab === 'expenses') {
      type = 'EXPENSE';
      if (!description) description = "Station office overhead payout";
    } else if (activeTab === 'credit-sales') {
      type = 'CREDIT_SALE';
      
      if (selectedCustomerId) {
        if (!selectedCustDetails) {
          setErrorMessage("Invalid registered customer selected.");
          return;
        }
        finalCustomerName = selectedCustDetails.name;
      }

      if (!finalCustomerName) {
        setErrorMessage("Customer name is required for credit sales.");
        return;
      }

      // Check split payment logic
      if (isSplitPayment) {
        const totalSplit = parsedCashSplit + parsedUpiSplit;
        if (totalSplit > calculatedAmount) {
          setErrorMessage("Recovered split amount cannot exceed the total fuel sale invoice.");
          return;
        }
      }

      const activeVeh = vehicleNumber === 'CUSTOM' ? customVehicle.trim().toUpperCase() : vehicleNumber;
      description = `Credit extended to client: ${finalCustomerName}${activeVeh ? ` (Vehicle: ${activeVeh})` : ''}`;

      // Duplicate Check: Same customer, same amount, in last 60 seconds
      const duplicate = creditTxs.find(t => {
        if (t.type !== 'FUEL_SALE') return false;
        if (selectedCustomerId) {
          if (t.customerId !== selectedCustomerId) return false;
        } else {
          if (t.customerName.toLowerCase() !== finalCustomerName.toLowerCase()) return false;
        }
        if (t.amount !== netCreditSalesAmount) return false;
        
        const diffMs = Date.now() - new Date(t.date).getTime();
        return diffMs >= 0 && diffMs < 60000;
      });

      if (duplicate) {
        setErrorMessage("DUPLICATE WARNING: A credit sale of the exact same amount was posted for this customer in the last 60 seconds. To prevent duplicate ledger entries, this request is blocked.");
        return;
      }

    } else if (activeTab === 'recoveries') {
      type = 'CREDIT_RECOVERY';
      
      if (selectedCustomerId) {
        if (!selectedCustDetails) {
          setErrorMessage("Invalid registered customer selected.");
          return;
        }
        finalCustomerName = selectedCustDetails.name;
      }

      if (!finalCustomerName) {
        setErrorMessage("Customer name is required for recoveries.");
        return;
      }
      description = `Udhari collection recovery from: ${finalCustomerName}`;

      // Duplicate Check
      const duplicate = creditTxs.find(t => {
        if (t.type !== 'PAYMENT_RECOVERY') return false;
        if (selectedCustomerId) {
          if (t.customerId !== selectedCustomerId) return false;
        } else {
          if (t.customerName.toLowerCase() !== finalCustomerName.toLowerCase()) return false;
        }
        if (t.amount !== calculatedAmount) return false;
        
        const diffMs = Date.now() - new Date(t.date).getTime();
        return diffMs >= 0 && diffMs < 60000;
      });

      if (duplicate) {
        setErrorMessage("DUPLICATE WARNING: A dues recovery collection of this exact amount was logged in the last 60 seconds. Entry blocked.");
        return;
      }

    } else if (activeTab === 'testing') {
      type = 'NOZZLE_TESTING';
      description = `Dispenser calibration testing: ${nozzleCode}`;
    } else {
      type = 'UPI_SETTLEMENT';
      description = "UPI QR collection transaction";
    }

    // --- EXECUTE DOUBLE-ENTRY POSTING SYSTEM ---

    // 1. Shift record logging
    const postAmount = activeTab === 'credit-sales' ? netCreditSalesAmount : calculatedAmount;
    
    const { updatedShift, ledgerTx } = OperationalWorkflowService.postOperationalEntry(activeShift, {
      type,
      amount: postAmount,
      description,
      operatorId: activeShift.operatorId || 'R Ramesh Attendant'
    });

    // In case of Split Payment fuel sales: Cash portion increments recovery dues; UPI portion increments UPI Sales!
    if (activeTab === 'credit-sales' && isSplitPayment) {
      if (parsedCashSplit > 0) {
        // Increment creditRecovery (adds Cash to expected cash drawer till)
        updatedShift.creditRecovery = (typeof updatedShift.creditRecovery === 'number' ? updatedShift.creditRecovery : 0) + parsedCashSplit;
        updatedShift.auditHistory?.push({
          editor: "Station Attendant",
          timestamp: new Date().toISOString(),
          previousValues: {
            note: `Split payment recovery: Collected Cash ₹${parsedCashSplit} on fuel invoice of ₹${calculatedAmount} from ${finalCustomerName}`
          }
        });
      }
      if (parsedUpiSplit > 0) {
        // Increment upiSales
        updatedShift.upiSales = (typeof updatedShift.upiSales === 'number' ? updatedShift.upiSales : 0) + parsedUpiSplit;
        updatedShift.auditHistory?.push({
          editor: "Station Attendant",
          timestamp: new Date().toISOString(),
          previousValues: {
            note: `Split payment recovery: Collected UPI ₹${parsedUpiSplit} on fuel invoice of ₹${calculatedAmount} from ${finalCustomerName}`
          }
        });
      }
    }

    // Save updated shift back to localStorage
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const list: ShiftRecord[] = JSON.parse(draft);
        const updatedList = list.map(s => s.id === activeShift.id ? updatedShift : s);
        localStorage.setItem("pumpai_active_shift_draft", JSON.stringify(updatedList));
      } catch {}
    }

    // 2. Commit customer ledger entry in pumpai_credit_transactions
    if (activeTab === 'credit-sales' || activeTab === 'recoveries') {
      const activeCustId = selectedCustomerId || `cust_unreg_${Date.now()}`;
      const activeVeh = vehicleNumber === 'CUSTOM' ? customVehicle.trim().toUpperCase() : vehicleNumber;
      
      const newLedgerTxs: CreditTransaction[] = [];

      if (activeTab === 'credit-sales') {
        // Log creditextended sale transaction
        newLedgerTxs.push({
          id: `tx_${Date.now()}`,
          customerId: activeCustId,
          customerName: finalCustomerName,
          type: 'FUEL_SALE',
          amount: calculatedAmount,
          date: new Date().toISOString(),
          vehicleNumber: activeVeh,
          fuelType: nozzleCode.includes("MS") ? "MS" : "HSD",
          litres: parseFloat((calculatedAmount / (nozzleCode.includes("MS") ? 104.5 : 92.3)).toFixed(2)),
          referenceId: activeShift.id,
          remarks: `Fuel filled from ${nozzleCode}`
        });

        // Log recoveries if split payment was done
        if (isSplitPayment) {
          if (parsedCashSplit > 0) {
            newLedgerTxs.push({
              id: `tx_split_c_${Date.now()}`,
              customerId: activeCustId,
              customerName: finalCustomerName,
              type: 'PAYMENT_RECOVERY',
              amount: parsedCashSplit,
              date: new Date().toISOString(),
              paymentMode: 'CASH',
              referenceId: activeShift.id,
              remarks: `Immediate Cash split recovery during sale`
            });
          }
          if (parsedUpiSplit > 0) {
            newLedgerTxs.push({
              id: `tx_split_u_${Date.now()}`,
              customerId: activeCustId,
              customerName: finalCustomerName,
              type: 'PAYMENT_RECOVERY',
              amount: parsedUpiSplit,
              date: new Date().toISOString(),
              paymentMode: 'UPI',
              referenceId: activeShift.id,
              remarks: `Immediate UPI split recovery during sale`
            });
          }
        }
      } else {
        // Direct recovery from Attendant Pad
        newLedgerTxs.push({
          id: `tx_${Date.now()}`,
          customerId: activeCustId,
          customerName: finalCustomerName,
          type: 'PAYMENT_RECOVERY',
          amount: calculatedAmount,
          date: new Date().toISOString(),
          paymentMode: 'CASH', // default attendant console recovery is cash in till
          referenceId: activeShift.id,
          remarks: description
        });
      }

      const freshTxsList = [...creditTxs, ...newLedgerTxs];
      localStorage.setItem('pumpai_credit_transactions', JSON.stringify(freshTxsList));

      // Recalculate customer dues and save
      const savedCustomers = localStorage.getItem('pumpai_credit_customers');
      if (savedCustomers) {
        try {
          const custs: CreditCustomer[] = JSON.parse(savedCustomers);
          const updatedCusts = custs.map(c => {
            if (c.id === activeCustId) {
              const outstanding = freshTxsList
                .filter(t => t.customerId === c.id)
                .reduce((sum, tx) => {
                  if (tx.type === 'FUEL_SALE') return sum + tx.amount;
                  if (tx.type === 'PAYMENT_RECOVERY') return sum - tx.amount;
                  if (tx.type === 'ADJUSTMENT') return sum + tx.amount;
                  return sum;
                }, 0);
              return { ...c, outstandingBalance: outstanding };
            }
            return c;
          });
          localStorage.setItem('pumpai_credit_customers', JSON.stringify(updatedCusts));
        } catch {}
      }
    }

    // Write to offline queue
    try {
      const queueKey = 'offline_edit_queue';
      const rawQueue = localStorage.getItem(queueKey);
      const queueList = rawQueue ? JSON.parse(rawQueue) : [];
      queueList.push({
        id: `qe_${Date.now()}`,
        type: 'operational_entry',
        payload: { shiftId: activeShift.id, ledgerTx },
        queuedAt: new Date().toISOString(),
        attempts: 0
      });
      localStorage.setItem(queueKey, JSON.stringify(queueList));
    } catch {}

    // Reset inputs & clear drafts
    setPostedSuccess(true);
    setAmountInput('');
    setDescriptionInput('');
    setCustomerName('');
    setSelectedCustomerId('');
    setVehicleNumber('');
    setCustomVehicle('');
    setIsSplitPayment(false);
    setSplitCashInput('');
    setSplitUpiInput('');
    localStorage.removeItem(TRANSACTION_DRAFTS_KEY);

    setTimeout(() => {
      setPostedSuccess(false);
    }, 2000);
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-200 select-none ${
      sunlightMode ? 'bg-[#ffffff] text-[#000000]' : 'bg-[#F9F9F8] text-[#1A1A1A]'
    }`}>
      {/* Navigation Header */}
      <nav className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-200 ${
        sunlightMode ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-white border-[#EBEBEA]'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/operations')} 
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border min-h-[44px] ${
              sunlightMode 
                ? 'bg-white border-[#cbd5e1] text-slate-700 hover:bg-slate-100' 
                : 'bg-white border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#F3F3F1]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className={`text-base font-black tracking-tight ${sunlightMode ? 'text-slate-900' : 'text-[#1A1A1A]'}`}>
              ATTENDANT TRANSACTION PAD
            </h1>
            {activeShift ? (
              <p className="text-[10px] text-[#666666] font-bold uppercase">
                Active Shift: {activeShift.shiftDate} ({activeShift.shiftLabel}) • Till Cash: ₹{activeShift.openingCash}
              </p>
            ) : (
              <p className="text-[10px] text-rose-500 font-black uppercase">
                NO ACTIVE SHIFT RUNNING
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSunlightMode(!sunlightMode)}
          className={`flex items-center gap-2 font-black text-xs px-4 py-3.5 rounded-xl uppercase tracking-wider border cursor-pointer min-h-[48px] ${
            sunlightMode 
              ? 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200' 
              : 'bg-[#F3F3F1] border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
          }`}
        >
          {sunlightMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          {sunlightMode ? 'Shade Mode' : 'Sunlight Mode'}
        </button>
      </nav>

      {/* Main Container */}
      <div className="p-6 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side Tabs - Large glove targets */}
        <div className="md:col-span-1 flex flex-col gap-2.5">
          {[
            { id: 'expenses', label: "Expense Payout", icon: DollarSign, color: "text-rose-600" },
            { id: 'credit-sales', label: "Udhari Credit Sales", icon: UserCheck, color: "text-[#D35400]" },
            { id: 'recoveries', label: "Udhari Recovery", icon: Landmark, color: "text-emerald-700" },
            { id: 'testing', label: "Nozzle Calibration", icon: Activity, color: "text-blue-600" },
            { id: 'upi', label: "UPI Collections", icon: Smartphone, color: "text-indigo-600" }
          ].map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMessage('');
                }}
                className={`w-full p-4 rounded-2xl border text-left font-black transition-all flex items-center justify-between min-h-[56px] cursor-pointer ${
                  isSelected
                    ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400] shadow-sm font-black'
                    : 'border-[#D9D9D6] bg-white text-[#666666] hover:bg-[#F3F3F1]'
                }`}
              >
                <span className="flex items-center gap-2.5 text-xs">
                  <Icon className={`w-5 h-5 ${tab.color}`} /> {tab.label}
                </span>
                <span className="text-[9px] font-mono opacity-50 font-bold">ALT+{idx+1}</span>
              </button>
            );
          })}

          {/* Quick active running totals helper card */}
          {activeShift && (
            <div className="p-4 rounded-2xl border border-[#EBEBEA] bg-white text-[10px] space-y-2 font-mono">
              <div className="flex justify-between items-center text-[#666666] font-bold">
                <span>Shift Credit Extended:</span>
                <span className="text-[#1A1A1A] font-extrabold">₹{activeShift.creditSales?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[#666666] font-bold">
                <span>Shift Payment Recoveries:</span>
                <span className="text-[#1A1A1A] font-extrabold">₹{(typeof activeShift.creditRecovery === 'number' ? activeShift.creditRecovery : 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[#666666] font-bold">
                <span>Shift Expenses:</span>
                <span className="text-[#1A1A1A] font-extrabold">₹{(typeof activeShift.expenses === 'number' ? activeShift.expenses : 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Form Panel */}
        <div className="md:col-span-2">
          
          <form onSubmit={handlePostTransaction} className="p-6 rounded-3xl border border-[#EBEBEA] bg-white shadow-sm flex flex-col gap-5">

            {/* Banners */}
            {postedSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-black uppercase flex items-center gap-2 animate-pulse">
                <Check className="w-5 h-5 text-emerald-600 animate-bounce" /> Transaction committed successfully to ledger!
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[#C62828] text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {selectedCustDetails && selectedCustDetails.outstandingBalance > selectedCustDetails.creditLimit && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[#C62828] text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <strong>LIMIT WARNING:</strong> This client has exceeded their credit limit! Current dues: ₹{selectedCustDetails.outstandingBalance.toLocaleString('en-IN')} (Limit: ₹{selectedCustDetails.creditLimit.toLocaleString('en-IN')}).
                </div>
              </div>
            )}

            <div className="border-b border-[#EBEBEA] pb-3 flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#1A1A1A]">
                Log {activeTab.replace("-", " ")}
              </h3>
              <span className="text-[10px] text-[#D35400] font-bold uppercase tracking-wider">
                Touch Friendly Layout
              </span>
            </div>

            {/* INPUT 1: Amount with quick-add presets */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider flex justify-between">
                <span>Total Invoice Value (INR) *</span>
                {amountInput && calculatedAmount > 0 && (
                  <span className="text-emerald-700 font-mono font-bold">Evaluated: ₹ {calculatedAmount.toLocaleString('en-IN')}</span>
                )}
              </label>

              <input
                type="text"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  saveDraft(e.target.value, descriptionInput, customerName, nozzleCode, selectedCustomerId, vehicleNumber);
                }}
                placeholder="Enter sale value or sum (e.g. 1500+500)"
                className="w-full px-4 py-3 text-lg font-mono font-bold border border-[#D9D9D6] rounded-2xl focus:outline-none focus:border-[#D35400] bg-[#F9F9F8] text-[#1A1A1A] min-h-[54px]"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[100, 500, 1000, 2000, 5000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => handleAddPreset(preset)}
                    className="px-3 py-2 border border-[#D9D9D6] font-mono font-black text-[10px] rounded-lg transition-all min-h-[36px] bg-white hover:bg-[#F3F3F1] cursor-pointer"
                  >
                    +₹{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* UPGRADE Tab specific inputs: Credit Customer selector */}
            {(activeTab === 'credit-sales' || activeTab === 'recoveries') && (
              <div className="flex flex-col gap-4">
                
                {/* Searchable registered customer dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                    Select Whitelisted Client Profile
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      setVehicleNumber('');
                      saveDraft(amountInput, descriptionInput, customerName, nozzleCode, e.target.value, '');
                    }}
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                  >
                    <option value="">-- Choose Registered Client Profile --</option>
                    {creditCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Dues: ₹{c.outstandingBalance.toLocaleString('en-IN')})
                      </option>
                    ))}
                    <option value="CUSTOM">-- Manual Custom Entry --</option>
                  </select>
                </div>

                {/* If Custom Entry selected, show normal text input */}
                {(selectedCustomerId === 'CUSTOM' || !selectedCustomerId) && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                      Manual Client Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        saveDraft(amountInput, descriptionInput, e.target.value, nozzleCode, selectedCustomerId, vehicleNumber);
                      }}
                      placeholder="e.g. Royal Travels Contractor"
                      className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                    />
                  </div>
                )}

                {/* Vehicles selector for registered client */}
                {selectedCustDetails && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                      Select whitelisted Vehicle License Plate
                    </label>
                    <select
                      value={vehicleNumber}
                      onChange={(e) => {
                        setVehicleNumber(e.target.value);
                        saveDraft(amountInput, descriptionInput, customerName, nozzleCode, selectedCustomerId, e.target.value);
                      }}
                      className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                    >
                      <option value="">-- Select whitelisted vehicle --</option>
                      {selectedCustDetails.vehicles.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="CUSTOM">-- Add Custom License Plate --</option>
                    </select>
                  </div>
                )}

                {/* Custom Vehicle Input plate */}
                {(vehicleNumber === 'CUSTOM' || !selectedCustomerId) && activeTab === 'credit-sales' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                      Vehicle License Plate Number
                    </label>
                    <input
                      type="text"
                      value={customVehicle}
                      onChange={(e) => setCustomVehicle(e.target.value)}
                      placeholder="e.g. MH46AR1122"
                      className="w-full px-4 py-3 text-xs font-mono font-bold uppercase border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                    />
                  </div>
                )}

                {/* Split Payment Options during Credit Sales */}
                {activeTab === 'credit-sales' && (
                  <div className="p-4 border border-[#EBEBEA] rounded-2xl bg-[#F9F9F8]">
                    <label className="flex items-center gap-2 font-bold text-xs text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSplitPayment}
                        onChange={(e) => setIsSplitPayment(e.target.checked)}
                        className="rounded text-[#D35400] focus:ring-[#D35400] w-4 h-4"
                      />
                      <span>Enable Split Payment Modes (Cash/UPI partial recovery)</span>
                    </label>

                    {isSplitPayment && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#EBEBEA] animate-fade-in">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                            Cash Collected (INR)
                          </label>
                          <input
                            type="text"
                            value={splitCashInput}
                            onChange={(e) => setSplitCashInput(e.target.value)}
                            placeholder="e.g. 500"
                            className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A]"
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                            UPI Collected (INR)
                          </label>
                          <input
                            type="text"
                            value={splitUpiInput}
                            onChange={(e) => setSplitUpiInput(e.target.value)}
                            placeholder="e.g. 1000"
                            className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A]"
                          />
                        </div>

                        <div className="col-span-2 text-[10px] text-emerald-700 font-extrabold flex justify-between pt-1 font-mono">
                          <span>Net Extended Credit:</span>
                          <span>₹ {netCreditSalesAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {activeTab === 'testing' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                  Nozzle Dispenser Code
                </label>
                <select
                  value={nozzleCode}
                  onChange={(e) => {
                    setNozzleCode(e.target.value);
                    saveDraft(amountInput, descriptionInput, customerName, e.target.value, selectedCustomerId, vehicleNumber);
                  }}
                  className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                >
                  <option value="Nozzle - 01">Nozzle - 01 (MS Petrol)</option>
                  <option value="Nozzle - 02">Nozzle - 02 (MS Petrol)</option>
                  <option value="Nozzle - 03">Nozzle - 03 (HSD Diesel)</option>
                  <option value="Nozzle - 04">Nozzle - 04 (HSD Diesel)</option>
                </select>
              </div>
            )}

            {/* Common Description Input */}
            {activeTab !== 'upi' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#666666] uppercase font-black tracking-wider">
                  Remarks / Description
                </label>
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => {
                    setDescriptionInput(e.target.value);
                    saveDraft(amountInput, e.target.value, customerName, nozzleCode, selectedCustomerId, vehicleNumber);
                  }}
                  placeholder="Additional transaction details..."
                  className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none bg-white text-[#1A1A1A] min-h-[48px]"
                />
              </div>
            )}

            {activeTab === 'upi' && (
              <div className="p-4 rounded-xl border border-[#EBEBEA] text-[10px] leading-relaxed flex items-start gap-2 bg-[#F9F9F8] text-[#666666]">
                <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>UPI Paytm / SBI Terminal collections:</strong> This entry increments running shift collections. UPI transactions will reconcile directly with expected bank settlements during Step 2 of reconciliation.
                </span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full py-4 mt-3 bg-[#D35400] hover:bg-[#B34700] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[54px]"
            >
              <Check className="w-5 h-5" /> Commit Entry to shift Ledger
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ROUTED EXPORTS
export function TransactionsIndexPage() {
  return <UnifiedTransactionConsole initialTab="expenses" />;
}

export function ExpensesPage() {
  return <UnifiedTransactionConsole initialTab="expenses" />;
}

export function CreditSalesPage() {
  return <UnifiedTransactionConsole initialTab="credit-sales" />;
}

export function RecoveriesPage() {
  return <UnifiedTransactionConsole initialTab="recoveries" />;
}

export function UpiCollectionsPage() {
  return <UnifiedTransactionConsole initialTab="upi" />;
}

export function NozzleTestingPage() {
  return <UnifiedTransactionConsole initialTab="testing" />;
}
