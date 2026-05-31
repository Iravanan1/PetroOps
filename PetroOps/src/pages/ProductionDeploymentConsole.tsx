/**
 * ProductionDeploymentConsole.tsx
 * Dynamic operations console tracking branch provisionings, container security scores,
 * database sync states, and offline replication queues.
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Settings, Cloud, CloudOff, RefreshCw, Key, 
  Terminal, ShieldCheck, Cpu, Database, Plus, CheckCircle, 
  Lock, AlertTriangle, AlertCircle, ChevronRight, Check
} from "lucide-react";
import { 
  BranchProvisioningEngine, 
  BranchConfiguration 
} from "../modules/deployment/services/BranchProvisioningEngine";
import { 
  ProductionDeploymentManager, 
  SecurityAuditReport 
} from "../modules/deployment/services/ProductionDeploymentManager";
import { 
  DisasterRecoveryAuditEngine, 
  BackupRecoveryStatus, 
  OfflineTransactionPayload 
} from "../modules/deployment/services/DisasterRecoveryAuditEngine";

export default function ProductionDeploymentConsole() {
  // --- Branch Provisioning State ---
  const [branches, setBranches] = useState<BranchConfiguration[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchRegion, setNewBranchRegion] = useState("");
  const [newBranchBrand, setNewBranchBrand] = useState<"HPCL" | "IOCL" | "BPCL" | "RELIANCE">("HPCL");
  const [newBranchTax, setNewBranchTax] = useState<"GST" | "VAT">("GST");
  const [successToast, setSuccessToast] = useState("");

  // --- Security Audit State ---
  const [securityReport, setSecurityReport] = useState<SecurityAuditReport | null>(null);
  const [updaterInfo, setUpdaterInfo] = useState<{ updateAvailable: boolean; versionFetched?: string }>({ updateAvailable: false });

  // --- Disaster Recovery State ---
  const [recoveryStatus, setRecoveryStatus] = useState<BackupRecoveryStatus>({
    lastBackupTimestamp: "",
    pendingUnsyncedCount: 0,
    networkOnline: true,
    localEncryptedCacheBytes: 0,
    recoveryLogs: []
  });
  const [offlineTxns, setOfflineTxns] = useState<OfflineTransactionPayload[]>([]);
  const [simulatedAmt, setSimulatedAmt] = useState<number>(3500);

  const reloadData = () => {
    setBranches(BranchProvisioningEngine.getBranches());
    setSecurityReport(ProductionDeploymentManager.runSecurityAuditing());
    setRecoveryStatus(DisasterRecoveryAuditEngine.getRecoveryStatus());
    setOfflineTxns(DisasterRecoveryAuditEngine.getOfflineTransactions());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handlers
  const handleProvisionBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchRegion) return;

    const provisioned = BranchProvisioningEngine.provisionBranch({
      name: newBranchName,
      region: newBranchRegion,
      oilCompany: newBranchBrand,
      taxType: newBranchTax
    });

    setSuccessToast(`Successfully provisioned ${provisioned.branchId}! Isolated boundary locks initialized.`);
    setNewBranchName("");
    setNewBranchRegion("");
    reloadData();

    setTimeout(() => setSuccessToast(""), 5000);
  };

  const handleToggleNetwork = () => {
    DisasterRecoveryAuditEngine.toggleNetworkStatus();
    reloadData();
  };

  const handleTriggerSync = () => {
    const result = DisasterRecoveryAuditEngine.triggerEmergencySync();
    setSuccessToast(result.message);
    reloadData();
    setTimeout(() => setSuccessToast(""), 5000);
  };

  const handleCreateOfflineTxn = () => {
    DisasterRecoveryAuditEngine.queueOfflineTransaction(simulatedAmt, "SHIFT-005");
    reloadData();
    setSuccessToast(`Offline transaction for ₹${simulatedAmt} cached securely in AES-256 replication buffer.`);
    setTimeout(() => setSuccessToast(""), 5000);
  };

  const handleCheckUpdates = () => {
    const result = ProductionDeploymentManager.checkForDesktopUpdates();
    setUpdaterInfo(result);
    setSuccessToast(`Desktop autoupdate query completed. Current: ${result.versionFetched}`);
    setTimeout(() => setSuccessToast(""), 5000);
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans">
      
      {/* Header Deck */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Settings className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent uppercase">
              Production Hardening & Deployment Console
            </h1>
            <p className="text-xs text-slate-400 tracking-wider">MULTI-TENANT BRANCH PROVISIONING, ELECTRON SYSTEM HARDENINGS & OFFLINE DISASTER RECOVERY SYSTEMS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleNetwork}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              recoveryStatus.networkOnline 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            {recoveryStatus.networkOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            {recoveryStatus.networkOnline ? "Simulating: ONLINE" : "Simulating: OFFLINE"}
          </button>

          <button 
            onClick={reloadData}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300"
            title="Reload State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Notification Alert Toast */}
      {successToast && (
        <div className="mb-6 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          {successToast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column 2-Spans: Provisioning & Disaster recovery */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Branch Provisioning Console */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-5 flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-cyan-400" />
              Onboard Multi-Tenant Branch
            </h3>

            {/* Creation Form */}
            <form onSubmit={handleProvisionBranch} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Outlet Name</label>
                <input 
                  type="text" 
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Hyderabad Hitech Petrol Depot"
                  className="p-3 bg-slate-950 border border-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-xs rounded-xl text-slate-100 placeholder-slate-600 transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regional Location</label>
                <input 
                  type="text" 
                  value={newBranchRegion}
                  onChange={(e) => setNewBranchRegion(e.target.value)}
                  placeholder="e.g. Telangana - South Zone"
                  className="p-3 bg-slate-950 border border-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-xs rounded-xl text-slate-100 placeholder-slate-600 transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Licensed Oil Partner</label>
                <select 
                  value={newBranchBrand}
                  onChange={(e) => setNewBranchBrand(e.target.value as any)}
                  className="p-3 bg-slate-950 border border-slate-900 focus:border-cyan-500 outline-none text-xs rounded-xl text-slate-300"
                >
                  <option value="HPCL">HPCL (Hindustan Petroleum)</option>
                  <option value="IOCL">IOCL (Indian Oil Corp)</option>
                  <option value="BPCL">BPCL (Bharat Petroleum)</option>
                  <option value="RELIANCE">Reliance Petroleum</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regional Taxes Formula</label>
                <select 
                  value={newBranchTax}
                  onChange={(e) => setNewBranchTax(e.target.value as any)}
                  className="p-3 bg-slate-950 border border-slate-900 focus:border-cyan-500 outline-none text-xs rounded-xl text-slate-300"
                >
                  <option value="GST">GST (18% Slab Standard)</option>
                  <option value="VAT">VAT (20% Slab Regional)</option>
                </select>
              </div>

              <button
                type="submit"
                className="md:col-span-2 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.35)] flex items-center justify-center gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" /> Provision Outlet Scope
              </button>
            </form>

            {/* List of Branches */}
            <div className="border-t border-slate-850 pt-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-4.5">Provisioned Outlets Sandbox Registry</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Branch ID</th>
                      <th className="py-2.5 px-3">Outlet Details</th>
                      <th className="py-2.5 px-3">Taxation Slab</th>
                      <th className="py-2.5 px-3">Storage Namespace Boundaries</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => (
                      <tr key={b.branchId} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-300">
                          {b.branchId}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-200">{b.name}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{b.region}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          {b.taxType} ({b.taxSlabPercentage}%)
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[9px] text-indigo-400">
                          {b.dataBoundaryStorageScope}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Disaster Recovery & Local Encrypted Caching */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-emerald-400" />
                AES-256 Offline Backup Replication Log
              </h3>
              
              <button
                onClick={handleTriggerSync}
                disabled={recoveryStatus.pendingUnsyncedCount === 0 || !recoveryStatus.networkOnline}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] flex items-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" /> Force Sync Cache
              </button>
            </div>

            {/* Offline Sandbox Simulator */}
            <div className="p-4 bg-slate-950/60 border border-slate-900/80 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Simulate Offline Transaction Intake</span>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Toggle network to "OFFLINE", then click buffer intake. The shift row is instantly serialized, encrypted using AES-256, and stored locally.
                </p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={simulatedAmt}
                  onChange={(e) => setSimulatedAmt(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-850 rounded-xl text-xs font-mono font-bold outline-none text-slate-200"
                />
                <button
                  onClick={handleCreateOfflineTxn}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white uppercase whitespace-nowrap"
                >
                  Intake
                </button>
              </div>
            </div>

            {/* Replications statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Pending Replications</span>
                <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">{recoveryStatus.pendingUnsyncedCount} blocks</span>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Encrypted Cache Capacity</span>
                <span className="text-xl font-mono font-bold text-cyan-400 mt-1 block">{recoveryStatus.localEncryptedCacheBytes} Bytes</span>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Last Successful Sync</span>
                <span className="text-xs font-mono text-slate-300 mt-2 block overflow-hidden text-ellipsis whitespace-nowrap">
                  {recoveryStatus.lastBackupTimestamp ? new Date(recoveryStatus.lastBackupTimestamp).toLocaleTimeString() : "Never"}
                </span>
              </div>
            </div>

            {/* List of Offline Logs */}
            {offlineTxns.length > 0 && (
              <div className="mb-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Enqueued Cache Blocks</span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {offlineTxns.map((t) => (
                    <div key={t.transactionId} className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between items-center text-[10px] font-mono">
                      <div>
                        <span className="text-emerald-400 font-bold mr-2">{t.transactionId}</span>
                        <span className="text-slate-400 font-sans">Shift: {t.shiftId} | amount: ₹{t.amount}</span>
                      </div>
                      <span className="text-slate-500 text-[8px]">{t.payloadHash}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Logs terminal */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Sync Replication Audits Feed</span>
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 h-36 overflow-y-auto font-mono text-[9px] text-slate-400 flex flex-col gap-2">
                {recoveryStatus.recoveryLogs.map((log, idx) => (
                  <div key={idx} className="pb-1 border-b border-slate-900/40 last:border-0">{log}</div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Electron hardening controls */}
        <div className="flex flex-col gap-8">
          
          {/* Security Score gauge */}
          {securityReport && (
            <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Desktop Sandbox Audits
                </h3>
                <p className="text-[9px] text-slate-500 uppercase mt-0.5">Standalone Electron environment parameters</p>
              </div>

              {/* Hardening Score Ring */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950/50 rounded-3xl border border-slate-900 relative">
                <div className="text-4xl font-mono font-extrabold text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] px-6 py-4 rounded-2xl bg-slate-950 border border-slate-900/80">
                  {securityReport.overallHardeningScore}%
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-4 tracking-wider">HARDENING SECURITY SCORE</span>
              </div>

              {/* Individual Audits Checklist */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs font-semibold">
                  <span className="text-slate-300">Context Isolation Bounds</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${securityReport.contextIsolationPassed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                    {securityReport.contextIsolationPassed ? "SECURE" : "VULNERABLE"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs font-semibold">
                  <span className="text-slate-300">NodeIntegration Blocking</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${securityReport.nodeIntegrationBlocked ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                    {securityReport.nodeIntegrationBlocked ? "SECURE" : "VULNERABLE"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs font-semibold">
                  <span className="text-slate-300">Content Security Policy</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${securityReport.cspConfiguredCorrectly ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                    {securityReport.cspConfiguredCorrectly ? "LOCKED" : "VULNERABLE"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs font-semibold">
                  <span className="text-slate-300">Renderer Core Sandbox</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${securityReport.sandboxEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                    {securityReport.sandboxEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-xs font-semibold">
                  <span className="text-slate-300">Local Filesystem Isolation</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${securityReport.filesystemAccessRestricted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                    {securityReport.filesystemAccessRestricted ? "LOCKED" : "VULNERABLE"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Autoupdate and Preload audits */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Cpu className="w-4.5 h-4.5 text-indigo-400" />
              Preload Preflight Telemetry
            </h3>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleCheckUpdates}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-wide transition-all"
              >
                Scan Container Channels Updates
              </button>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-[10px] leading-relaxed">
                <span className="text-slate-500 block font-mono">Preload Script Hash:</span>
                <span className="text-indigo-400 font-mono break-all">{ProductionDeploymentManager.getContainerMetadata().preloadScriptHash}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-[10px] leading-relaxed">
                <span className="text-slate-500 block font-mono">Allowed Preload IPC Bridges:</span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {securityReport?.allowedIpcChannels.map((chan) => (
                    <span key={chan} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[8px] border border-slate-800">
                      {chan}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
