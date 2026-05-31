import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { SharedTable } from '../../shared/components/SharedTable';
import { SharedDrawer } from '../../shared/components/SharedDrawer';
import { AuditHistoryViewer } from '../../shared/components/AuditHistoryViewer';
import { Receipt, ChevronRight, TrendingUp } from 'lucide-react';

export default function CashPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  const columns = [
    { header: "Shift Date", render: (s: ShiftRecord) => <span className="font-semibold">{s.shiftDate}</span> },
    { header: "Opening Cash", render: (s: ShiftRecord) => <span>₹{s.openingCash.toLocaleString()}</span> },
    { header: "Expenses Subtracted", render: (s: ShiftRecord) => <span className="text-rose-400 font-semibold">-₹{s.expenses.toLocaleString()}</span> },
    { header: "Credit Recovery Cash", render: (s: ShiftRecord) => <span className="text-emerald-400 font-semibold">+₹{s.creditRecovery.toLocaleString()}</span> },
    { header: "Expected Till", render: (s: ShiftRecord) => <span>₹{(s.openingCash + s.creditRecovery - s.expenses).toLocaleString()}</span> },
    { header: "Actual Cash Till", render: (s: ShiftRecord) => <span className="font-bold text-white">₹{s.actualCash.toLocaleString()}</span> },
    { header: "Till Mismatch", render: (s: ShiftRecord) => (
        <span className={`font-extrabold ${s.cashShortage < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {s.cashShortage < 0 ? `+₹${Math.abs(s.cashShortage)}` : `-₹${s.cashShortage}`}
        </span>
      )
    },
    { header: "Actions", render: (s: ShiftRecord) => (
        <button 
          onClick={() => setSelectedShift(s)}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 rounded-xl font-bold flex items-center gap-1"
        >
          Verify <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const searchFilter = (s: ShiftRecord, query: string) => {
    return s.shiftDate.includes(query) || s.shiftLabel.toLowerCase().includes(query.toLowerCase());
  };

  const totalActualCash = shifts.reduce((sum, s) => sum + s.actualCash, 0);
  const totalShortages = shifts.reduce((sum, s) => sum + s.cashShortage, 0);
  const totalExpenses = shifts.reduce((sum, s) => sum + s.expenses, 0);

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
        Home &gt; Cash Management
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Receipt className="w-8 h-8 text-blue-400" /> Cash Management &amp; Till Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit daily cash till reconciliations, denomination tracking records, and office expense register payouts.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setPipeline('potaliya-petroleum')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
              pipeline === 'potaliya-petroleum' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Local AI
          </button>
          <button
            onClick={() => setPipeline('potaliya-petroleum-google')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
              pipeline === 'potaliya-petroleum-google' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Cloud
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Physical Cash in Till</p>
          <p className="text-2xl font-black text-white">₹{totalActualCash.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Reconciled physical till cash</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Accrued Till Shortage</p>
          <p className="text-2xl font-black text-amber-500">₹{totalShortages.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1">Net shift-by-shift till discrepancies</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Registered Office Expenses</p>
          <p className="text-2xl font-black text-rose-500">₹{totalExpenses.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1">Subtracted operational cash payouts</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/40 border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Querying Firestore records...</div>
        ) : (
          <SharedTable
            columns={columns}
            data={shifts}
            searchPlaceholder="Search cash till audits..."
            searchFilter={searchFilter}
            exportFileName="cash_management"
          />
        )}
      </div>

      <SharedDrawer
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="Cash Till Reconciliation Audit Detail"
      >
        {selectedShift && (
          <div className="flex flex-col gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Till Denomination Estimates</h5>
              <p>₹2000 Note count: <strong>{Math.round((selectedShift.actualCash * 0.2) / 2000)} notes</strong></p>
              <p>₹500 Note count: <strong>{Math.round((selectedShift.actualCash * 0.5) / 500)} notes</strong></p>
              <p>₹200 Note count: <strong>{Math.round((selectedShift.actualCash * 0.2) / 200)} notes</strong></p>
              <p>₹100 Note count: <strong>{Math.round((selectedShift.actualCash * 0.1) / 100)} notes</strong></p>
            </div>
            
            <AuditHistoryViewer history={selectedShift.auditHistory} />
          </div>
        )}
      </SharedDrawer>
    </div>
  );
}
