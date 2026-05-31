/**
 * OperationsHealthPanel.tsx
 * ──────────────────────────
 * Light, highly readable, touch-friendly hardware and sync HUD dashboard.
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, RefreshCw, Printer, 
  Cpu, Wifi, WifiOff, RefreshCcw, HardDrive 
} from 'lucide-react';
import { OfflineRecoveryEngine, SyncEngineStatus } from '../../shared/OfflineRecoveryEngine';
import { printerHardeningLayer } from '../../hardware/PrinterHardeningLayer';
import { hardwareHealthMonitor, HealthSummary } from '../../hardware/HardwareHealthMonitor';

export default function OperationsHealthPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(
    OfflineRecoveryEngine.getInstance().getStatus()
  );
  
  const [printerStatus, setPrinterStatus] = useState(
    printerHardeningLayer.getStatus()
  );

  const [hardwareSummary, setHardwareSummary] = useState<HealthSummary>(
    hardwareHealthMonitor.getSummary()
  );

  // Poll state updates
  useEffect(() => {
    // 1. Subscribe to Offline recovery updates
    const unsubscribeSync = OfflineRecoveryEngine.getInstance().subscribe(setSyncStatus);

    // 2. Poll printer & hardware health monitor summaries every 2 seconds
    const interval = setInterval(() => {
      setPrinterStatus(printerHardeningLayer.getStatus());
      setHardwareSummary(hardwareHealthMonitor.getSummary());
    }, 2000);

    return () => {
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  const handleForceSync = () => {
    OfflineRecoveryEngine.getInstance().triggerImmediateSync();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      
      {/* 1. Sync & Reconnect Health */}
      <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider flex items-center gap-1.5">
            {syncStatus.isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-600 animate-pulse" />
            )}
            Cloud Sync Pipeline
          </h3>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
            syncStatus.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="py-2.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-2xl font-black text-[#1A1A1A]">
              {syncStatus.pendingCount}
            </span>
            <span className="text-[9px] block text-[#666666] uppercase mt-0.5 font-bold">
              Unsynced Entries
            </span>
          </div>
          {syncStatus.pendingCount > 0 && (
            <button 
              onClick={handleForceSync}
              className="p-2 bg-[#D35400]/10 hover:bg-[#D35400]/20 rounded-xl text-[#D35400] transition-colors min-h-[44px] min-w-[44px]"
            >
              <RefreshCcw className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        <div className="text-[10px] text-[#666666] leading-relaxed">
          {syncStatus.isFlushing ? (
            <span className="text-amber-600 font-bold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Flushing transactions safely...
            </span>
          ) : syncStatus.pendingCount > 0 ? (
            'Connection interrupted. Buffering entries locally. Duplicate prevention active.'
          ) : (
            '✔ All local ledger entries are perfectly synchronized with primary dealer portal.'
          )}
        </div>
      </div>

      {/* 2. ESC/POS Spooler Status */}
      <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-[#D35400]" /> ESC/POS Print Queue
          </h3>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
            printerStatus.online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {printerStatus.online ? 'ONLINE' : 'STANDBY'}
          </span>
        </div>

        <div className="py-2.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-2xl font-black text-[#1A1A1A]">
              {printerStatus.queueDepth}
            </span>
            <span className="text-[9px] block text-[#666666] uppercase mt-0.5 font-bold">
              Jobs In Buffer
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#1A1A1A] block">
              {printerStatus.paperOk ? 'Paper Roll: OK' : 'PAPER OUT ⚠'}
            </span>
            <span className="text-[9px] text-[#666666] block mt-0.5 font-bold">
              SPOOL STATUS
            </span>
          </div>
        </div>

        <div className="text-[10px] text-[#666666] leading-relaxed">
          Supports 80mm silent serial spoolers and 58mm compact fallback drivers. Reprinting active.
        </div>
      </div>

      {/* 3. Petroleum Hardware Status */}
      <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-600" /> Vitals & Sensors
          </h3>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {hardwareSummary.networkHealthPct}% HEALTH
          </span>
        </div>

        <div className="py-2.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-2xl font-black text-[#1A1A1A]">
              {hardwareSummary.criticalAnomalies}
            </span>
            <span className="text-[9px] block text-[#666666] uppercase mt-0.5 font-bold text-rose-600">
              Active Alerts
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#1A1A1A] block">
              {hardwareSummary.avgNetworkLatencyMs}ms
            </span>
            <span className="text-[9px] text-[#666666] block mt-0.5 font-bold">
              AVG LATENCY
            </span>
          </div>
        </div>

        <div className="text-[10px] text-[#666666] leading-relaxed">
          Monitoring Orpak FCC loops, TLS-450 ATG gauges, and POS network sockets continuously.
        </div>
      </div>

    </div>
  );
}
