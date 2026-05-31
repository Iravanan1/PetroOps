import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, CheckSquare, MessageSquare, Search, 
  HelpCircle, ChevronRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import { EscalationEngine, SystemAlarm } from '../EscalationEngine';

export default function OperationalAlertsHub() {
  const [alarms, setAlarms] = useState<SystemAlarm[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  useEffect(() => {
    setAlarms(EscalationEngine.getMockAlarms());
  }, []);

  const handleMuteAlarm = (id: string) => {
    setAlarms(prev => prev.map(al => {
      if (al.id === id) {
        return {
          ...al,
          isEscalated: false,
          message: `[Handled] ${al.message}`
        };
      }
      return al;
    }));
    alert('Operational alarm marked as Handled! Details logged in daily audit summaries.');
  };

  const filteredAlarms = alarms.filter(al => {
    if (filter === 'ALL') return true;
    return al.priority === filter;
  });

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Filters heading controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBEBEA] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#666666]">Alert Severity:</span>
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase ${
                filter === tab
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F9F9F8] text-[#666666] hover:bg-[#EBEBEA]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid listing alarms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlarms.map(al => (
          <div 
            key={al.id}
            className={`p-5 border rounded-2xl flex flex-col justify-between h-48 transition-all ${
              al.priority === 'CRITICAL'
                ? 'bg-rose-50 border-rose-100 text-rose-950'
                : 'bg-amber-50 border-amber-100 text-amber-950'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex justify-between items-start">
                <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                  al.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>{al.priority}</span>
                <span className="text-[9px] font-mono text-[#666666]">{al.triggeredAt}</span>
              </div>

              <h5 className="text-xs font-black text-[#1A1A1A] line-clamp-1">{al.station}</h5>
              <p className="text-[10px] leading-relaxed font-bold text-[#1A1A1A]">{al.message}</p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-black/10">
              <span className="text-[9px] font-mono font-bold text-[#666666]">Source: {al.source}</span>
              {al.message.startsWith('[Handled]') ? (
                <span className="text-[9px] text-emerald-700 font-extrabold">Resolved</span>
              ) : (
                <button
                  onClick={() => handleMuteAlarm(al.id)}
                  className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-[9px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Resolve Alert
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
