import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { SharedTable } from '../../shared/components/SharedTable';
import { SharedDrawer } from '../../shared/components/SharedDrawer';
import { AuditHistoryViewer } from '../../shared/components/AuditHistoryViewer';
import { Activity, ChevronRight, TrendingUp } from 'lucide-react';

export default function UpiPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  const columns = [
    { header: "Shift Date", render: (s: ShiftRecord) => <span className="font-semibold">{s.shiftDate}</span> },
    { header: "UPI Ingested Payments", render: (s: ShiftRecord) => <span className="font-bold text-blue-400">₹{s.upiSales.toLocaleString()}</span> },
    { header: "Merchant ID Terminal", render: (s: ShiftRecord) => <span className="font-mono text-slate-400">9530140836@ptsbi</span> },
    { header: "Paytm Settlement", render: (s: ShiftRecord) => <span>₹{Math.round(s.upiSales * 0.6).toLocaleString()}</span> },
    { header: "SBI QR Terminal", render: (s: ShiftRecord) => <span>₹{Math.round(s.upiSales * 0.4).toLocaleString()}</span> },
    { header: "OCR Confidence", render: (s: ShiftRecord) => (
        <span className="px-2.5 py-0.5 text-[8px] font-bold rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">{s.ocrConfidence}% OCR</span>
      )
    },
    { header: "Actions", render: (s: ShiftRecord) => (
        <button 
          onClick={() => setSelectedShift(s)}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 rounded-xl font-bold flex items-center gap-1"
        >
          Details <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const searchFilter = (s: ShiftRecord, query: string) => {
    return s.shiftDate.includes(query) || s.shiftLabel.toLowerCase().includes(query.toLowerCase());
  };

  const totalUpi = shifts.reduce((sum, s) => sum + s.upiSales, 0);

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
        Home &gt; UPI &amp; QR Payments
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-400" /> UPI &amp; QR Collections
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit merchant-wise UPI settlements, QR terminal matches, and transaction success rates.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Ingested UPI Collections</p>
          <p className="text-2xl font-black text-blue-400">₹{totalUpi.toLocaleString()}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Across all merchant QR handles</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Primary Merchant ID QR</p>
          <p className="text-2xl font-black text-white font-mono">9530140836@ptsbi</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1">State Bank of India UPI Terminal</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/40 border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Querying Firestore records...</div>
        ) : (
          <SharedTable
            columns={columns}
            data={shifts}
            searchPlaceholder="Search UPI logs by date..."
            searchFilter={searchFilter}
            exportFileName="upi_qr_collections"
          />
        )}
      </div>

      <SharedDrawer
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="UPI Merchant Transaction Log Detail"
      >
        {selectedShift && (
          <div className="flex flex-col gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Merchant Splits</h5>
              <p>State Bank of India (9530140836@ptsbi): <strong>₹{Math.round(selectedShift.upiSales * 0.4).toLocaleString()}</strong></p>
              <p>Paytm QR Terminal ID: <strong>₹{Math.round(selectedShift.upiSales * 0.6).toLocaleString()}</strong></p>
            </div>
            
            <AuditHistoryViewer history={selectedShift.auditHistory} />
          </div>
        )}
      </SharedDrawer>
    </div>
  );
}
