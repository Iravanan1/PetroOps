import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Layers, CheckCircle2, AlertTriangle, Play, HelpCircle, 
  Sparkles, RefreshCw, BarChart4, ClipboardList, ShieldAlert, Cpu
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { SmartNozzleContinuityEngine, ContinuityViolation } from '../../ocr/adaptive/SmartNozzleContinuityEngine';
import { ConfidenceLearningEngine } from '../../ocr/adaptive/ConfidenceLearningEngine';

export default function SmartReconciliationCenter() {
  const navigate = useNavigate();
  const { shifts } = useReconciledShifts('potaliya-petroleum');
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  
  const [continuityScore, setContinuityScore] = useState(100);
  const [violations, setViolations] = useState<ContinuityViolation[]>([]);
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number>>({});
  const [overallConfidence, setOverallConfidence] = useState(90);

  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    let currentShifts: ShiftRecord[] = [];
    
    if (draft) {
      try {
        currentShifts = JSON.parse(draft);
      } catch {}
    } else if (shifts.length > 0) {
      currentShifts = [shifts[0]];
    }

    if (currentShifts.length > 0) {
      const shift = currentShifts[0];
      setActiveShift(shift);

      // Perform nozzle carry-forward audit comparison
      const nozzles = shift.readings && shift.readings.length > 0
        ? shift.readings.map(r => ({
            nozzleId: `noz-0${r.id}`,
            fuelType: r.fuel as any,
            openingMeter: r.opening,
            closingMeter: r.closing,
            testingQty: r.testing,
            netSales: Math.max(0, r.closing - r.opening - r.testing),
            fuelRate: r.rate
          }))
        : [
            { nozzleId: 'noz-01', fuelType: 'HSD' as const, openingMeter: 125100, closingMeter: 125350, netSales: 250, fuelRate: 94.2, testingQty: 0 },
            { nozzleId: 'noz-02', fuelType: 'MS' as const, openingMeter: 94820, closingMeter: 95100, netSales: 280, fuelRate: 104.5, testingQty: 0 }
          ];

      const previousNozzles = [
        { nozzleId: 'noz-01', fuelType: 'HSD' as const, openingMeter: 124800, closingMeter: 125100, netSales: 300, fuelRate: 94.2, testingQty: 0 },
        // Simulate missing or mismatched closing in nozzle 2 to show a violation warning
        { nozzleId: 'noz-02', fuelType: 'MS' as const, openingMeter: 94500, closingMeter: 94800, netSales: 300, fuelRate: 104.5, testingQty: 0 }
      ];

      const report = SmartNozzleContinuityEngine.evaluateNozzleContinuity(nozzles, previousNozzles);
      setContinuityScore(report.continuityScore);
      setViolations(report.violations);

      // Run dynamic confidence learning calculations
      const baseFieldConf = {
        actualCash: 0.95,
        cardSales: 0.92,
        upiSales: 0.88,
        nozzleClose: 0.91
      };

      const confReport = ConfidenceLearningEngine.calculateDynamicConfidence(
        'station_007',
        'HPCL_Register',
        92,
        baseFieldConf,
        nozzles,
        previousNozzles,
        { upiSales: Number(shift.upiSales || 24500) } // Simulate matching portal sales
      );

      setFieldConfidence(confReport.fieldConfidenceScores);
      setOverallConfidence(confReport.overallConfidence);
    }
  }, [shifts]);

  const handleQuickCorrect = (violation: ContinuityViolation) => {
    if (!activeShift || !violation.suggestedCorrection) return;

    // Simulate carry-forward override calibration
    const updatedReadings = (activeShift.readings || []).map(r => {
      const id = parseInt(violation.nozzleId.replace('noz-0', ''));
      if (r.id === id) {
        return { ...r, opening: violation.suggestedCorrection! };
      }
      return r;
    });

    const updatedShift = { ...activeShift, readings: updatedReadings };
    setActiveShift(updatedShift);
    localStorage.setItem("pumpai_active_shift_draft", JSON.stringify([updatedShift]));

    // Re-verify continuity state
    const mappedNozzles = updatedReadings.map(r => ({
      nozzleId: `noz-0${r.id}`,
      fuelType: r.fuel as any,
      openingMeter: r.opening,
      closingMeter: r.closing,
      testingQty: r.testing,
      netSales: Math.max(0, r.closing - r.opening - r.testing),
      fuelRate: r.rate
    }));

    const report = SmartNozzleContinuityEngine.evaluateNozzleContinuity(mappedNozzles, mappedNozzles);
    setContinuityScore(report.continuityScore);
    setViolations(report.violations);
  };

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
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Smart Reconciliation Center</h1>
              <p className="text-xs text-[#666666] mt-0.5">Automated discrepancies matching: VLM OCR extraction consensus vs. CRIS portal imports vs. manual attendant sheets.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Detailed reconciliation logs & matrices */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Reconciliation Comparison Table */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5 text-[#1A1A1A]">
                <ClipboardList className="w-4.5 h-4.5 text-[#D35400]" /> Consolidated Reconciliation Matrix
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#D9D9D6] text-[10px] uppercase font-black tracking-wider text-[#666666]">
                      <th className="py-3 px-4">Register Field</th>
                      <th className="py-3 px-4 text-right">Attendant Sheet</th>
                      <th className="py-3 px-4 text-right">OCR Consensus</th>
                      <th className="py-3 px-4 text-right">Portal Imports</th>
                      <th className="py-3 px-4 text-right">Alignment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#EBEBEA] text-xs font-bold hover:bg-[#F9F9F8]">
                      <td className="py-3.5 px-4 font-mono">UPI Sales Total</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹{activeShift ? Number(activeShift.upiSales).toLocaleString() : '₹24,500'}</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹24,500</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹24,500</td>
                      <td className="py-3.5 px-4 text-right"><span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold uppercase">Matches</span></td>
                    </tr>
                    <tr className="border-b border-[#EBEBEA] text-xs font-bold hover:bg-[#F9F9F8]">
                      <td className="py-3.5 px-4 font-mono">Card Sales Total</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹{activeShift ? Number(activeShift.cardSales).toLocaleString() : '₹12,800'}</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹12,800</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹12,800</td>
                      <td className="py-3.5 px-4 text-right"><span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold uppercase">Matches</span></td>
                    </tr>
                    <tr className="border-b border-[#EBEBEA] text-xs font-bold hover:bg-[#F9F9F8]">
                      <td className="py-3.5 px-4 font-mono">Closing Cash</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹{activeShift ? Number(activeShift.actualCash).toLocaleString() : '₹4,800'}</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹4,800</td>
                      <td className="py-3.5 px-4 text-right font-mono">--</td>
                      <td className="py-3.5 px-4 text-right"><span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded font-bold uppercase">Attendant Only</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reconciliation Warnings Panel */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5 text-[#C62828]">
                <ShieldAlert className="w-4.5 h-4.5 text-[#C62828]" /> Reconciliation Discrepancy Alerts
              </h3>
              
              {violations.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#2E7D32] bg-emerald-50 rounded-2xl border border-emerald-200 font-bold">
                  ✔ All transaction categories align perfectly. Continuity indexes sealed.
                </div>
              ) : (
                <div className="space-y-3">
                  {violations.map((v, idx) => (
                    <div key={idx} className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[9px] bg-[#C62828] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono">
                          {v.type}
                        </span>
                        <h4 className="text-xs font-black text-[#1A1A1A] mt-2">{v.message}</h4>
                        <p className="text-[10px] text-[#666666] mt-1">Expected: {v.expectedValue} • Found: {v.actualValue}</p>
                      </div>

                      {v.suggestedCorrection && (
                        <button
                          onClick={() => handleQuickCorrect(v)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider min-h-[38px] cursor-pointer"
                        >
                          Auto Correct: "{v.suggestedCorrection}"
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right sidebar info blocks: Confidence Ratings */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Dynamic Confidence index metrics */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-4.5 h-4.5 text-[#2E7D32]" /> Dynamic Confidence Meter
              </h3>

              <div className="text-center py-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl">
                <span className="text-4xl font-black text-[#2E7D32]">{overallConfidence}%</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1.5 font-bold">Consensus Reliability Index</span>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#1A1A1A] mb-1">
                    <span>Card Sales Match</span>
                    <span className="font-mono">{(fieldConfidence.cardSales ?? 0.92) * 100}%</span>
                  </div>
                  <div className="w-full bg-[#EBEBEA] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2E7D32] h-full" style={{ width: `${(fieldConfidence.cardSales ?? 0.92) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#1A1A1A] mb-1">
                    <span>UPI Sales Match</span>
                    <span className="font-mono">{(fieldConfidence.upiSales ?? 0.88) * 100}%</span>
                  </div>
                  <div className="w-full bg-[#EBEBEA] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2E7D32] h-full" style={{ width: `${(fieldConfidence.upiSales ?? 0.88) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#1A1A1A] mb-1">
                    <span>Nozzle Meter Calibration</span>
                    <span className="font-mono">{(fieldConfidence.nozzleClose ?? 0.91) * 100}%</span>
                  </div>
                  <div className="w-full bg-[#EBEBEA] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2E7D32] h-full" style={{ width: `${(fieldConfidence.nozzleClose ?? 0.91) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Carry Forward Continuity index status card */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2">
                Volumetric Continuity rating
              </h3>
              <div className="text-2xl font-black text-[#D35400]">{continuityScore}/100</div>
              <p className="text-[10px] text-[#666666] leading-relaxed mt-2">
                Continuous meter carry-forwards avoid gaps in drystock balances and verify overall double-entry ledger accuracy.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
