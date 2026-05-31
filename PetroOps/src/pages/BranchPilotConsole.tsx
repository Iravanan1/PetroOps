/**
 * BranchPilotConsole.tsx
 * High-density operational management cockpit for multi-tenant deployment,
 * offline synchronization, and state recovery auditing.
 */

import React, { useState, useEffect } from "react";
import { 
  Wifi, WifiOff, RefreshCw, Database, RotateCcw, ShieldCheck, 
  AlertTriangle, FileText, CheckCircle, PlusCircle, Trash2, ArrowUpRight
} from "lucide-react";
import { BranchPilotDeploymentEngine, type BranchProfile } from "../modules/deployment/services/BranchPilotDeploymentEngine";
import { OfflineBranchSyncEngine, type SyncItem, type SyncTelemetry } from "../modules/deployment/services/OfflineBranchSyncEngine";
import { ProductionBackupScheduler, type BackupItem } from "../modules/deployment/services/ProductionBackupScheduler";

export default function BranchPilotConsole() {
  const branchId = "branch_central_hq_9";
  
  const [profile, setProfile] = useState<BranchProfile | null>(null);
  const [syncTelemetry, setSyncTelemetry] = useState<SyncTelemetry | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    const handleStatus = () => {
      setNetworkOnline(navigator.onLine);
      updateTelemetry();
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const loadAllData = () => {
    const prof = BranchPilotDeploymentEngine.getBranchProfile(branchId);
    setProfile(prof);
    setSyncQueue(OfflineBranchSyncEngine.getQueue());
    setBackups(ProductionBackupScheduler.getBackups());
    updateTelemetry();
  };

  const updateTelemetry = () => {
    setSyncTelemetry(OfflineBranchSyncEngine.getTelemetry());
  };

  const triggerToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleSyncTrigger = async () => {
    setIsProcessingSync(true);
    try {
      await OfflineBranchSyncEngine.triggerSync();
      loadAllData();
      triggerToast("Background queue synchronization completed successfully.");
    } catch (e: any) {
      triggerToast(e?.message || "Sync pipeline error.", true);
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handlePurgeQueue = () => {
    OfflineBranchSyncEngine.purgeCompleted();
    loadAllData();
    triggerToast("Completed transaction buffers successfully purged.");
  };

  const handleCreateBackup = () => {
    try {
      const backup = ProductionBackupScheduler.createSnapshot(branchId, "hourly");
      loadAllData();
      triggerToast(`Encrypted base64 incremental snapshot successfully serialized: ${backup.checksum}`);
    } catch (e: any) {
      triggerToast(e?.message || "Backup failed.", true);
    }
  };

  const handleRollback = (backupId: string) => {
    if (!window.confirm("CRITICAL WARNING: You are initiating a full database state rollback. This will overwrite active parameters with this backup snapshot. Proceed?")) {
      return;
    }
    try {
      ProductionBackupScheduler.executeRollback(backupId);
      loadAllData();
      triggerToast("System state rolled back successfully. Nozzle meters and offline queues restored.");
    } catch (e: any) {
      triggerToast(e?.message || "Rollback execution failed.", true);
    }
  };

  const handleMockEnqueue = (type: "ocr_ingest" | "shift_log" | "cash_sheet" | "dip_record") => {
    let payload: any = {};
    if (type === "ocr_ingest") {
      payload = { fileName: `log_sheet_scan_${Date.now()}.png`, scanQualityGrade: "A", ocrRawOutput: "Meters Read: 120594.30" };
    } else if (type === "shift_log") {
      payload = { branchId, closingAmount: 18450.00, shiftCode: "MH_SHIFT_NIGHT", timestamp: Date.now() };
    } else if (type === "cash_sheet") {
      payload = { denominationCounts: { "2000": 5, "500": 20, "200": 10 }, totalCash: 17000.00 };
    } else if (type === "dip_record") {
      payload = { tankId: "tank_ms_01", physicalDip: 14500.20, waterLevel: 2.0 };
    }

    try {
      const item = OfflineBranchSyncEngine.enqueue(type, payload);
      loadAllData();
      triggerToast(`Transaction enqueued cleanly. Idempotency stamp: ${item.idempotencyKey}`);
    } catch (e: any) {
      triggerToast(e?.message || "Queue injection failed.", true);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 p-8 flex flex-col gap-8">
      
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="text-emerald-400 w-5 h-5" />
          <span className="text-sm font-medium text-emerald-200">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-rose-950/90 border border-rose-500/50 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <AlertTriangle className="text-rose-400 w-5 h-5" />
          <span className="text-sm font-medium text-rose-200">{errorMsg}</span>
        </div>
      )}

      {/* Header Viewport */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-950/50 border border-blue-900 px-3 py-1 rounded-full">
            Phase 1: Deployment & Offline Sync Control
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
            Multi-Tenant Branch Pilot Console
          </h1>
        </div>

        {/* Action Triggers */}
        <div className="flex gap-3">
          <button 
            onClick={handleCreateBackup}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
          >
            <Database className="w-4 h-4 text-purple-400" />
            Incremental Backup
          </button>
          
          <button 
            onClick={handleSyncTrigger}
            disabled={isProcessingSync || !networkOnline}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessingSync ? "animate-spin" : ""}`} />
            Trigger Cloud Sync
          </button>
        </div>
      </div>

      {/* Vitals Diagnostics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Network sync status card */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Network Connectivity</span>
            <span className="text-lg font-bold">{networkOnline ? "Online (Cloud Connected)" : "Offline (Local Queue Active)"}</span>
          </div>
          <div>
            {networkOnline ? (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl">
                <Wifi className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
            ) : (
              <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl">
                <WifiOff className="w-6 h-6 text-rose-400" />
              </div>
            )}
          </div>
        </div>

        {/* Sync queue depth */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Queue Sync Depth</span>
            <span className="text-lg font-bold">{syncTelemetry?.pendingItems || 0} Transactions</span>
          </div>
          <div className="p-3 bg-blue-950/50 border border-blue-900 rounded-xl">
            <RefreshCw className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        {/* Archival backup count */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Archival Snapshots</span>
            <span className="text-lg font-bold">{backups.length} points</span>
          </div>
          <div className="p-3 bg-purple-950/50 border border-purple-900 rounded-xl">
            <Database className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        {/* Security / OMC branding card */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Station Profile OMC</span>
            <span className="text-lg font-bold">{profile?.omc || "HPCL"} Pilot Branch</span>
          </div>
          <div className="p-3 bg-emerald-950/50 border border-emerald-900 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* Main configuration grids */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* PANEL 1: Active Branch Profile details */}
        <div className="xl:col-span-1 p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-6">
          <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Active OMC Branch Parameters
            </h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              {profile?.branchId}
            </span>
          </div>

          {profile && (
            <div className="flex flex-col gap-6">
              <div>
                <span className="text-xs text-slate-400">Station Identity</span>
                <p className="text-base font-bold text-slate-200 mt-0.5">{profile.name}</p>
              </div>

              {/* Nozzles Layout Status */}
              <div>
                <span className="text-xs text-slate-400 block mb-2 font-semibold">Active Nozzles Configuration</span>
                <div className="flex flex-col gap-2">
                  {profile.nozzleLayouts.map(nozzle => (
                    <div key={nozzle.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{nozzle.name}</p>
                        <span className="text-[10px] text-blue-400 bg-blue-950/50 border border-blue-900 px-1.5 py-0.2 rounded mt-1 inline-block">
                          {nozzle.productType} (Tank: {nozzle.tankId})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-300">{nozzle.currentMeter.toFixed(2)} L</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tank Volumetric Capacities */}
              <div>
                <span className="text-xs text-slate-400 block mb-2 font-semibold">Tank Capacities & Dipping Logs</span>
                <div className="flex flex-col gap-2">
                  {profile.tanks.map(tank => {
                    const ratio = tank.currentDip / tank.capacity;
                    return (
                      <div key={tank.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-semibold text-slate-300">{tank.name}</p>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {tank.currentDip.toFixed(2)} / {tank.capacity} L
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                            style={{ width: `${Math.min(100, ratio * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Standard Density: {tank.densityStandard} kg/m³</span>
                          <span>Water Level: {tank.currentWaterLevel} mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Authorized Personnel */}
              <div>
                <span className="text-xs text-slate-400 block mb-2 font-semibold">Authorized Supervisors Access</span>
                <div className="flex flex-wrap gap-2">
                  {profile.authorizedSupervisors.map(sup => (
                    <span key={sup.id} className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {sup.name} ({sup.role})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Synchronization Ledger Queue */}
        <div className="xl:col-span-2 p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-6">
          <div className="pb-3 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Transaction Sync Ingestion Buffer
              </h2>
              <p className="text-xs text-slate-500 mt-1">FIFO sequencing database. Injects data updates when connectivity is restored.</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handlePurgeQueue}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Purge Completed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Test Injectors UI */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col gap-3">
            <span className="text-xs text-slate-400 font-semibold uppercase">Inject Mock Transactions (Offline Simulation)</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button 
                onClick={() => handleMockEnqueue("ocr_ingest")}
                className="flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                OCR Ingest
              </button>
              <button 
                onClick={() => handleMockEnqueue("shift_log")}
                className="flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                Shift Log
              </button>
              <button 
                onClick={() => handleMockEnqueue("cash_sheet")}
                className="flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                Cash Sheet
              </button>
              <button 
                onClick={() => handleMockEnqueue("dip_record")}
                className="flex items-center justify-center gap-1.5 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Dip Record
              </button>
            </div>
          </div>

          {/* Queue Ledger */}
          <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-900 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-900 text-xs text-slate-400 uppercase font-mono">
                  <th className="p-3">Idempotency Key</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Payload Details</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Retries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                {syncQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                      Ingestion sync queue currently empty. Use the injectors above to simulate offline data capture events.
                    </td>
                  </tr>
                ) : (
                  [...syncQueue].reverse().map(item => (
                    <tr key={item.id} className="hover:bg-slate-950/25">
                      <td className="p-3 font-mono text-slate-400">{item.idempotencyKey}</td>
                      <td className="p-3 font-semibold uppercase">{item.type}</td>
                      <td className="p-3">
                        <span className="font-mono text-slate-400 block max-w-[200px] truncate" title={JSON.stringify(item.payload)}>
                          {JSON.stringify(item.payload)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          item.status === "completed" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" :
                          item.status === "failed" ? "bg-rose-950/50 text-rose-400 border border-rose-900" :
                          item.status === "syncing" ? "bg-blue-950/50 text-blue-400 border border-blue-900 animate-pulse" :
                          "bg-slate-900 text-slate-400"
                        }`}>
                          {item.status}
                        </span>
                        {item.errorMessage && (
                          <span className="block text-[10px] text-rose-400 mt-1">{item.errorMessage}</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{item.retryCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Incremental Backups & Database Rollbacks Workspace */}
      <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Encrypted Backups & Disaster Rollback Audits
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Increments are automatically compiled locally. Running rollbacks restores active branch profiles and transaction buffers cleanly.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-900 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-xs text-slate-400 uppercase font-mono">
                <th className="p-3">Backup ID</th>
                <th className="p-3">Trigger Mode</th>
                <th className="p-3 font-mono">Checksum</th>
                <th className="p-3">Buffer Size</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                    No incremental snapshots currently serialized. Use "Incremental Backup" above to capture state.
                  </td>
                </tr>
              ) : (
                [...backups].reverse().map(backup => (
                  <tr key={backup.id} className="hover:bg-slate-950/25">
                    <td className="p-3 font-semibold text-slate-300">{backup.id}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-850 border border-slate-800 text-slate-400 rounded uppercase">
                        {backup.backupType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-purple-400">{backup.checksum}</td>
                    <td className="p-3 font-mono">{backup.payloadSize} bytes</td>
                    <td className="p-3 font-mono text-slate-400">{new Date(backup.timestamp).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleRollback(backup.id)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-800 rounded-lg cursor-pointer mx-auto transition-colors font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Execute Rollback
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
