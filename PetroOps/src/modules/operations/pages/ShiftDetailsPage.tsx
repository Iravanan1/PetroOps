import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { OperationalWorkflowService, ManualEntry } from '../../shared/services/OperationalWorkflowService';
import { PlusCircle, ClipboardList, ArrowLeft, ArrowRight, Play } from 'lucide-react';

export default function ShiftDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shift, setShift] = useState<ShiftRecord | null>(null);

  // Form States
  const [txType, setTxType] = useState<'EXPENSE' | 'CREDIT_SALE' | 'CREDIT_RECOVERY' | 'UPI_SETTLEMENT' | 'NOZZLE_TESTING'>('EXPENSE');
  const [txAmount, setTxAmount] = useState(0);
  const [txDesc, setTxDesc] = useState("");

  const [timelineEvents, setTimelineEvents] = useState<Array<{ time: string; msg: string; amt?: number }>>([]);

  // Load from draft recovery
  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const parsed: ShiftRecord[] = JSON.parse(draft);
        const match = parsed.find(s => s.id === id);
        if (match) {
          setShift(match);
          setTimelineEvents([
            { time: "06:00 AM", msg: `Shift float initialized: ${match.shiftLabel}`, amt: match.openingCash }
          ]);
        }
      } catch (e) {
        console.warn("Failed to restore details draft", e);
      }
    }
  }, [id]);

  const handleAddTx = () => {
    if (!shift || txAmount <= 0) return;

    const entry: ManualEntry = {
      type: txType,
      amount: txAmount,
      description: txDesc,
      operatorId: "Operator-039"
    };

    const { updatedShift } = OperationalWorkflowService.postOperationalEntry(shift, entry);
    setShift(updatedShift);

    // Save back to draft list
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const list: ShiftRecord[] = JSON.parse(draft);
        const updatedList = list.map(s => s.id === id ? updatedShift : s);
        localStorage.setItem("pumpai_active_shift_draft", JSON.stringify(updatedList));
      } catch {}
    }

    setTimelineEvents([
      { 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        msg: `Transaction logged: [${txType}] ${txDesc}`, 
        amt: txAmount 
      },
      ...timelineEvents
    ]);

    setTxAmount(0);
    setTxDesc("");
  };

  if (!shift) {
    return <div className="p-8 text-center text-slate-500">Retrieving active operational register details...</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black flex justify-between items-center">
        <button onClick={() => navigate('/operations')} className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <button 
          onClick={() => navigate(`/operations/shifts/${shift.id}/reconcile`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1"
        >
          Go to Cash Till Count <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/60 border border-slate-850 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-slate-900 pb-4">
          <div>
            <h4 className="text-sm font-black text-white">{shift.shiftLabel}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Shift ID: <strong>{shift.id}</strong> | Status: <strong>{shift.status}</strong></p>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl">
            <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Float Cash</p>
            <p className="text-xs font-bold text-white mt-0.5">₹{shift.openingCash.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl">
            <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Expenses Paid</p>
            <p className="text-xs font-bold text-rose-400 mt-0.5">₹{shift.expenses.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl">
            <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Credit Extended</p>
            <p className="text-xs font-bold text-amber-400 mt-0.5">₹{shift.creditSales.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl">
            <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Credit Recovered</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">₹{shift.creditRecovery.toLocaleString()}</p>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col gap-4">
          <h5 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" /> Log Operational Transaction
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-400 uppercase font-bold">Type</label>
              <select
                value={txType}
                onChange={(e: any) => setTxType(e.target.value)}
                className="bg-[#060a13] border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="EXPENSE">Expense Payout</option>
                <option value="CREDIT_SALE">Credit Extended (Udhari)</option>
                <option value="CREDIT_RECOVERY">Udhari Collection</option>
                <option value="UPI_SETTLEMENT">UPI QR Settlement</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-400 uppercase font-bold">Amount</label>
              <input
                type="number"
                value={txAmount}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                className="bg-[#060a13] border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-400 uppercase font-bold">Description</label>
              <input
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="bg-[#060a13] border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleAddTx}
            className="w-full py-2 bg-slate-950 border border-slate-850 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            Append Event-Sourced Transaction
          </button>
        </div>

        {/* Timeline */}
        <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-2xl flex flex-col gap-4">
          <h5 className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Chronological Event Timeline</h5>
          <div className="relative pl-4 border-l border-slate-850 flex flex-col gap-4">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative flex flex-col gap-0.5">
                <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border border-[#0a0f1d]" />
                <span className="text-[8px] text-slate-500 font-mono">{evt.time}</span>
                <span className="text-[10px] text-slate-300 font-semibold">{evt.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
