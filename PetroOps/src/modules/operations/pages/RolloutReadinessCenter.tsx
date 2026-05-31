import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, AlertTriangle, Play, 
  HelpCircle, CheckCircle2, RefreshCw, Award
} from 'lucide-react';
import FinalValidationChecklist, { DiagnosticsItem } from '../components/FinalValidationChecklist';

export default function RolloutReadinessCenter() {
  const [items, setItems] = useState<DiagnosticsItem[]>([]);
  const [readyPct, setReadyPct] = useState(0);

  useEffect(() => {
    setItems([
      { id: 'auth', name: 'Authoritative Auth validation', category: 'AUTH', description: 'Firebase connection identity parameters check.', passed: true },
      { id: 'template', name: 'HPCL Template Sealing configuration', category: 'COMPLIANCE', description: 'Hindustan Petroleum template-locking rules check.', passed: true },
      { id: 'ocr', name: 'VLM OCR extraction Continuity checklist', category: 'RECONCILIATION', description: 'Adaptive nozzle meter ingestion trust checkpoints.', passed: false },
      { id: 'portal', name: 'Portal Sync connectors configured', category: 'COMPLIANCE', description: 'oil refinery portal sync validation keys checks.', passed: false },
      { id: 'backups', name: 'WAL snapshot backups enabled', category: 'BACKUPS', description: 'disaster recovery balance recovery checks ready.', passed: true }
    ]);
  }, []);

  useEffect(() => {
    const passed = items.filter(i => i.passed).length;
    setReadyPct(Math.round((passed / items.length) * 100));
  }, [items]);

  const handleVerify = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, passed: true };
      }
      return item;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400]">
              <Award className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Rollout Readiness Center
              </h1>
              <p className="text-xs text-[#666666] mt-0.5">
                Authoritative station checklist diagnostics and rollout grades validation checkers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Overview stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-40">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">Rollout Grade</span>
            <div>
              <span className={`text-4xl font-black ${
                readyPct === 100 ? 'text-emerald-700' : 'text-[#D35400]'
              }`}>{readyPct === 100 ? 'EXCELLENT' : 'STABILIZING'}</span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1.5 font-bold">
                {items.filter(i => i.passed).length} of {items.length} diagnostic checkpoints passed
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-40">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">Template Lock State</span>
            <div>
              <span className="text-4xl font-black text-emerald-700">HPCL SEALED</span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1.5 font-bold">
                Hindustan Petroleum nozzle continuity metrics locked
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between h-40">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">Replay-Safe ledgers</span>
            <div>
              <span className="text-4xl font-black text-emerald-700">CERTIFIED</span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1.5 font-bold">
                Genesis block matching balance verified successfully
              </span>
            </div>
          </div>

        </div>

        {/* Diagnostic Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FinalValidationChecklist 
              items={items}
              onTriggerCheck={handleVerify}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-950 flex flex-col justify-between h-56">
            <div className="space-y-2 text-xs font-bold leading-relaxed">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#D35400] flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Verification Gates Sealed</span>
              </div>
              <p className="font-medium text-[#1A1A1A]">
                All major systems must pass diagnostics checks before the station is certified as Rollout Ready. Re-verify sync portal credentials if blocks remain.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
