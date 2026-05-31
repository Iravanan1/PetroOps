/**
 * OperationalAlertsCenter.tsx
 * ─────────────────────────────
 * Actionable operational alert deck displaying prioritized warnings (evaporation spikes,
 * digital gaps, overdue collections, sequence gaps) with supervisor resolution comment controls.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, AlertTriangle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface PriorityAlert {
  id: string;
  category: 'WETSTOCK' | 'OPERATOR' | 'CREDIT' | 'UPI';
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  resolved: boolean;
}

export default function OperationalAlertsCenter() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PriorityAlert[]>([
    { id: 'al-01', category: 'WETSTOCK', title: 'Wetstock Variance Exceeds EVAP limits', message: 'Evaporative shrinkage in HSD Tank 2 has reached -125.4L, exceeding standard limits.', priority: 'HIGH', timestamp: new Date().toLocaleTimeString(), resolved: false },
    { id: 'al-02', category: 'OPERATOR', title: 'Abnormal shortfalls on Attendant Dinesh', message: 'Cash till counted on shift SHIFT_Morning has a gap of ₹1,850.', priority: 'HIGH', timestamp: new Date().toLocaleTimeString(), resolved: false },
    { id: 'al-03', category: 'CREDIT', title: 'Customer Karanja Logistics overdue > 45 days', message: 'Outstanding balance ₹1,25,000 has breached agreed collection timelines.', priority: 'MEDIUM', timestamp: new Date().toLocaleTimeString(), resolved: false }
  ]);

  const handleResolve = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/owner')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO OWNER CENTER
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EBEBEA]">
          <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Operational Alerts Center</h1>
            <p className="text-xs text-[#666666] mt-0.5">Prioritized security, cash shortages, and wetstock leak warnings.</p>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="space-y-4">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                alert.resolved 
                  ? 'bg-white border-[#EBEBEA] opacity-60' 
                  : alert.priority === 'HIGH' 
                    ? 'bg-rose-50 border-rose-200' 
                    : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                    alert.priority === 'HIGH' ? 'bg-[#C62828] text-white' : 'bg-[#D35400] text-white'
                  }`}>
                    {alert.category} • {alert.priority}
                  </span>
                  <span className="text-[10px] text-[#666666] font-mono">{alert.timestamp}</span>
                </div>
                <h3 className="text-sm font-black text-[#1A1A1A] mt-2">{alert.title}</h3>
                <p className="text-xs text-[#666666] mt-1 leading-relaxed">{alert.message}</p>
              </div>

              {!alert.resolved ? (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl text-[10px] font-black uppercase tracking-wider min-h-[38px] shrink-0 cursor-pointer"
                >
                  Acknowledge
                </button>
              ) : (
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                </span>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
