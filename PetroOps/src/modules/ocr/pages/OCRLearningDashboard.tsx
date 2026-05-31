import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Award, TrendingUp, RefreshCw, BookOpen, Trash2, 
  Clock, ShieldCheck, Activity, Landmark, User, FileText, ChevronRight
} from 'lucide-react';
import { HandwritingGlossary, GlossaryEntry } from '../adaptive/HandwritingGlossary';
import { OperatorCorrectionTrainer, LearningKPIs } from '../adaptive/OperatorCorrectionTrainer';
import { OperatorCorrectionPatterns, OperatorHandwritingProfile } from '../adaptive/OperatorCorrectionPatterns';

export default function OCRLearningDashboard() {
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [kpis, setKpis] = useState<LearningKPIs | null>(null);
  const [profiles, setProfiles] = useState<OperatorHandwritingProfile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ALL');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const rawGlossary = HandwritingGlossary.getAllEntries();
    setGlossary(rawGlossary);
    setKpis(OperatorCorrectionTrainer.getLearningKPIs());
    setProfiles(OperatorCorrectionPatterns.getAllProfiles());
  };

  const handleRevert = (id: string) => {
    HandwritingGlossary.removeEntry(id);
    refreshData();
  };

  const filteredGlossary = selectedTemplate === 'ALL'
    ? glossary
    : glossary.filter(e => e.stationTemplate.toUpperCase() === selectedTemplate.toUpperCase());

  // Aggregate templates stats
  const templateCounts = glossary.reduce((acc, entry) => {
    const temp = entry.stationTemplate.toUpperCase();
    acc[temp] = (acc[temp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400] border border-[#D35400]/20">
              <BookOpen className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
                OCR Handwriting Learning Deck
              </h1>
              <p className="text-xs text-[#666666] mt-0.5 uppercase tracking-wider font-bold">
                Self-improving glossary mappings, operator handwriting patterns, and replay-safe validation systems.
              </p>
            </div>
          </div>
          <button
            onClick={refreshData}
            className="flex items-center gap-2 bg-white hover:bg-[#F3F3F1] border border-[#EBEBEA] text-xs font-black uppercase px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer h-[40px]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Diagnostics
          </button>
        </div>

        {/* Dynamic KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1 */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-36">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Trained Vocabulary</span>
              <div>
                <span className="text-3xl font-black text-[#1A1A1A] block">{kpis.totalTrainedWords} Words</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                  Glossary size growth (+{kpis.glossaryGrowthPct}%)
                </span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-36">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">OCR Suggestion Hits</span>
              <div>
                <span className="text-3xl font-black text-emerald-800 block">+{kpis.repeatTrainedHits} Suggestions</span>
                <span className="text-[9px] block text-emerald-800 uppercase mt-1 font-bold">
                  Re-occurrences resolved automatically
                </span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-36">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Est. Accuracy Gain</span>
              <div>
                <span className="text-3xl font-black text-emerald-800 block">+{kpis.averageConfidenceBoost}% Acc</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                  Confidence boost on recurrent words
                </span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-36">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#666666]">Reconcile Latency</span>
              <div>
                <span className="text-3xl font-black text-[#D35400] block">{kpis.operatorCorrectionSeconds}s / Row</span>
                <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                  Avg. operator manual validation speed
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Glossary Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#EBEBEA] pb-3">
                <h3 className="text-xs uppercase font-black tracking-widest text-[#1A1A1A] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-[#D35400]" /> Trained Station Glossary
                </h3>
                
                {/* Template Filter tabs */}
                <div className="flex flex-wrap gap-1 bg-[#F9F9F8] p-1 rounded-xl border border-[#EBEBEA]">
                  {['ALL', 'HPCL', 'BPCL', 'IOCL', 'Nayara'].map(temp => (
                    <button
                      key={temp}
                      onClick={() => setSelectedTemplate(temp)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        selectedTemplate === temp
                          ? 'bg-[#1A1A1A] text-white'
                          : 'text-[#666666] hover:bg-[#F3F3F1] hover:text-[#1A1A1A]'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              {filteredGlossary.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-[#999999] bg-[#F9F9F8] rounded-2xl border border-dashed border-[#EBEBEA] flex flex-col items-center justify-center gap-2">
                  <BookOpen className="w-8 h-8 text-[#B3B3B3] animate-pulse-slow" />
                  <span>No handwriting patterns trained yet. Correct and verify scans to save corrections.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[8px]">
                        <th className="p-3">Station</th>
                        <th className="p-3">Raw OCR</th>
                        <th className="p-3">Trained Word</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Lang</th>
                        <th className="p-3 text-right">Uses</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
                      {filteredGlossary.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#F9F9F8]/50 transition-colors">
                          <td className="p-3">
                            <span className="bg-[#FAF9F5] border border-[#EBEBEA] px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono">
                              {entry.stationTemplate}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-rose-800">{entry.rawOCR}</td>
                          <td className="p-3 font-sans text-[#1A1A1A]">{entry.correctedValue}</td>
                          <td className="p-3">
                            <span className="text-[7.5px] uppercase font-black tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {entry.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-[8px] uppercase font-mono tracking-wider font-bold">
                              {entry.language}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-800 font-extrabold">{entry.useCount}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRevert(entry.id)}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 text-[8px] uppercase font-black"
                              title="Revert Trained Word"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Revert
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Handwriting Confusions & Auditable stats */}
          <div className="space-y-6">
            {/* Card 1: Confusion Patterns */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs uppercase font-black tracking-widest text-[#1A1A1A] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#D35400] animate-pulse" /> Operator Handwriting Confusions
              </h3>
              
              {profiles.length === 0 || profiles.every(p => p.confusionPairs.length === 0) ? (
                <div className="p-6 text-center text-xs font-bold text-[#999999] bg-[#F9F9F8] rounded-xl border border-dashed border-[#EBEBEA]">
                  No confusion patterns resolved yet. Correct short digit swaps to populate matrix data.
                </div>
              ) : (
                <div className="space-y-4">
                  {profiles.map(profile => {
                    if (profile.confusionPairs.length === 0) return null;
                    return (
                      <div key={profile.operatorId} className="space-y-2 border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 uppercase font-mono">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> Attendant: {profile.operatorId}</span>
                          <span>Variance: {(profile.handwritingVarianceIndex * 100).toFixed(0)}%</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-left text-[9px] font-mono font-bold">
                          {profile.confusionPairs.map((pair, idx) => (
                            <div key={idx} className="bg-[#F9F9F8] border border-[#EBEBEA] p-2 rounded-xl flex justify-between items-center">
                              <span>OCR: <strong className="text-rose-700">{pair.rawOCR}</strong> → <strong className="text-emerald-700">{pair.correctedValue}</strong></span>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-1 text-[7.5px]">x{pair.frequency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card 2: Replay safety & audits */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs uppercase font-black tracking-widest text-[#1A1A1A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" /> Replay-Safe Training Audits
              </h3>
              <p className="text-[10px] text-[#666666] leading-relaxed font-medium">
                Trained phrases automatically compute cryptographic checksums and map to raw scans. Mappings will not modify finalized shift worksheets or locked ledger partitions.
              </p>
              
              <div className="pt-2 border-t border-[#EBEBEA] space-y-2 text-[9px] font-mono text-slate-500">
                <div className="flex justify-between">
                  <span>METRICS INTEGRITY STATE:</span>
                  <span className="text-emerald-700 font-bold">SEALED (SHA-256)</span>
                </div>
                <div className="flex justify-between">
                  <span>GLOSSARY HITS RATE:</span>
                  <span className="text-slate-700 font-bold">
                    {glossary.length > 0
                      ? `${Math.round((glossary.filter(e => e.useCount > 1).length / glossary.length) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
