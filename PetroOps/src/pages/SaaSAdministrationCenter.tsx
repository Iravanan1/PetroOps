import React, { useState } from "react";
import { 
  ShieldCheck, Layers, Landmark, Timer, Key, Cpu, Download, Database, AlertCircle, RefreshCw
} from "lucide-react";
import { SubscriptionTier, SubscriptionStatus } from "../modules/saas/SubscriptionEngine";
import { QuotaUsage, UsageQuotaEngine } from "../modules/saas/UsageQuotaEngine";
import { TenantBackupIsolation } from "../modules/saas/TenantBackupIsolation";

interface TenantAdminConfig {
  tenantId: string;
  name: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus["status"];
  expiresAt: number;
  apiCalls: number;
  ocrScans: number;
  storageMB: number;
}

export default function SaaSAdministrationCenter() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [backupKey, setBackupKey] = useState("pumpai-secure-backup-2026-prod");
  const [backupLog, setBackupLog] = useState<string[]>([]);

  // Seed mock tenant metrics to visualize a highly-polished active enterprise SaaS structure
  const [tenants, setTenants] = useState<TenantAdminConfig[]>([
    {
      tenantId: "t-delhi-01",
      name: "Delhi Fuel Corp (NCR Division)",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
      apiCalls: 624500,
      ocrScans: 4890,
      storageMB: 12400
    },
    {
      tenantId: "t-mumbai-09",
      name: "Maharashtra Petroleum Division",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      expiresAt: Date.now() + 180 * 24 * 3600 * 1000,
      apiCalls: 843200,
      ocrScans: 12400,
      storageMB: 48900
    },
    {
      tenantId: "t-blr-04",
      name: "Bengaluru Smart Pumps Inc",
      tier: "GROWTH",
      status: "ACTIVE",
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
      apiCalls: 42100,
      ocrScans: 1280,
      storageMB: 2840
    },
    {
      tenantId: "t-chennai-03",
      name: "Tamil Nadu Highway Refuelers",
      tier: "FREE",
      status: "TRIAL_EXPIRED",
      expiresAt: Date.now() - 5 * 24 * 3600 * 1000,
      apiCalls: 4990,
      ocrScans: 98,
      storageMB: 88
    },
    {
      tenantId: "t-pune-07",
      name: "Pune Express Wetstock Ltd",
      tier: "GROWTH",
      status: "SUSPENDED",
      expiresAt: Date.now() + 15 * 24 * 3600 * 1000,
      apiCalls: 48900,
      ocrScans: 1420,
      storageMB: 4950
    }
  ]);

  const handleTriggerBackup = async (tenantId: string) => {
    setLoading(true);
    const tenant = tenants.find(t => t.tenantId === tenantId);
    if (!tenant) return;

    try {
      setBackupLog(prev => [`[${new Date().toLocaleTimeString()}] Querying transaction ledger streams for ${tenant.name}...`, ...prev]);
      
      // Simulate compiling raw payloads to test isolated compression
      const mockDatabaseDump = {
        tenantId: tenant.tenantId,
        backupEpoch: Date.now(),
        stationNodeCount: tenant.tier === "ENTERPRISE" ? 8 : 2,
        ledgerClosingBalance: 1245900.50,
        historicalEventsCount: tenant.apiCalls,
        schemaVersion: "2.4.1"
      };

      await new Promise(resolve => setTimeout(resolve, 800)); // Simulating deep storage serialization
      
      const archive = await TenantBackupIsolation.generateBackup(
        tenant.tenantId,
        mockDatabaseDump,
        backupKey
      );

      setBackupLog(prev => [
        `✅ [${new Date().toLocaleTimeString()}] Backup generated! Checksum: ${archive.checksum}. Payload encrypted successfully!`,
        `[${new Date().toLocaleTimeString()}] Isolated encrypted base64: ${archive.encryptedData.substring(0, 48)}...`,
        ...prev
      ]);
    } catch (e: any) {
      setBackupLog(prev => [`🚨 [Backup Failed] ${e.message}`, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.tenantId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute aggregated diagnostics
  const activeCount = tenants.filter(t => t.status === "ACTIVE").length;
  const growthCount = tenants.filter(t => t.tier === "GROWTH").length;
  const enterpriseCount = tenants.filter(t => t.tier === "ENTERPRISE").length;
  const totalStorageGB = (tenants.reduce((sum, t) => sum + t.storageMB, 0) / 1024).toFixed(2);

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 animate-pulse" />
            SaaS Division & Data Isolation Boundaries
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Multi-Tenant Administration Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTenants([...tenants])}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Aggregate Overview metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Active Tenancies</div>
          <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
            {activeCount} <span className="text-xs text-slate-500 font-normal">/ {tenants.length} Divisions</span>
          </div>
          <Layers className="absolute right-4 bottom-4 w-12 h-12 text-blue-500/10 group-hover:scale-110 transition duration-300" />
        </div>

        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Enterprise Subscription</div>
          <div className="text-3xl font-extrabold text-indigo-400">{enterpriseCount}</div>
          <Landmark className="absolute right-4 bottom-4 w-12 h-12 text-indigo-500/10 group-hover:scale-110 transition duration-300" />
        </div>

        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Growth Subscription</div>
          <div className="text-3xl font-extrabold text-emerald-400">{growthCount}</div>
          <Timer className="absolute right-4 bottom-4 w-12 h-12 text-emerald-500/10 group-hover:scale-110 transition duration-300" />
        </div>

        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total SaaS Storage</div>
          <div className="text-3xl font-extrabold text-amber-400 flex items-baseline gap-1">
            {totalStorageGB} <span className="text-xs text-slate-500 font-normal">GB</span>
          </div>
          <Database className="absolute right-4 bottom-4 w-12 h-12 text-amber-500/10 group-hover:scale-110 transition duration-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Tenant Directory Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1329]/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex justify-between items-center gap-4 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Division Directory</h2>
              <input
                type="text"
                placeholder="Filter by Tenant Name or Key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs w-60 text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-4">
              {filteredTenants.map((tenant) => {
                const isSelected = selectedTenant === tenant.tenantId;
                const limits = UsageQuotaEngine.getQuotaLimits(tenant.tier);
                
                return (
                  <div 
                    key={tenant.tenantId}
                    onClick={() => setSelectedTenant(isSelected ? null : tenant.tenantId)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? "bg-slate-900/60 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                        : "bg-slate-950/20 border-slate-800/60 hover:bg-slate-900/20"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{tenant.name}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{tenant.tenantId}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Expires: {new Date(tenant.expiresAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold ${
                          tenant.tier === "ENTERPRISE" 
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                            : tenant.tier === "GROWTH" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}>
                          {tenant.tier}
                        </span>

                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold ${
                          tenant.status === "ACTIVE" 
                            ? "bg-emerald-500/15 text-emerald-400" 
                            : tenant.status === "SUSPENDED"
                            ? "bg-amber-500/15 text-amber-400" 
                            : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Quota indicators visible when selected */}
                    {isSelected && (
                      <div className="mt-5 pt-4 border-t border-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                        {/* API calls */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1.5">
                            <span className="text-slate-400">API Calls Quota</span>
                            <span className="text-slate-500">{tenant.apiCalls.toLocaleString()} / {limits.maxMonthlyApiCalls.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${Math.min((tenant.apiCalls / limits.maxMonthlyApiCalls) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* OCR Scans */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1.5">
                            <span className="text-slate-400">OCR Scans</span>
                            <span className="text-slate-500">{tenant.ocrScans.toLocaleString()} / {limits.maxMonthlyOcrScans.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${Math.min((tenant.ocrScans / limits.maxMonthlyOcrScans) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Storage */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1.5">
                            <span className="text-slate-400">Data Storage</span>
                            <span className="text-slate-500">{tenant.storageMB} MB / {(limits.maxStorageBytes / (1024 * 1024)).toFixed(0)} MB</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full" 
                              style={{ width: `${Math.min((tenant.storageMB / (limits.maxStorageBytes / (1024 * 1024))) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerBackup(tenant.tenantId);
                            }}
                            disabled={loading || tenant.status !== "ACTIVE"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-800 disabled:text-slate-600 transition"
                          >
                            <Download className="w-3 h-3" />
                            Trigger Encrypted Backup
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cryptographic Backup Audits Logs Panel */}
        <div className="space-y-6">
          <div className="bg-[#0b1329]/40 border border-slate-800/60 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              Backup Security Keys
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">Encryption Salt Key</label>
                <input
                  type="password"
                  value={backupKey}
                  onChange={(e) => setBackupKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="p-3 bg-blue-950/15 border border-blue-900/20 rounded-xl text-[10px] text-slate-400 leading-relaxed">
                🚨 <strong className="text-slate-200">ISO-27001 Security Notice:</strong> Archival keys are generated deterministically per tenant segment. Ensure keys are stored inside external secure vaults.
              </div>
            </div>
          </div>

          <div className="bg-[#0b1329]/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col h-80">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Backup Operations Log
            </h2>
            <div className="flex-1 bg-slate-950/40 rounded-xl border border-slate-900 p-3 font-mono text-[9px] text-slate-400 overflow-y-auto space-y-2">
              {backupLog.length === 0 ? (
                <div className="text-slate-600 italic text-center pt-24">No operations executed in this session.</div>
              ) : (
                backupLog.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
