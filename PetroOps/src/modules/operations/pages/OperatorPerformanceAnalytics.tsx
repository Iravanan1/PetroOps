/**
 * OperatorPerformanceAnalytics.tsx
 * ────────────────────────────────
 * Attendant trust metric summaries, shortage frequencies, and manual override tracking.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, ShieldAlert, Award, Timer, ShieldCheck } from 'lucide-react';

interface OperatorTrustProfile {
  id: string;
  name: string;
  trustScore: number; // 0 to 100
  shortageCount: number;
  totalShortageValue: number;
  overrideFrequency: number; // count per shift
  reconAccuracyPct: number;
  status: 'OPTIMAL' | 'MONITOR' | 'ACTION_REQUIRED';
}

export default function OperatorPerformanceAnalytics() {
  const navigate = useNavigate();
  const [profiles] = useState<OperatorTrustProfile[]>([
    { id: 'op-01', name: 'Ramesh Attendant', trustScore: 92, shortageCount: 1, totalShortageValue: 150, overrideFrequency: 0.8, reconAccuracyPct: 99.1, status: 'OPTIMAL' },
    { id: 'op-02', name: 'Suresh Kumar', trustScore: 84, shortageCount: 2, totalShortageValue: 350, overrideFrequency: 1.5, reconAccuracyPct: 98.4, status: 'OPTIMAL' },
    { id: 'op-03', name: 'Dinesh Sharma', trustScore: 58, shortageCount: 6, totalShortageValue: 1850, overrideFrequency: 4.2, reconAccuracyPct: 91.2, status: 'ACTION_REQUIRED' }
  ]);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/owner')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO OWNER CENTER
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EBEBEA]">
          <div className="bg-[#D35400]/10 p-2.5 rounded-2xl text-[#D35400]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Operator Performance</h1>
            <p className="text-xs text-[#666666] mt-0.5">Audit attendant shortages, reconciliation accuracy indices, and trust ratings.</p>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profiles.map(op => (
            <div key={op.id} className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-[#1A1A1A]">{op.name}</h3>
                  <span className="text-[9px] text-[#666666] font-mono block mt-0.5">ID: {op.id}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  op.status === 'OPTIMAL' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {op.status}
                </span>
              </div>

              <div className="py-3 px-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex justify-between items-center">
                <div>
                  <span className={`text-3xl font-black ${op.trustScore > 80 ? 'text-emerald-700' : op.trustScore > 60 ? 'text-[#D35400]' : 'text-[#C62828]'}`}>
                    {op.trustScore}%
                  </span>
                  <span className="text-[8.5px] block text-[#666666] uppercase mt-0.5 font-bold">Trust Rating</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#1A1A1A] block">₹{op.totalShortageValue.toLocaleString()}</span>
                  <span className="text-[8.5px] text-[#666666] block mt-0.5 font-bold">TOTAL SHORTAGE</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-xs font-bold text-[#1A1A1A]">
                <div className="flex justify-between border-b border-[#EBEBEA] pb-1.5">
                  <span className="text-[#666666]">Reconcile Accuracy</span>
                  <span>{op.reconAccuracyPct}%</span>
                </div>
                <div className="flex justify-between border-b border-[#EBEBEA] pb-1.5">
                  <span className="text-[#666666]">Manual Overrides</span>
                  <span>{op.overrideFrequency}/shift</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Shortage Frequency</span>
                  <span>{op.shortageCount} shift(s)</span>
                </div>
              </div>

              {op.status === 'ACTION_REQUIRED' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-[#C62828] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-black text-[#C62828] uppercase">Audit Action Recommended</h5>
                    <p className="text-[9px] text-[#666666] mt-0.5 leading-relaxed">
                      Frequent cash shortages and manual overrides detected. Verify opening meters in tomorrow's shift.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
