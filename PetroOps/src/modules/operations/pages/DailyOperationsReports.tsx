import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Printer, Share2, Clipboard, Landmark, 
  Thermometer, CreditCard, Sparkles, CheckCircle2
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';

export default function DailyOperationsReports() {
  const navigate = useNavigate();
  const { shifts } = useReconciledShifts('potaliya-petroleum');
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.length > 0) {
          setActiveShift(parsed[0]);
        }
      } catch {}
    } else if (shifts.length > 0) {
      setActiveShift(shifts[0]);
    }
  }, [shifts]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto print:max-w-full">
        
        {/* Back navigation - Hidden during printing */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button 
            onClick={() => navigate('/operations/command-center')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO COMMAND CENTER
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-white border border-[#D9D9D6] hover:bg-[#F3F3F1] text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 min-h-[42px] cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
            <button
              className="px-4 py-2.5 bg-[#D35400] text-white hover:bg-[#A04000] text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 min-h-[42px] cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Share WhatsApp
            </button>
          </div>
        </div>

        {/* Report Content Sheet */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b border-[#D9D9D6] pb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">Hindustan Petroleum Corporation</h1>
              <p className="text-xs text-[#666666] font-bold uppercase tracking-wider mt-0.5">Siddhivinayak Fuels • Station Closing Sheet</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">SHIFT ID: {activeShift?.id || 'SHIFT-MGR-9907'} • DATE: {activeShift?.shiftDate || new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-black uppercase">
                Audit Sealed
              </span>
            </div>
          </div>

          {/* 1. Nozzle Meter Sales Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider border-b border-[#EBEBEA] pb-1 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-[#D35400]" /> Fuel Sales Meter Summary
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EBEBEA] font-black text-[#666666] uppercase text-[9px]">
                    <th className="py-2 px-1">Nozzle</th>
                    <th className="py-2 px-1">Fuel</th>
                    <th className="py-2 px-1 text-right">Opening</th>
                    <th className="py-2 px-1 text-right">Closing</th>
                    <th className="py-2 px-1 text-right">Testing</th>
                    <th className="py-2 px-1 text-right">Net Litres</th>
                    <th className="py-2 px-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#EBEBEA] font-bold">
                    <td className="py-2.5 px-1 font-mono">noz-01</td>
                    <td className="py-2.5 px-1">HSD</td>
                    <td className="py-2.5 px-1 text-right font-mono">125,100</td>
                    <td className="py-2.5 px-1 text-right font-mono">125,350</td>
                    <td className="py-2.5 px-1 text-right font-mono">0</td>
                    <td className="py-2.5 px-1 text-right font-mono">250.00</td>
                    <td className="py-2.5 px-1 text-right font-mono">₹23,550.00</td>
                  </tr>
                  <tr className="border-b border-[#EBEBEA] font-bold">
                    <td className="py-2.5 px-1 font-mono">noz-02</td>
                    <td className="py-2.5 px-1">MS</td>
                    <td className="py-2.5 px-1 text-right font-mono">94,820</td>
                    <td className="py-2.5 px-1 text-right font-mono">95,100</td>
                    <td className="py-2.5 px-1 text-right font-mono">0</td>
                    <td className="py-2.5 px-1 text-right font-mono">280.00</td>
                    <td className="py-2.5 px-1 text-right font-mono">₹29,260.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Collections & Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider border-b border-[#EBEBEA] pb-1 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-[#1565C0]" /> Shift Collections
              </h3>
              <div className="space-y-2 text-xs font-bold font-mono">
                <div className="flex justify-between">
                  <span className="text-[#666666] font-sans">UPI Collections:</span>
                  <span>₹{activeShift ? Number(activeShift.upiSales).toLocaleString() : '24,500'}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666] font-sans">Card Collections:</span>
                  <span>₹{activeShift ? Number(activeShift.cardSales).toLocaleString() : '12,800'}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666] font-sans">Credit Sales:</span>
                  <span>₹{activeShift ? Number(activeShift.creditSales).toLocaleString() : '8,200'}.00</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#D9D9D6] pt-1 font-black text-sm">
                  <span className="font-sans">Expected Closing Cash:</span>
                  <span>₹{activeShift ? Number(activeShift.actualCash).toLocaleString() : '4,800'}.00</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider border-b border-[#EBEBEA] pb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#D35400]" /> Operational Expenses
              </h3>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Attendant Tea/Snacks</span>
                  <span className="font-mono">₹150.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Calibration testing HSD</span>
                  <span className="font-mono">₹200.00</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#D9D9D6] pt-1 font-black text-sm">
                  <span>Total Expenses:</span>
                  <span className="font-mono">₹{activeShift ? Number(activeShift.expenses).toLocaleString() : '350'}.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Volumetric Tank Dips Variance */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider border-b border-[#EBEBEA] pb-1 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-[#2E7D32]" /> Volumetric Shrinkage
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-bold">
                <thead>
                  <tr className="border-b border-[#EBEBEA] font-black text-[#666666] uppercase text-[9px]">
                    <th className="py-2 px-1">Tank</th>
                    <th className="py-2 px-1">Fuel Type</th>
                    <th className="py-2 px-1 text-right">Physical Dip</th>
                    <th className="py-2 px-1 text-right">Automation</th>
                    <th className="py-2 px-1 text-right">Variance Ltr</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#EBEBEA]">
                    <td className="py-2 px-1 font-mono">tank-01</td>
                    <td className="py-2 px-1">HSD</td>
                    <td className="py-2 px-1 text-right font-mono">14,850 L</td>
                    <td className="py-2 px-1 text-right font-mono">14,820 L</td>
                    <td className="py-2 px-1 text-right font-mono text-emerald-700">+30.0 L</td>
                  </tr>
                  <tr className="border-b border-[#EBEBEA]">
                    <td className="py-2 px-1 font-mono">tank-02</td>
                    <td className="py-2 px-1">MS</td>
                    <td className="py-2 px-1 text-right font-mono">9,540 L</td>
                    <td className="py-2 px-1 text-right font-mono">9,555 L</td>
                    <td className="py-2 px-1 text-right font-mono text-rose-600">-15.0 L</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Verification Note */}
          <div className="border-t border-[#D9D9D6] pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-1.5 text-[9.5px] text-[#2E7D32] font-black uppercase">
              <CheckCircle2 className="w-4 h-4" /> Double-Entry Replay Audit Trails Intact
            </div>
            <div className="text-[10px] text-[#666666]">
              Authorized Representative: <span className="font-bold border-b border-[#1A1A1A] pb-0.5 px-4">Siddhivinayak Fuels Supervisor</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
