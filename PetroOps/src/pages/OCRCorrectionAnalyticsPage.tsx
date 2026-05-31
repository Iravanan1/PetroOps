import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, History, HelpCircle, BarChart, ArrowLeft, RefreshCw, Sparkles, User, Table, Compass
} from 'lucide-react';
import { ClaudeTheme } from '../design-system/ClaudeInspiredTheme';
import { OCRCorrectionMemory, OCRCorrectionRecord } from '../modules/ocr/adaptive/OCRCorrectionMemory';
import { OperatorCorrectionPatterns, OperatorHandwritingProfile } from '../modules/ocr/adaptive/OperatorCorrectionPatterns';
import { LayoutLearningRegistry, LayoutRegistryEntry } from '../modules/ocr/adaptive/LayoutLearningRegistry';

export default function OCRCorrectionAnalyticsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<OCRCorrectionRecord[]>([]);
  const [profiles, setProfiles] = useState<OperatorHandwritingProfile[]>([]);
  const [layoutEntries, setLayoutEntries] = useState<LayoutRegistryEntry[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');

  useEffect(() => {
    // Fetch logs from memory registries
    setRecords(OCRCorrectionMemory.getAllRecords());
    setProfiles(OperatorCorrectionPatterns.getAllProfiles());
    setLayoutEntries(LayoutLearningRegistry.getAllEntries());
  }, []);

  const handleRefresh = () => {
    setRecords(OCRCorrectionMemory.getAllRecords());
    setProfiles(OperatorCorrectionPatterns.getAllProfiles());
    setLayoutEntries(LayoutLearningRegistry.getAllEntries());
  };

  const filteredRecords = selectedOperator === 'all'
    ? records
    : records.filter(r => r.operatorId === selectedOperator);

  // Extract unique operator IDs
  const operators = Array.from(new Set(records.map(r => r.operatorId).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      
      {/* Header bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO CONTROL ROOM
          </button>
          <div className="flex items-center gap-2.5">
            <div className="bg-[#D35400]/10 p-2.5 rounded-2xl">
              <Users className="w-6 h-6 text-[#D35400]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                Operator Handwriting Profiles & Analytics
              </h1>
              <p className="text-xs text-[#666666] mt-0.5">
                Digit confusion profiling, handwriting variance tracking, and supervisor manual override lists.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="px-4 py-3 bg-white border border-[#D9D9D6] hover:bg-[#F3F3F1] hover:border-[#B3B3B3] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xs flex items-center gap-2 min-h-[48px] self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> REFRESH STATS
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Handwriting variance and profiles column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Operator Profiles card */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Active Handwriting Profiles
            </h2>
            {profiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#999999]">
                No active operator handwriting profiles logged yet. Ingest manager corrections to initialize profiling.
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map(p => (
                  <div key={p.operatorId} className="p-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <User className="w-3.5 h-3.5 text-[#D35400]" />
                        <span>{p.operatorId}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {p.totalCorrections} corrections
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block">Avg Correction Latency</span>
                        <span className="text-xs font-mono font-black mt-0.5 block">{p.averageLatencyMs / 1000} seconds</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block">Variance Index</span>
                        <span className="text-xs font-mono font-black mt-0.5 block">{(p.handwritingVarianceIndex * 100).toFixed(0)}% (Messy)</span>
                      </div>
                    </div>

                    {/* Progress variance indicator */}
                    <div className="w-full bg-[#EBEBEA] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-[#D35400] h-full" style={{ width: `${p.handwritingVarianceIndex * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spatial Offset drifts */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#1565C0]" /> Template Coordinate Registry
            </h2>
            {layoutEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#999999]">
                Calibrating baseline coordinates. All systems fully aligned.
              </div>
            ) : (
              <div className="space-y-3">
                {layoutEntries.map((e, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl text-xs font-bold">
                    <span className="font-mono text-slate-650">{e.fieldKey}</span>
                    <span className="font-mono text-emerald-700">dx: {e.currentOffset.dx}px, dy: {e.currentOffset.dy}px</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Detailed override mutations and matrices column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Digit confusion matrix */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-[#D35400]" /> Learned Digit Substitution Mappings
            </h2>
            {profiles.length === 0 || !profiles.some(p => p.confusionPairs.length > 0) ? (
              <div className="py-12 text-center text-xs text-[#999999]">
                No handwriting digit confusions recorded yet. Character confusion learning will display dynamically once overrides are submitted.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#D9D9D6] text-[10px] uppercase font-black tracking-wider text-[#666666]">
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Raw OCR Value</th>
                      <th className="py-3 px-4">Corrected Value</th>
                      <th className="py-3 px-4 text-right">Occurrence Freq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => 
                      p.confusionPairs.map((pair, idx) => (
                        <tr key={`${p.operatorId}-${idx}`} className="border-b border-[#EBEBEA] text-xs font-bold hover:bg-[#F9F9F8] transition-colors">
                          <td className="py-3 px-4">{p.operatorId}</td>
                          <td className="py-3 px-4 font-mono text-[#C62828] bg-rose-50/50">{pair.rawOCR}</td>
                          <td className="py-3 px-4 font-mono text-[#2E7D32] bg-emerald-50/50">{pair.correctedValue}</td>
                          <td className="py-3 px-4 text-right font-mono">{pair.frequency} times</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supervisor Mutation Audit Logs */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#D35400]" /> Historical Correction Audit Ledger
              </h2>
              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#666666] uppercase">Filter:</span>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="px-2.5 py-1.5 text-[10px] font-bold border border-[#D9D9D6] rounded-xl focus:outline-none focus:border-[#D35400] bg-white min-h-[38px] glove-safe-target"
                >
                  <option value="all">ALL OPERATORS</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#999999]">
                No override logs currently matching filters. Verify and lock shifts to register corrections.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map(r => (
                  <div key={r.id} className="p-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[9px] bg-[#EBEBEA] text-[#1A1A1A] px-1.5 py-0.2 rounded font-bold">{r.fieldKey}</span>
                        <span className="text-[9px] text-[#666666] font-mono">
                          {new Date(r.timestamp).toLocaleDateString()} at {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <span className="text-[#C62828] line-through font-mono">"{r.originalValue}"</span>
                        <span className="text-slate-400">➔</span>
                        <span className="text-[#2E7D32] font-mono font-black">"{r.correctedValue}"</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] block uppercase font-bold text-[#666666]">ATTENDANT</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">{r.operatorId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
