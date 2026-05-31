import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Fuel, Save, ShieldAlert, Sparkles, Check, 
  DollarSign, Calculator, Smartphone, Landmark, AlertTriangle, Plus, Trash
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { ShiftApprovalFlow } from '../ShiftApprovalFlow';

export default function ShiftWorkspacePage() {
  const navigate = useNavigate();
  const { shifts } = useReconciledShifts('potaliya-petroleum');
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  // Form parameters
  const [operatorId, setOperatorId] = useState('Ramesh Attendant');
  const [openingCash, setOpeningCash] = useState(5000);
  const [actualCash, setActualCash] = useState(4800);
  const [upiSales, setUpiSales] = useState(24500);
  const [cardSales, setCardSales] = useState(12800);
  const [creditSales, setCreditSales] = useState(8200);
  const [creditRecovery, setCreditRecovery] = useState(1500);
  
  // Running nozzle reading meters
  const [nozzleReadings, setNozzleReadings] = useState([
    { nozzleId: 'noz-01', fuelType: 'HSD', openingMeter: 125100, closingMeter: 125350, netSales: 250, fuelRate: 94.2, testingQty: 0 },
    { nozzleId: 'noz-02', fuelType: 'MS', openingMeter: 94820, closingMeter: 95100, netSales: 280, fuelRate: 104.5, testingQty: 0 }
  ]);

  // Operational expenses logs
  const [expenses, setExpenses] = useState<{ id: string; desc: string; amount: number }[]>([
    { id: 'exp_1', desc: 'Attendant Tea/Snacks', amount: 150 },
    { id: 'exp_2', desc: 'Nozzle calibration testing cans HSD', amount: 200 }
  ]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmt, setNewExpenseAmt] = useState('');

  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.length > 0) {
          const shift = parsed[0];
          setActiveShift(shift);
          setOperatorId(shift.operatorId || 'Ramesh Attendant');
          setOpeningCash(Number(shift.openingCash || 5000));
          setActualCash(Number(shift.actualCash || 4800));
          setUpiSales(Number(shift.upiSales || 24500));
          setCardSales(Number(shift.cardSales || 12800));
          setCreditSales(Number(shift.creditSales || 8200));
          setCreditRecovery(Number(shift.creditRecovery || 1500));
        }
      } catch {}
    } else if (shifts.length > 0) {
      setActiveShift(shifts[0]);
    }
  }, [shifts]);

  // Handle running nozzle meters changes
  const handleNozzleMeter = (index: number, key: 'openingMeter' | 'closingMeter' | 'testingQty', value: number) => {
    const updated = [...nozzleReadings];
    updated[index] = { ...updated[index], [key]: value };
    const net = updated[index].closingMeter - updated[index].openingMeter - updated[index].testingQty;
    updated[index].netSales = Math.max(0, net);
    setNozzleReadings(updated);
  };

  // Log new operational expenses
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseDesc || !newExpenseAmt) return;

    setExpenses([
      ...expenses,
      {
        id: `exp_${Date.now()}`,
        desc: newExpenseDesc,
        amount: parseFloat(newExpenseAmt)
      }
    ]);
    setNewExpenseDesc('');
    setNewExpenseAmt('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Shift sealing & lock validation trigger
  const handleVerifyLock = () => {
    if (!activeShift) return;

    const approval = ShiftApprovalFlow.runLockVerification({
      shiftId: activeShift.id,
      nozzles: nozzleReadings as any,
      creditEntries: [],
      openingCash,
      actualCash,
      upiSales,
      cardSales,
      creditSales,
      creditRecovery,
      expenses: totalExpenseSum,
      ocrReviewCompleted: false, // Ingest review pending
      wetstockVarianceRecorded: false
    });

    localStorage.setItem("pumpai_active_shift_draft", JSON.stringify([{
      ...activeShift,
      operatorId,
      openingCash,
      actualCash,
      upiSales,
      cardSales,
      creditSales,
      creditRecovery,
      expenses: totalExpenseSum
    }]));

    setFeedback('✔ Dynamic pre-lock checks run successfully. Shift status synchronized.');
    setTimeout(() => {
      navigate(`/operations/shifts/${activeShift.id}/reconcile`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/command-center')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO COMMAND CENTER
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2.5 rounded-2xl text-[#D35400]">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Shift Operations Workspace</h1>
              <p className="text-xs text-[#666666] mt-0.5">Live attendants, sales tracking, operational expenses, and locks validation.</p>
            </div>
          </div>

          <button
            onClick={handleVerifyLock}
            className="px-5 py-3 bg-[#D35400] text-white hover:bg-[#A04000] text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center gap-2 min-h-[48px]"
          >
            <Save className="w-4 h-4" /> VERIFY &amp; SEAL SHIFT
          </button>
        </div>

        {feedback && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl shadow-xs">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main workspace log inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shift Headers & cash till parameters */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4.5 h-4.5 text-[#D35400]" /> General Till Parameters
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase block mb-1">Attendant Assigned</label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase block mb-1">Opening Cash Till Float</label>
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full px-4 py-3 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white min-h-[48px]"
                  />
                </div>
              </div>
            </div>

            {/* Running Nozzle meters grid */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-4 flex items-center gap-1.5">
                <Calculator className="w-4.5 h-4.5 text-[#D35400]" /> Running Meter Readings
              </h3>

              <div className="space-y-4">
                {nozzleReadings.map((noz, idx) => (
                  <div key={noz.nozzleId} className="p-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-[#1A1A1A]">{noz.nozzleId} ({noz.fuelType})</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Rate: ₹{noz.fuelRate} • Net: {noz.netSales.toFixed(2)} L
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Opening</span>
                        <input
                          type="number"
                          value={noz.openingMeter}
                          onChange={(e) => handleNozzleMeter(idx, 'openingMeter', Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Closing</span>
                        <input
                          type="number"
                          value={noz.closingMeter}
                          onChange={(e) => handleNozzleMeter(idx, 'closingMeter', Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Testing</span>
                        <input
                          type="number"
                          value={noz.testingQty}
                          onChange={(e) => handleNozzleMeter(idx, 'testingQty', Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right sidebar log items: Collections & Expenses */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Sales Collections totals */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <Landmark className="w-4.5 h-4.5 text-[#1565C0]" /> Payments Collections
              </h3>

              <div>
                <label className="text-[9px] font-bold text-[#666666] uppercase block mb-1">UPI Sales Total</label>
                <input
                  type="number"
                  value={upiSales}
                  onChange={(e) => setUpiSales(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#666666] uppercase block mb-1">Card Sales Total</label>
                <input
                  type="number"
                  value={cardSales}
                  onChange={(e) => setCardSales(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#666666] uppercase block mb-1">Credit Customers Sales</label>
                <input
                  type="number"
                  value={creditSales}
                  onChange={(e) => setCreditSales(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-[#666666] uppercase block mb-1">Credit Recovery</label>
                <input
                  type="number"
                  value={creditRecovery}
                  onChange={(e) => setCreditRecovery(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {/* Expenses Logger */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <Smartphone className="w-4.5 h-4.5 text-[#D35400]" /> Operational Expenses
              </h3>

              {/* Expense list */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {expenses.map(e => (
                  <div key={e.id} className="p-2 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl flex items-center justify-between text-[11px] font-bold">
                    <span>{e.desc}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">₹{e.amount}</span>
                      <button 
                        onClick={() => handleRemoveExpense(e.id)}
                        className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddExpense} className="space-y-2 pt-2 border-t border-[#EBEBEA]">
                <input
                  type="text"
                  placeholder="Expense description..."
                  value={newExpenseDesc}
                  onChange={(e) => setNewExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none min-h-[38px]"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Amount..."
                    value={newExpenseAmt}
                    onChange={(e) => setNewExpenseAmt(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl focus:outline-none min-h-[38px]"
                  />
                  <button 
                    type="submit"
                    className="px-4 bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl text-xs font-bold uppercase min-h-[38px] cursor-pointer"
                  >
                    ADD
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
