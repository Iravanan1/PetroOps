import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { SharedTable } from '../../shared/components/SharedTable';
import { SharedDrawer } from '../../shared/components/SharedDrawer';
import { AuditHistoryViewer } from '../../shared/components/AuditHistoryViewer';
import { Landmark, ChevronRight, TrendingUp } from 'lucide-react';

export default function BankingPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  const columns = [
    { header: "Shift Date", render: (s: ShiftRecord) => <span className="font-semibold">{s.shiftDate}</span> },
    { header: "Card settlements", render: (s: ShiftRecord) => <span className="font-bold text-slate-300">₹{s.cardSales.toLocaleString()}</span> },
    { header: "UPI settlements", render: (s: ShiftRecord) => <span className="font-bold text-blue-400">₹{s.upiSales.toLocaleString()}</span> },
    { header: "Total Bank Settlements", render: (s: ShiftRecord) => <span className="text-emerald-400 font-extrabold">₹{(s.cardSales + s.upiSales).toLocaleString()}</span> },
    { header: "Payout status", render: (s: ShiftRecord) => (
        <span className="px-2.5 py-0.5 text-[8px] font-black rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase">Matched</span>
      )
    },
    { header: "Actions", render: (s: ShiftRecord) => (
        <button 
          onClick={() => setSelectedShift(s)}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 rounded-xl font-bold flex items-center gap-1"
        >
          Verification Logs <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const searchFilter = (s: ShiftRecord, query: string) => {
    return s.shiftDate.includes(query) || s.shiftLabel.toLowerCase().includes(query.toLowerCase());
  };

  const totalCardSales = shifts.reduce((sum, s) => sum + s.cardSales, 0);
  const totalUpiSales = shifts.reduce((sum, s) => sum + s.upiSales, 0);
  const totalSettlements = totalCardSales + totalUpiSales;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
        Home &gt; Banking &amp; Digital Settlements
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Landmark className="w-8 h-8 text-blue-400" /> Banking &amp; Digital Payments
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit daily bank settlements, UPI merchant match sheets, card machine payouts, and disputes.</p>
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
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Card Sales</p>
          <p className="text-2xl font-black text-slate-200">₹{totalCardSales.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-400" /> Reconciled POS settlements</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total UPI Payments</p>
          <p className="text-2xl font-black text-blue-400">₹{totalUpiSales.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Paytm & SBI QR collections</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Bank Settlements</p>
          <p className="text-2xl font-black text-emerald-400">₹{totalSettlements.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><Landmark className="w-3 h-3 text-emerald-400" /> Net matched digital payouts</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/40 border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Querying Firestore records...</div>
        ) : (
          <SharedTable
            columns={columns}
            data={shifts}
            searchPlaceholder="Search settlements by date..."
            searchFilter={searchFilter}
            exportFileName="banking_settlements"
          />
        )}
      </div>

      <SharedDrawer
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="Settlement Audit History"
      >
        {selectedShift && (
          <div className="flex flex-col gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Settlement Info</h5>
              <p>Shift reference: <strong>{selectedShift.shiftLabel}</strong></p>
              <p>UPI Merchants verified: <strong>9530140836@ptsbi, Paytm QR</strong></p>
            </div>
            
            <AuditHistoryViewer history={selectedShift.auditHistory} />
          </div>
        )}
      </SharedDrawer>
    </div>
  );
}
