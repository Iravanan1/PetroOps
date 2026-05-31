import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, ShieldCheck, AlertTriangle, 
  TrendingUp, Award, DollarSign, Calendar
} from 'lucide-react';
import { GSTReportEngine, GSTR1Summary, GSTR3BSummary, MonthlyTaxSummary } from '../../shared/GSTReportEngine';
import { GSTExportService } from '../GSTExportService';

export default function TaxPreparationWorkspace() {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05');
  const [pipeline, setPipeline] = useState<string>('potaliya-petroleum');
  const [gstin] = useState<string>('27AAAAA1111A1Z1'); // MH GSTIN
  const [state] = useState<string>('MH');
  const [taxData, setTaxData] = useState<MonthlyTaxSummary | null>(null);
  const [isLate, setIsLate] = useState<boolean>(false);

  useEffect(() => {
    // Generate simulated accounting ledger records using GSTReportEngine
    const demo = GSTReportEngine.generateDemoData(pipeline, state, 6);
    
    // We add a late fee if the user explicitly checks it or based on timing
    const summary = GSTReportEngine.buildMonthlyTaxSummary(
      selectedMonth,
      pipeline,
      "Potaliya Petroleum Station",
      state,
      gstin,
      demo.fuelSales,
      demo.nonFuelSales,
      demo.itc,
      142000, // Monthly operating expense (maintenance, electricity, etc.)
      88000,  // Monthly staff/attendants salaries
      { ms: 89.20, hsd: 78.40, speed: 92.50 } // Dealer purchase costs
    );

    if (isLate) {
      summary.gstr3b = GSTReportEngine.buildGSTR3B(summary.gstr1, demo.itc, true);
      summary.penaltyRisk = summary.gstr3b.totalNetLiability - summary.gstr3b.totalGstPayable;
    }

    setTaxData(summary);
  }, [selectedMonth, pipeline, state, gstin, isLate]);

  if (!taxData) return null;

  const handleExportGSTR1 = () => {
    if (taxData) {
      GSTExportService.exportGSTR1CSV(taxData.gstr1, selectedMonth);
    }
  };

  const handleExportGSTR3B = () => {
    if (taxData) {
      GSTExportService.exportGSTR3BCSV(taxData.gstr3b, selectedMonth);
    }
  };

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-8">
      {/* Configuration Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F9F9F8] border border-[#EBEBEA] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A1A] p-2 rounded-xl text-white">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#666666] tracking-wider block">Tax Period Selection</span>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-[#D9D9D6] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
              />
              <span className="text-[11px] font-mono text-[#666666] font-bold">GSTIN: {gstin}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-[#666666] cursor-pointer">
            <input 
              type="checkbox"
              checked={isLate}
              onChange={(e) => setIsLate(e.target.checked)}
              className="w-4 h-4 rounded border-[#D9D9D6] text-[#D35400] focus:ring-0"
            />
            Interest/Late Filing Penalty Mode
          </label>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <span className="text-[9px] font-black uppercase text-[#666666] block">Fuel VAT (Petroleum)</span>
          <span className="text-base font-black text-[#1A1A1A] mt-1 block">₹{taxData.vatCollected.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">VAT rates: MS 26% | HSD 24%</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <span className="text-[9px] font-black uppercase text-[#666666] block">Fuel Excise Duty</span>
          <span className="text-base font-black text-[#1A1A1A] mt-1 block">₹{taxData.exciseDutyComponent.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">Central Petroleum Levy</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <span className="text-[9px] font-black uppercase text-[#666666] block">Non-Fuel GST Outward</span>
          <span className="text-base font-black text-[#1A1A1A] mt-1 block">₹{taxData.gstr1.totalGst.toLocaleString()}</span>
          <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">B2C Lubs (18%) & Shop (5%)</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <span className="text-[9px] font-black uppercase text-[#666666] block">Input Tax Credit (ITC)</span>
          <span className="text-base font-black text-[#1A1A1A] mt-1 block">₹{taxData.gstr3b.itcTotal.toLocaleString()}</span>
          <span className="text-[9px] text-indigo-700 font-bold block mt-0.5">Offsets: {taxData.gstr3b.itcTotal > 0 ? 'Eligible Inward Lubs' : 'No inward offsets'}</span>
        </div>
      </div>

      {/* Detailed Sections split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GSTR-1 outward filing details */}
        <div className="border border-[#EBEBEA] rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#EBEBEA]">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">GSTR-1 Outward Return Detail</h4>
              <p className="text-[9px] text-[#666666] font-bold uppercase mt-0.5">Filing due: 11th of succeeding month</p>
            </div>
            <button
              onClick={handleExportGSTR1}
              className="flex items-center gap-1 text-[10px] font-extrabold text-[#D35400] hover:text-[#A04000] border border-[#D35400]/20 hover:border-[#D35400] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV Return
            </button>
          </div>

          <div className="space-y-2 text-xs font-bold text-[#1A1A1A]">
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">Retail B2C Taxable (Shop/Lubs)</span>
              <span>₹{taxData.gstr1.b2cTaxableValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">CGST Component (B2C)</span>
              <span>₹{taxData.gstr1.b2cCgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">SGST Component (B2C)</span>
              <span>₹{taxData.gstr1.b2cSgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#666666]">IGST Component (B2C)</span>
              <span>₹{taxData.gstr1.b2cIgst.toLocaleString()}</span>
            </div>
          </div>

          {/* HSN Breakdown list */}
          <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3 space-y-2">
            <span className="text-[9px] uppercase font-black tracking-wider text-[#666666] block">HSN Summaries</span>
            {taxData.gstr1.hsnSummary.length > 0 ? (
              taxData.gstr1.hsnSummary.map((h, i) => (
                <div key={i} className="flex justify-between text-[10px] font-bold text-[#1A1A1A]">
                  <span className="font-mono text-[#666666]">HSN {h.hsnCode} ({h.description})</span>
                  <span>₹{h.taxableValue.toLocaleString()} (GST ₹{(h.cgst + h.sgst + h.igst).toLocaleString()})</span>
                </div>
              ))
            ) : (
              <span className="text-[9px] font-bold text-[#999999] italic block">No outward HSN lines record</span>
            )}
          </div>
        </div>

        {/* GSTR-3B Self Assessment return */}
        <div className="border border-[#EBEBEA] rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#EBEBEA]">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">GSTR-3B Assessment Return</h4>
              <p className="text-[9px] text-[#666666] font-bold uppercase mt-0.5">Filing due: 20th of succeeding month</p>
            </div>
            <button
              onClick={handleExportGSTR3B}
              className="flex items-center gap-1 text-[10px] font-extrabold text-[#D35400] hover:text-[#A04000] border border-[#D35400]/20 hover:border-[#D35400] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV Summary
            </button>
          </div>

          <div className="space-y-2 text-xs font-bold text-[#1A1A1A]">
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">Total Tax Outward Liability</span>
              <span>₹{taxData.gstr1.totalGst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">Less Available Inward ITC</span>
              <span className="text-emerald-700">-₹{taxData.gstr3b.itcTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dashed border-[#F3F3F1]">
              <span className="text-[#666666]">Net CGST/SGST Cash Liability</span>
              <span>₹{taxData.gstr3b.totalGstPayable.toLocaleString()}</span>
            </div>
            {isLate && (
              <>
                <div className="flex justify-between py-1 border-b border-dashed border-rose-200 text-rose-800">
                  <span className="font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D35400]" /> Interest (18% p.a.)
                  </span>
                  <span>₹{taxData.gstr3b.interestLiability.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-rose-200 text-rose-800">
                  <span className="font-extrabold">Late Fee Summary</span>
                  <span>₹{taxData.gstr3b.lateFee.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-[#EBEBEA] text-sm">
              <span className="font-black text-[#1A1A1A]">Treasury Payment Needed</span>
              <span className="font-black text-rose-700">₹{taxData.gstr3b.totalNetLiability.toLocaleString()}</span>
            </div>
          </div>

          {/* Compliance Status */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isLate 
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}>
            {isLate ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-700 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block">Compliance Penalty Risk Alert</span>
                  <span className="text-[9px] leading-relaxed block mt-0.5">
                    This filing is flagged as late. Daily penalty interest rate is 18% p.a., with a flat ₹50/day late fee. Re-verify ledger before cash deposit.
                  </span>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block">Reconciliation Integrity Cleared</span>
                  <span className="text-[9px] leading-relaxed block mt-0.5">
                    GST tax ledger matches physical invoice counts. Safe to export GSTR-1 and GSTR-3B CSVs for your auditor.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
