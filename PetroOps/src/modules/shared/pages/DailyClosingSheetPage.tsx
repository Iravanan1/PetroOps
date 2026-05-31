import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord } from '../hooks/useReconciledShifts';
import { WetStockService, ReconciliationService } from '../services/AccountingServices';
import { FileText, Printer, ShieldAlert, Sparkles, Landmark, UserCheck } from 'lucide-react';

export default function DailyClosingSheetPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");

  const activeShift = shifts.find(s => s.id === selectedShiftId) || shifts[0];

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Retrieving shift structures...</div>;
  }

  // Pre-calculate Wet Stock and Discrepancies if active shift is loaded
  const wsReport = activeShift ? WetStockService.reconcileWetStock(activeShift) : null;
  const discReport = activeShift ? ReconciliationService.auditDiscrepancies(activeShift) : null;

  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* HUD Header (Excluded during printing) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-400" /> Daily Closing Sheet Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">Export high-fidelity, accountant-ready Daily Closing Sheets with immutable ledger matching.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedShiftId}
            onChange={(e) => setSelectedShiftId(e.target.value)}
            className="bg-[#0b101d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.shiftDate} ({s.shiftLabel})</option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs flex items-center gap-2 font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Printer className="w-4 h-4" /> Print Closing Sheet
          </button>
        </div>
      </div>

      {activeShift ? (
        <div id="printable-closing-sheet" className="p-8 md:p-12 rounded-3xl bg-[#0a0f1d] border border-slate-800 text-slate-300 font-sans print:bg-white print:text-black print:border-none print:p-0 flex flex-col gap-8 shadow-xl">
          {/* Print Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800/80 pb-6 print:border-black">
            <div>
              <h2 className="text-2xl font-black text-white print:text-black uppercase tracking-wider">Potaliya Petroleum</h2>
              <p className="text-[10px] text-slate-400 print:text-black/70 font-mono mt-1">NH-62 Highway Station, Rajasthan</p>
              <p className="text-[9px] text-slate-500 print:text-black/60 font-mono mt-0.5">GSTIN: 08AAAFP0924K1ZP</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-slate-300 print:text-black uppercase tracking-widest bg-slate-900 print:bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-800 print:border-black/20">Daily Closing Sheet</h3>
              <p className="text-[10px] text-slate-400 print:text-black/70 mt-2 font-mono">Date: <strong>{activeShift.shiftDate}</strong></p>
              <p className="text-[9px] text-slate-500 print:text-black/60 font-mono">Shift ID: <strong>{activeShift.id}</strong></p>
            </div>
          </div>

          {/* 1. Nozzle Meter Readings Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-black pb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> I. Nozzle &amp; Wet Stock volume logs
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 print:border-black text-slate-400 print:text-black/80 font-bold uppercase">
                    <th className="py-2 px-1">Nozzle</th>
                    <th className="py-2 px-1">Product</th>
                    <th className="py-2 px-1">Opening</th>
                    <th className="py-2 px-1">Closing</th>
                    <th className="py-2 px-1">Testing</th>
                    <th className="py-2 px-1">Sold Litres</th>
                    <th className="py-2 px-1">Rate</th>
                    <th className="py-2 px-1 text-right">Value (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeShift.readings?.map((r, idx) => {
                    const sold = Math.max(0, r.closing - r.opening - r.testing);
                    return (
                      <tr key={idx} className="border-b border-slate-900 print:border-black/10">
                        <td className="py-2 px-1 font-mono">Nozzle #{r.id}</td>
                        <td className="py-2 px-1 font-bold text-slate-200 print:text-black">{r.fuel}</td>
                        <td className="py-2 px-1 font-mono">{r.opening.toLocaleString()}</td>
                        <td className="py-2 px-1 font-mono">{r.closing.toLocaleString()}</td>
                        <td className="py-2 px-1 font-mono">{r.testing} L</td>
                        <td className="py-2 px-1 font-bold print:text-black">{sold.toLocaleString()} L</td>
                        <td className="py-2 px-1 font-mono">₹{r.rate}</td>
                        <td className="py-2 px-1 text-right font-mono font-bold">₹{Math.round(sold * r.rate).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Double-Entry Collections Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            {/* Payment & Settlements Summary */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-black pb-1.5 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-blue-400" /> II. Payments &amp; Settlement Ledgers
              </h4>
              <div className="flex flex-col gap-2.5 text-[11px] font-mono">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Card POS Clearing:</span>
                  <span className="font-bold">₹{activeShift.cardSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">UPI QR digital Clearing:</span>
                  <span className="font-bold">₹{activeShift.upiSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Accounts Receivable (Udhari):</span>
                  <span className="font-bold">₹{activeShift.creditSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Credit recoveries collected:</span>
                  <span className="font-bold text-emerald-400 print:text-black">₹{activeShift.creditRecovery.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white print:text-black font-extrabold text-xs pt-1">
                  <span>Total Non-Cash Settlements:</span>
                  <span>₹{(activeShift.cardSales + activeShift.upiSales + activeShift.creditSales).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cash Till Reconciliation */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider border-b border-slate-800 print:border-black pb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" /> III. Expected Till Cash Flow
              </h4>
              <div className="flex flex-col gap-2.5 text-[11px] font-mono">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Opening Cash Till:</span>
                  <span className="font-bold">₹{activeShift.openingCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Shift office Expense payouts:</span>
                  <span className="font-bold text-rose-400 print:text-black">-₹{activeShift.expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Expected Closing till Cash:</span>
                  <span className="font-bold">₹{(activeShift.openingCash + activeShift.creditRecovery - activeShift.expenses).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400 print:text-black/70">Actual Closing till Cash:</span>
                  <span className="font-bold text-white print:text-black">₹{activeShift.actualCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white print:text-black font-extrabold text-xs pt-1">
                  <span>Till Discrepancy Mismatch:</span>
                  <span className={activeShift.cashShortage < 0 ? 'text-emerald-400 print:text-black' : 'text-amber-400 print:text-black'}>
                    {activeShift.cashShortage < 0 ? `+₹${Math.abs(activeShift.cashShortage)}` : `-₹${activeShift.cashShortage}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Discrepancy Report & Audit Alerts (Excluded if clean) */}
          {discReport && discReport.mismatches.length > 0 && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl print:bg-slate-100 print:border-black/20">
              <h5 className="text-[10px] uppercase tracking-wider text-rose-400 print:text-black font-extrabold flex items-center gap-1.5 mb-2.5">
                <ShieldAlert className="w-3.5 h-3.5" /> IV. Ingestion Discrepancies &amp; Audit Exceptions Detected
              </h5>
              <div className="flex flex-col gap-2">
                {discReport.mismatches.map((m, idx) => (
                  <p key={idx} className="text-[9px] font-mono leading-normal text-rose-300 print:text-black">
                    - [{m.severity}] {m.description}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 4. Operator Signatures & Sign-offs */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-800/80 print:border-black print:grid-cols-4">
            <div className="flex flex-col items-center gap-8 text-[9px] uppercase tracking-wider font-bold">
              <div className="w-28 border-b border-slate-700 print:border-black"></div>
              <span className="text-slate-500 print:text-black/70">Shift Operator</span>
            </div>
            <div className="flex flex-col items-center gap-8 text-[9px] uppercase tracking-wider font-bold">
              <div className="w-28 border-b border-slate-700 print:border-black"></div>
              <span className="text-slate-500 print:text-black/70">Cash Auditor</span>
            </div>
            <div className="flex flex-col items-center gap-8 text-[9px] uppercase tracking-wider font-bold">
              <div className="w-28 border-b border-slate-700 print:border-black"></div>
              <span className="text-slate-500 print:text-black/70">Station Manager</span>
            </div>
            <div className="flex flex-col items-center gap-8 text-[9px] uppercase tracking-wider font-bold">
              <div className="w-28 border-b border-slate-700 print:border-black"></div>
              <span className="text-slate-500 print:text-black/70">Station Owner</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500">No shift registers registered to create daily sheets.</div>
      )}
    </div>
  );
}
