import React from 'react';
import { 
  CheckCircle, ShieldAlert, Award, ChevronRight, Activity, HelpCircle 
} from 'lucide-react';

export interface DiagnosticsItem {
  id: string;
  name: string;
  category: 'AUTH' | 'COMPLIANCE' | 'RECONCILIATION' | 'BACKUPS';
  description: string;
  passed: boolean;
}

interface FinalValidationChecklistProps {
  items: DiagnosticsItem[];
  onTriggerCheck: (id: string) => void;
}

export default function FinalValidationChecklist({
  items,
  onTriggerCheck
}: FinalValidationChecklistProps) {
  return (
    <div className="border border-[#EBEBEA] rounded-2xl p-6 bg-white shadow-xs space-y-4">
      <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666] flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-[#D35400] animate-pulse" /> Diagnostic Rollout Readiness Checklist
      </h3>
      
      <div className="divide-y divide-[#EBEBEA] font-sans font-bold text-[#1A1A1A]">
        {items.map((item) => (
          <div 
            key={item.id}
            className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                  item.passed
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-800 animate-pulse-slow'
                }`}>{item.category}</span>
                <span className="text-xs font-black text-[#1A1A1A]">{item.name}</span>
              </div>
              <span className="block text-[10px] text-[#666666] leading-relaxed block font-medium">{item.description}</span>
            </div>

            <button
              onClick={() => onTriggerCheck(item.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                item.passed
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-[#1A1A1A] hover:bg-[#333] text-white'
              }`}
            >
              {item.passed ? 'Verified' : 'Verify'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
