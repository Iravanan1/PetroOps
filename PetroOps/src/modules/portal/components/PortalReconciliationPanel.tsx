import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, HelpCircle, FileText, 
  Sparkles, CheckCircle2, ChevronRight, Activity 
} from 'lucide-react';

interface ReconRow {
  field: string;
  label: string;
  portalVal: number;
  ocrVal: number;
  manualVal: number;
  historicalVal: number;
  status: 'MATCH' | 'MISMATCH' | 'WARNING';
}

interface PortalReconciliationPanelProps {
  portalData: any;
  onApprove: (finalValues: any) => void;
}

export default function PortalReconciliationPanel({
  portalData,
  onApprove
}: PortalReconciliationPanelProps) {
  const [reconList, setReconList] = useState<ReconRow[]>([
    { field: 'measuredDensity', label: 'Measured Density (kg/m³)', portalVal: 745.2, ocrVal: 745.2, manualVal: 745.2, historicalVal: 745.2, status: 'MATCH' },
    { field: 'upiSales', label: 'UPI Settlements (₹)', portalVal: 18500, ocrVal: 18450, manualVal: 18500, historicalVal: 18500, status: 'MISMATCH' },
    { field: 'cardSales', label: 'Card Swipes (₹)', portalVal: 9000, ocrVal: 9000, manualVal: 9000, historicalVal: 9000, status: 'MATCH' },
    { field: 'creditSales', label: 'Ledger Udhar (₹)', portalVal: 14300, ocrVal: 14300, manualVal: 14300, historicalVal: 14300, status: 'MATCH' },
    { field: 'actualCash', label: 'Drawer Cash (₹)', portalVal: 25022, ocrVal: 25022, manualVal: 25022, historicalVal: 24900, status: 'WARNING' },
    { field: 'nozzle_1_net', label: 'Nozzle-1 Sales (Litres)', portalVal: 335.30, ocrVal: 335.30, manualVal: 335.30, historicalVal: 335.30, status: 'MATCH' },
    { field: 'nozzle_2_net', label: 'Nozzle-2 Sales (Litres)', portalVal: 190.50, ocrVal: 190.50, manualVal: 190.50, historicalVal: 190.50, status: 'MATCH' }
  ]);

  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [syncDone, setSyncDone] = useState(false);

  const handleUpdateValue = (field: string, val: number) => {
    setOverrides(prev => ({ ...prev, [field]: val }));
    setReconList(prev => prev.map(row => {
      if (row.field === field) {
        return {
          ...row,
          manualVal: val,
          status: row.portalVal === val && row.ocrVal === val ? 'MATCH' : 'MISMATCH'
        };
      }
      return row;
    }));
  };

  const handleApproveReconciliations = () => {
    setSyncDone(true);
    const approvedData = reconList.reduce((acc, row) => {
      acc[row.field] = row.manualVal;
      return acc;
    }, {} as Record<string, number>);

    setTimeout(() => {
      onApprove(approvedData);
      setSyncDone(false);
    }, 1000);
  };

  return (
    <div className="border border-[#EBEBEA] rounded-2xl bg-white shadow-xs p-5 sm:p-6 space-y-5 font-sans animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#EBEBEA] pb-3">
        <h4 className="text-xs uppercase font-black tracking-widest text-[#1A1A1A] flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#D35400] animate-pulse" /> Multi-Source Reconciliation Matrix
        </h4>
        <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full uppercase bg-[#1A1A1A]">
          4-Source Compare
        </span>
      </div>

      {/* Reconciliation Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-bold text-[#1A1A1A] border-collapse">
          <thead>
            <tr className="bg-[#FAF9F5] border-b border-[#EBEBEA] text-[8px] uppercase tracking-wider text-[#666666]">
              <th className="p-3">Ledger Parameter</th>
              <th className="p-3 text-right">Live Portal</th>
              <th className="p-3 text-right">OCR Guess</th>
              <th className="p-3 text-right">Manual Edit</th>
              <th className="p-3 text-right">Historical Flow</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBEA]">
            {reconList.map(row => {
              const isMismatch = row.status === 'MISMATCH';
              const isWarning = row.status === 'WARNING';
              const isMatch = row.status === 'MATCH';

              return (
                <tr key={row.field} className="hover:bg-[#FAF9F5]/40 transition-colors">
                  <td className="p-3">{row.label}</td>
                  
                  {/* Portal Column */}
                  <td className="p-3 text-right font-mono text-[#0A3D62]">{row.portalVal.toLocaleString()}</td>
                  
                  {/* OCR Column */}
                  <td className={`p-3 text-right font-mono ${isMismatch ? 'text-rose-700 font-extrabold' : ''}`}>{row.ocrVal.toLocaleString()}</td>
                  
                  {/* Manual Column */}
                  <td className="p-3 text-right font-mono">
                    <input
                      type="number"
                      value={overrides[row.field] !== undefined ? overrides[row.field] : row.manualVal}
                      onChange={e => handleUpdateValue(row.field, Number(e.target.value))}
                      className={`w-20 text-right bg-[#FAF9F5] border rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-[#B3B3B3] ${
                        isMismatch ? 'border-rose-300 bg-rose-50/10' : 'border-[#D9D9D6]'
                      }`}
                    />
                  </td>
                  
                  {/* Historical Flow Column */}
                  <td className="p-3 text-right font-mono text-slate-500">{row.historicalVal.toLocaleString()}</td>
                  
                  {/* Status Badges */}
                  <td className="p-3 text-center">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${
                      isMatch
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        : isMismatch
                          ? 'bg-rose-50 text-rose-800 border border-rose-100 animate-pulse-slow'
                          : 'bg-amber-50 text-amber-800 border border-amber-100'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Discrepancy warning flash alerts */}
      {reconList.some(r => r.status === 'MISMATCH') && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs font-semibold leading-relaxed flex gap-2 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-[#D35400] shrink-0" />
          <div>
            Discrepancy detected in **UPI Settlements**: Live HPCL portal reports ₹18,500, but scanner parsed ₹18,450. Attendant manually overrode to matching ₹18,500. Verify settlements keys.
          </div>
        </div>
      )}

      {/* Action panel */}
      <div className="pt-4 border-t border-[#EBEBEA] flex flex-wrap justify-between items-center gap-4">
        <div className="text-[10px] text-[#666666] font-bold uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-700" /> Replay-safe accounting finalized on approve
        </div>

        {syncDone ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider animate-pulse h-[40px]">
            <CheckCircle2 className="w-4 h-4" /> Finalizing approved ledgers...
          </div>
        ) : (
          <button
            onClick={handleApproveReconciliations}
            className="bg-[#1A1A1A] hover:bg-black text-white font-black uppercase text-[10px] tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 h-[40px] glove-safe-target"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Approve & Lock Ledgers
          </button>
        )}
      </div>

    </div>
  );
}
