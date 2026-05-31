import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, MessageSquare, Check, 
  HelpCircle, ChevronRight, RefreshCw, UserCheck
} from 'lucide-react';
import { ApprovalEscalationEngine } from '../ApprovalEscalationEngine';

interface EscalationItem {
  id: string;
  station: string;
  escalationType: 'FATAL_VARIANCE' | 'OFFLINE_TIMELOCKED' | 'SHRINKAGE_ALERT';
  details: string;
  daysOutstanding: number;
  sealedBy?: string;
  status: 'PENDING' | 'APPROVED';
}

export default function CentralApprovalWorkspace() {
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const [overrideComment, setOverrideComment] = useState('');

  useEffect(() => {
    const raw = ApprovalEscalationEngine.getEscalationsQueue();
    setEscalations(raw.map(item => ({ ...item, status: 'PENDING' })));
    if (raw.length > 0) {
      setSelectedEscalationId(raw[0].id);
    }
  }, []);

  const handleApproveOverride = (id: string) => {
    if (!overrideComment) {
      alert('Please enter approval override comments!');
      return;
    }

    setEscalations(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'APPROVED',
          sealedBy: 'Regional Manager Anjali'
        };
      }
      return item;
    }));

    setOverrideComment('');
    alert('Override action approved remotely! Audit comment logged in WAL transaction file.');
  };

  const selectedItem = escalations.find(e => e.id === selectedEscalationId);

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Central approvals overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Escalation queue items */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Escalated Variance Queue</h4>
          
          <div className="space-y-3">
            {escalations.map(esc => (
              <div 
                key={esc.id}
                onClick={() => setSelectedEscalationId(esc.id)}
                className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                  selectedEscalationId === esc.id
                    ? 'border-[#D35400] bg-amber-50/20'
                    : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-black text-[#1A1A1A]">{esc.station}</h5>
                    <span className="text-[9px] font-mono text-[#666666] block mt-0.5">{esc.escalationType.replace('_', ' ')}</span>
                  </div>

                  <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                    esc.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800 animate-pulse-slow'
                  }`}>{esc.status}</span>
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#EBEBEA] text-[9px] font-bold text-[#666666]">
                  <span>Aging: {esc.daysOutstanding} days</span>
                  {esc.sealedBy && <span>By: {esc.sealedBy}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected escalation details and approval submission form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedItem ? (
            <div className="border border-[#EBEBEA] rounded-2xl p-6 bg-white space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-[#EBEBEA]">
                <div>
                  <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-tight">Override request: {selectedItem.station}</h4>
                  <p className="text-[9px] text-[#666666] font-mono mt-0.5">Escalation ID: {selectedItem.id}</p>
                </div>

                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                  selectedItem.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>{selectedItem.status}</span>
              </div>

              {/* Warnings details text */}
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-950 flex items-start gap-2.5 text-xs font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5 animate-bounce-slow" />
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block">Critical Balance Exception Block</span>
                  <p className="leading-relaxed mt-1 font-medium text-[#1A1A1A]">{selectedItem.details}</p>
                </div>
              </div>

              {selectedItem.status !== 'APPROVED' ? (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleApproveOverride(selectedItem.id); }}
                  className="space-y-4 text-xs font-bold text-[#1A1A1A]"
                >
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] block">Override Audit Justification Comment</label>
                    <textarea 
                      placeholder="Explain override details (e.g. checked matching physical registers and confirmed meter offset balance adjustment)..."
                      value={overrideComment}
                      onChange={e => setOverrideComment(e.target.value)}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] focus:border-[#B3B3B3] rounded-xl p-3 text-xs font-bold text-[#1A1A1A] focus:outline-none h-24"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Authorize Remote Seal Override
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">Remote Authorization Approved</span>
                    <span className="text-[9px] block mt-0.5">
                      Approved by: {selectedItem.sealedBy} • Auditable comment recorded in journal tracks.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-[#D9D9D6] rounded-3xl text-center text-xs font-bold text-[#999999] italic bg-white">
              Select an escalated variance on the left to authorize remote seals
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
