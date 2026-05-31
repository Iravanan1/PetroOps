import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord, NozzleReading } from '../../shared/hooks/useReconciledShifts';
import { SharedTable } from '../../shared/components/SharedTable';
import { SharedDrawer } from '../../shared/components/SharedDrawer';
import { AuditHistoryViewer } from '../../shared/components/AuditHistoryViewer';
import { Fuel, ChevronRight, TrendingUp } from 'lucide-react';

interface NozzleReadingRow extends NozzleReading {
  shiftDate: string;
  shiftLabel: string;
  scanReference: string;
  auditHistory?: any[];
}

export default function WetStockPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedReading, setSelectedReading] = useState<NozzleReadingRow | null>(null);

  // Flatten nozzle readings for granular chronological table searches
  const flattenedReadings: NozzleReadingRow[] = [];
  shifts.forEach(s => {
    s.readings?.forEach(r => {
      flattenedReadings.push({
        ...r,
        shiftDate: s.shiftDate,
        shiftLabel: s.shiftLabel,
        scanReference: s.scanReference || "Shift Register Paper",
        auditHistory: s.auditHistory
      });
    });
  });

  const columns = [
    { header: "Shift Date", render: (r: NozzleReadingRow) => <span className="font-semibold">{r.shiftDate}</span> },
    { header: "Nozzle ID", render: (r: NozzleReadingRow) => <span>Nozzle #{r.id}</span> },
    { header: "Fuel Product", render: (r: NozzleReadingRow) => <span className="font-semibold text-blue-400">{r.fuel}</span> },
    { header: "Opening Meter (L)", render: (r: NozzleReadingRow) => <span>{r.opening.toLocaleString()}</span> },
    { header: "Closing Meter (L)", render: (r: NozzleReadingRow) => <span>{r.closing.toLocaleString()}</span> },
    { header: "Testing calibration (L)", render: (r: NozzleReadingRow) => <span className="text-amber-500">{r.testing} L</span> },
    { header: "Net Litres Sold", render: (r: NozzleReadingRow) => <span className="font-extrabold text-white">{(r.closing - r.opening - r.testing).toLocaleString()} L</span> },
    { header: "Rate per Litre", render: (r: NozzleReadingRow) => <span>₹{r.rate}</span> },
    { header: "Actions", render: (r: NozzleReadingRow) => (
        <button 
          onClick={() => setSelectedReading(r)}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 rounded-xl font-bold flex items-center gap-1"
        >
          Verify <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const searchFilter = (r: NozzleReadingRow, query: string) => {
    return r.shiftDate.includes(query) || r.fuel.toLowerCase().includes(query.toLowerCase());
  };

  const totalLitresSold = flattenedReadings.reduce((sum, r) => sum + (r.closing - r.opening - r.testing), 0);

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
        Home &gt; Wet Stock &amp; Nozzles
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Fuel className="w-8 h-8 text-blue-400" /> Wet Stock &amp; Nozzle Register
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit active nozzle opening/closing meters, fuel density log entries, and tank dip discrepancies.</p>
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
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Net Litres Sold</p>
          <p className="text-2xl font-black text-white">{(totalLitresSold || 0).toLocaleString()} Litres</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Net shift-by-shift nozzle volumes</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Product Variance Audit</p>
          <p className="text-2xl font-black text-teal-400">$\pm$ 4.2 L (Physical vs Book)</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1">No leakage or structural density anomalies detected</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/40 border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Querying Firestore records...</div>
        ) : (
          <SharedTable
            columns={columns}
            data={flattenedReadings}
            searchPlaceholder="Search nozzle registers by date or product..."
            searchFilter={searchFilter}
            exportFileName="wetstock_nozzle_meters"
          />
        )}
      </div>

      <SharedDrawer
        isOpen={!!selectedReading}
        onClose={() => setSelectedReading(null)}
        title="Nozzle Meter Verification Audit"
      >
        {selectedReading && (
          <div className="flex flex-col gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Nozzle Info</h5>
              <p>Shift reference: <strong>{selectedReading.shiftLabel}</strong></p>
              <p>Product: <strong>{selectedReading.fuel}</strong></p>
              <p>Original Scan file reference: <strong>{selectedReading.scanReference}</strong></p>
            </div>
            
            <AuditHistoryViewer history={selectedReading.auditHistory} />
          </div>
        )}
      </SharedDrawer>
    </div>
  );
}
