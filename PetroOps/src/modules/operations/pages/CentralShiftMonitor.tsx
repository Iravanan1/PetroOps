import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, CheckCircle, Wifi, WifiOff, 
  HelpCircle, ChevronRight, Activity, Smartphone
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { EscalationEngine, SystemAlarm } from '../EscalationEngine';

interface LiveStationShift {
  stationId: string;
  name: string;
  online: boolean;
  offlineHours: number;
  activeShift: ShiftRecord | null;
}

export default function CentralShiftMonitor() {
  const [pipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  
  const [stationShifts, setStationShifts] = useState<LiveStationShift[]>([]);
  const [alarms, setAlarms] = useState<SystemAlarm[]>([]);

  useEffect(() => {
    if (shifts.length > 0) {
      // Construct comparative live shifts roster for multiple mock stations
      setStationShifts([
        { stationId: 'pune', name: 'Pune Highway Potaliya', online: true, offlineHours: 0, activeShift: shifts[0] },
        { stationId: 'mumbai', name: 'Mumbai Terminal Branch', online: false, offlineHours: 18.5, activeShift: { ...shifts[0], shiftLabel: 'Commercial Night Shift', actualCash: 12420, upiSales: 15400, cashShortage: 2450 } },
        { stationId: 'delhi', name: 'Delhi Central Pump', online: true, offlineHours: 0, activeShift: { ...shifts[0], shiftLabel: 'Retail Morning Shift', actualCash: 38940, upiSales: 19100 } }
      ]);

      // Analyze and generate live alarms
      const puneAlms = EscalationEngine.analyzeTelemetry({ station: 'Pune Highway Potaliya', offlineHours: 0, wetstockVariance: -0.32, consecutiveShortages: 1, settlementMismatchesCount: 0 });
      const mumbAlms = EscalationEngine.analyzeTelemetry({ station: 'Mumbai Terminal Branch', offlineHours: 18.5, wetstockVariance: -0.92, consecutiveShortages: 3, settlementMismatchesCount: 1 });
      const delhAlms = EscalationEngine.analyzeTelemetry({ station: 'Delhi Central Pump', offlineHours: 0, wetstockVariance: -0.15, consecutiveShortages: 0, settlementMismatchesCount: 0 });
      
      setAlarms([...puneAlms, ...mumbAlms, ...delhAlms]);
    }
  }, [shifts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center text-xs font-mono font-bold text-[#666666]">
        <span>Loading live network monitors...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Live health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live shifts grid */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D35400] animate-pulse" /> Live Station Registers
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stationShifts.map((stn, idx) => (
              <div key={idx} className="border border-[#EBEBEA] rounded-2xl p-5 bg-white space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-black text-[#1A1A1A]">{stn.name}</h5>
                    <span className="text-[9px] text-[#666666] font-mono mt-0.5">Status: {stn.online ? 'Online Syncing' : `Offline ${stn.offlineHours} hours`}</span>
                  </div>

                  {stn.online ? (
                    <Wifi className="w-5 h-5 text-emerald-600 animate-pulse" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-rose-600" />
                  )}
                </div>

                {stn.activeShift ? (
                  <div className="bg-[#F9F9F8] border border-[#EBEBEA] p-4 rounded-xl space-y-2 text-xs font-bold">
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#666666] block">Active Shift detail</span>
                    <div className="flex justify-between text-[#1A1A1A]">
                      <span className="font-semibold">{stn.activeShift.shiftLabel}</span>
                      <span>₹{stn.activeShift.actualCash.toLocaleString()} cash</span>
                    </div>
                    {stn.activeShift.cashShortage > 0 && (
                      <div className="flex justify-between text-rose-700 text-[10px] font-black">
                        <span>Shortage reported:</span>
                        <span>₹{stn.activeShift.cashShortage.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#999999] italic bg-[#F9F9F8] rounded-xl border border-dashed border-[#D9D9D6]">
                    No active shift register logged
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alarms and notifications escalation pane */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-700" /> Operational Alert Alarms
          </h4>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {alarms.map(alarm => (
              <div 
                key={alarm.id}
                className={`p-4 border rounded-2xl space-y-2 text-xs ${
                  alarm.priority === 'CRITICAL'
                    ? 'bg-rose-50 border-rose-100 text-rose-950 animate-pulse-slow'
                    : 'bg-amber-50 border-amber-100 text-amber-950'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-white/60 px-1.5 py-0.5 rounded border border-black/10 block w-max">{alarm.source}</span>
                    <h5 className="text-[10px] font-black text-[#1A1A1A] mt-1">{alarm.station}</h5>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                    alarm.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>{alarm.priority}</span>
                </div>

                <p className="text-[10px] leading-relaxed font-bold">{alarm.message}</p>
                <span className="block text-[8px] text-[#666666] font-mono text-right">{alarm.triggeredAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
