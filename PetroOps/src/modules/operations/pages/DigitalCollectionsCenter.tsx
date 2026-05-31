import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Landmark, RefreshCw, Sparkles, CheckSquare, 
  HelpCircle, BarChart2, Plus, Trash, Activity, AlertOctagon, Smartphone
} from 'lucide-react';

export default function DigitalCollectionsCenter() {
  const navigate = useNavigate();

  // Active digital payment merchant accounts
  const [merchants, setMerchants] = useState([
    { id: 'm-01', name: 'Paytm Merchant Siddhivinayak', manualEntry: 14850, portalImport: 14850, bankSettled: 14850, discrepancy: 0, status: 'Matched' },
    { id: 'm-02', name: 'PhonePe QR Cashier Desk', manualEntry: 9650, portalImport: 9530, bankSettled: 9530, discrepancy: 120, status: 'Mismatched' },
    { id: 'm-03', name: 'BharatPe Merchant QR', manualEntry: 6200, portalImport: 6200, bankSettled: 6200, discrepancy: 0, status: 'Matched' }
  ]);

  const totalDiscrepancy = merchants.reduce((sum, m) => sum + m.discrepancy, 0);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
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
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Digital Collections Operations</h1>
              <p className="text-xs text-[#666666] mt-0.5">Audit Paytm QR merchant terminals, PhonePe, SBI cards, and automatically match settlement bank dumps.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main digital comparison matrix */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Merchant accounts table */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Smartphone className="w-4.5 h-4.5 text-[#D35400]" /> QR Merchant Terminals
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#D9D9D6] text-[10px] uppercase font-black tracking-wider text-[#666666]">
                      <th className="py-3 px-4">Merchant Endpoints</th>
                      <th className="py-3 px-4 text-right">Attendant Entry</th>
                      <th className="py-3 px-4 text-right">Portal Import</th>
                      <th className="py-3 px-4 text-right">Discrepancy</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchants.map(m => (
                      <tr key={m.id} className="border-b border-[#EBEBEA] text-xs font-bold hover:bg-[#F9F9F8]">
                        <td className="py-3.5 px-4 font-mono">{m.name}</td>
                        <td className="py-3.5 px-4 text-right font-mono">₹{m.manualEntry.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono">₹{m.portalImport.toLocaleString()}</td>
                        <td className={`py-3.5 px-4 text-right font-mono ${m.discrepancy > 0 ? 'text-[#C62828]' : 'text-slate-500'}`}>
                          ₹{m.discrepancy.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-black uppercase border ${
                            m.status === 'Matched'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reconciliation explain card */}
            {totalDiscrepancy > 0 && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-3xl flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">PhonePe Settlement Gap Flagged</h4>
                  <p className="text-[11px] text-rose-900 mt-1.5 leading-relaxed">
                    A discrepancy of ₹120 exists between the PhonePe cash register ledger sheet and imported API collections. This typically indicates a missing transaction scan or double payment entry error. 
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Right sidebars: Settlement timelines */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Total collections ratings */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-[#D35400]" /> Digital Summary
              </h3>

              <div className="p-4 bg-[#FAF9F5] border border-[#E4E3DE] rounded-2xl">
                <span className="text-[9px] uppercase font-black text-[#666666] block">Total QR/Card Collections</span>
                <span className="text-2xl font-mono font-black text-[#1A1A1A] block mt-1">₹30,700</span>
              </div>

              <div className="p-3.5 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl text-[10px] text-[#666666] leading-relaxed">
                <strong>Idempotent Sync Hooks:</strong>
                <span className="block mt-1">Portal synced values are compared against bank receipt logs twice daily to identify double settlements or chargebacks.</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
