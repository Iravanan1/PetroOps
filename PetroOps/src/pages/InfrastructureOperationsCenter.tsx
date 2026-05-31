import React, { useState, useEffect } from "react";
import { 
  Terminal, ShieldCheck, RefreshCw, Cpu, Server, Activity, Database, CheckCircle, AlertTriangle, ArrowRight, Play
} from "lucide-react";
import { DeploymentRollbackEngine, DeploymentManifest, DeploymentAuditLog } from "../modules/devops/DeploymentRollbackEngine";
import { EnvironmentPromotionEngine, EnvironmentProfile, EnvironmentConfig } from "../modules/devops/EnvironmentPromotionEngine";

export default function InfrastructureOperationsCenter() {
  const [loading, setLoading] = useState(false);
  const [errorRate, setErrorRate] = useState(1.2); // Initial simulated error rate
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [activeProfile, setActiveProfile] = useState<EnvironmentProfile>("PRODUCTION_ENTERPRISE");
  const [verifyKey, setVerifyKey] = useState("pumpai-prod-key-length-32-chars-ok");
  const [violations, setViolations] = useState<string[]>([]);
  const [auditPassed, setAuditPassed] = useState<boolean | null>(null);
  
  // Build and deploy terminal spool logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Starting Docker Multi-Stage Build process...`,
    `[${new Date().toLocaleTimeString()}] [Stage 1] npm ci resolved in 2400ms.`,
    `[${new Date().toLocaleTimeString()}] [Stage 1] Vite client build completed. dist folder generated.`,
    `[${new Date().toLocaleTimeString()}] [Stage 2] Runner base image instantiated: node:20-alpine.`,
    `[${new Date().toLocaleTimeString()}] [Stage 2] Non-root node user verified. Production ENV set.`,
    `[${new Date().toLocaleTimeString()}] Container cluster listening on port 8080.`
  ]);

  // Deployment Manifest state
  const [activeVersion, setActiveVersion] = useState<DeploymentManifest>({
    version: "v2.8.4",
    imageTag: "pumpai-app:2.8.4-prod",
    deployedAt: Date.now() - 36 * 3600 * 1000,
    status: "STABLE",
    checksum: "0c8a5f4d2e9c1b7a"
  });

  const [stableHistory] = useState<DeploymentManifest[]>([
    {
      version: "v2.8.3",
      imageTag: "pumpai-app:2.8.3-prod",
      deployedAt: Date.now() - 10 * 24 * 3600 * 1000,
      status: "STABLE",
      checksum: "8a4f6d3c2e1b5a9f"
    },
    {
      version: "v2.8.2",
      imageTag: "pumpai-app:2.8.2-prod",
      deployedAt: Date.now() - 30 * 24 * 3600 * 1000,
      status: "STABLE",
      checksum: "4b6c3a2e1d5f9e8a"
    }
  ]);

  const [rollbackAudits, setRollbackAudits] = useState<DeploymentAuditLog[]>([
    {
      timestamp: Date.now() - 5 * 24 * 3600 * 1000,
      triggerSource: "SYSTEM_MONITOR",
      reason: "Automated Rollback: version 'v2.8.5-rc1' breached 5% error threshold.",
      previousVersion: "v2.8.5-rc1",
      restoredVersion: "v2.8.4"
    }
  ]);

  // Simulate active telemetry spikes
  useEffect(() => {
    const interval = setInterval(() => {
      setErrorRate(prev => {
        const drift = (Math.random() - 0.5) * 0.4;
        return parseFloat(Math.max(0.2, Math.min(prev + drift, 12)).toFixed(2));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTestPromotion = () => {
    const config = EnvironmentPromotionEngine.getEnvironmentDefaults(activeProfile);
    const audit = EnvironmentPromotionEngine.auditEnvironmentPromotion(
      activeProfile,
      config,
      verifyKey
    );

    setViolations(audit.violations);
    setAuditPassed(audit.ready);
  };

  const handleManualRollback = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const rollbackResult = DeploymentRollbackEngine.executeRollback(
          activeVersion,
          stableHistory,
          "ADMIN_OVERRIDE",
          "Supervisor manual trigger: rollback to stable core requested."
        );

        setActiveVersion({
          ...stableHistory[0],
          status: "STABLE"
        });
        setRollbackAudits(prev => [rollbackResult.rollbackAudit, ...prev]);
        setTerminalLogs(prev => [
          `⚠️ [${new Date().toLocaleTimeString()}] SYSTEM ROLLBACK SIGNAL DETECTED!`,
          `[${new Date().toLocaleTimeString()}] Restoring database mappings to version ${rollbackResult.rollbackAudit.restoredVersion}...`,
          `✅ [${new Date().toLocaleTimeString()}] Zero-downtime traffic swap finalized successfully.`,
          ...prev
        ]);
        setConsecutiveFailures(0);
        setErrorRate(0.8);
      } catch (e: any) {
        setTerminalLogs(prev => [`🚨 [Rollback Failed] ${e.message}`, ...prev]);
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  // Automated stability loop watch
  useEffect(() => {
    const assessment = DeploymentRollbackEngine.evaluateDeploymentStability(
      activeVersion,
      errorRate,
      consecutiveFailures
    );

    if (assessment.triggerRollback && activeVersion.status !== "ROLLED_BACK") {
      setTerminalLogs(prev => [
        `🚨 [CRITICAL TELEMETRY SPIKE] stability threshold breached!`,
        `[${new Date().toLocaleTimeString()}] ${assessment.reason}`,
        ...prev
      ]);
      handleManualRollback();
    }
  }, [errorRate, consecutiveFailures]);

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400 animate-pulse" />
            Infrastructure & Operations Telemetry
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            DevOps & Deployment Control Room
          </h1>
        </div>
      </div>

      {/* Cluster Node Status indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">App Server Container</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-white">pumpai-authority-app</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Port: 8080 | Status: Running</div>
          <Cpu className="absolute right-4 bottom-2 w-12 h-12 text-blue-500/10 group-hover:scale-110 transition duration-300" />
        </div>

        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cache Node Container</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-white">pumpai-redis-cache</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Port: 6379 | Status: Active</div>
          <Database className="absolute right-4 bottom-2 w-12 h-12 text-indigo-500/10 group-hover:scale-110 transition duration-300" />
        </div>

        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cluster Error Telemetry</span>
            <span className={`text-[10px] font-bold ${errorRate >= 5.0 ? "text-rose-400" : "text-emerald-400"}`}>
              {errorRate >= 5.0 ? "Threshold Breached" : "Optimal"}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white flex items-baseline gap-1">
            {errorRate} <span className="text-xs text-slate-500 font-normal">%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Rollback safety threshold: 5.0%</div>
          <Activity className="absolute right-4 bottom-2 w-12 h-12 text-amber-500/10 group-hover:scale-110 transition duration-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Deployment and Rollback Terminal Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rollback Console */}
          <div className="bg-[#0b1329]/40 border border-slate-800/60 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Environment Deployment State</h2>
              <span className={`text-[10px] px-2.5 py-1 rounded bg-slate-800 font-bold border ${
                activeVersion.status === "STABLE" 
                  ? "text-emerald-400 border-emerald-500/20" 
                  : "text-rose-400 border-rose-500/20"
              }`}>
                {activeVersion.status}
              </span>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
              <div>
                <div className="text-xs text-slate-400">Active Container Build Version</div>
                <div className="text-2xl font-extrabold text-white mt-1">{activeVersion.version}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Tag: {activeVersion.imageTag} | SHA: {activeVersion.checksum}</div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setConsecutiveFailures(prev => prev + 1)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Simulate Ledger Failures ({consecutiveFailures}/6)
                </button>
                <button
                  onClick={handleManualRollback}
                  disabled={loading || activeVersion.status === "ROLLED_BACK"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-500 text-white disabled:bg-slate-800 disabled:text-slate-600 transition"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Manual Rollback
                </button>
              </div>
            </div>

            {/* Audit Logs of rollbacks */}
            {rollbackAudits.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-800/40">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">Rollback Security Audit Log</div>
                <div className="space-y-3">
                  {rollbackAudits.map((audit, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/20 border border-slate-900 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-slate-300">{audit.reason}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          {new Date(audit.timestamp).toLocaleDateString()} | Trigger: {audit.triggerSource}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                        <span className="text-rose-400">{audit.previousVersion}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="text-emerald-400">{audit.restoredVersion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Terminal Console log spool */}
          <div className="bg-[#070b13] border border-slate-800/80 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              Build & Compile Console Streams
            </h2>
            <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 h-64 overflow-y-auto space-y-2">
              {terminalLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Environment Promotion Sandbox Panel */}
        <div className="space-y-6">
          <div className="bg-[#0b1329]/40 border border-slate-800/60 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Promotion Auditing Lab
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">Target Deployment Tier</label>
                <select
                  value={activeProfile}
                  onChange={(e) => {
                    setActiveProfile(e.target.value as EnvironmentProfile);
                    setAuditPassed(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="LOCAL_DEVELOPMENT">LOCAL_DEVELOPMENT (Sandbox)</option>
                  <option value="STAGING_SANDBOX">STAGING_SANDBOX (Testing)</option>
                  <option value="PRODUCTION_ENTERPRISE">PRODUCTION_ENTERPRISE (Prod)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">Target Decryption Key</label>
                <input
                  type="text"
                  value={verifyKey}
                  onChange={(e) => {
                    setVerifyKey(e.target.value);
                    setAuditPassed(null);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Insert secure 32+ character key"
                />
              </div>

              <button
                onClick={handleTestPromotion}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
              >
                <Play className="w-3.5 h-3.5" />
                Run Promotion Audit Checks
              </button>

              {auditPassed !== null && (
                <div className={`p-4 rounded-xl border mt-2 animate-fadeIn ${
                  auditPassed 
                    ? "bg-emerald-950/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-rose-950/15 border-rose-500/20 text-rose-400"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {auditPassed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {auditPassed ? "Audit Passed" : "Promotion Rejected"}
                    </span>
                  </div>

                  {auditPassed ? (
                    <div className="text-[10px] leading-relaxed">
                      All criteria satisfied. Database boundaries fully secure, and signing key satisfies compliance regulations. Ready for production promotion!
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1">Found the following blocking failures:</div>
                      {violations.map((v, i) => (
                        <div key={i} className="text-[9px] flex items-start gap-1 font-medium leading-relaxed font-mono">
                          • {v}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
