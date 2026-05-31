import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Key, Smartphone, Users, MapPin, Globe, Clock, Plus, 
  Trash2, ToggleLeft, ToggleRight, Check, AlertOctagon, RefreshCw, Send, Lock
} from "lucide-react";
import { MultiFactorAuthEngine } from "../modules/auth/MultiFactorAuthEngine";
import { DeviceTrustEngine, TrustedDeviceRecord } from "../modules/auth/DeviceTrustEngine";
import { SessionGovernanceEngine, ActiveSession } from "../modules/auth/SessionGovernanceEngine";
import { OrganizationInviteEngine, OrganizationInvite } from "../modules/auth/OrganizationInviteEngine";

export default function IdentityGovernanceCenter() {
  const tenantId = "tenant-delhi-01";
  const currentUserId = "owner@pumpai.com";

  // State Management
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceRecord[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  
  // Policy states
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(15); // Minutes
  const [allowedCountries, setAllowedCountries] = useState<string[]>(["IN", "AE", "SG"]);
  
  // Invitation Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"operator" | "manager" | "owner">("operator");
  const [inviteBranch, setInviteBranch] = useState("branch-delhi-01");
  const [generatedInvite, setGeneratedInvite] = useState<OrganizationInvite | null>(null);

  // General statistics
  const [blockedCountriesCount, setBlockedCountriesCount] = useState(14);
  const [auditLogs, setAuditLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System booted with strict DeviceTrustEngine validation enabled`,
    `[${new Date().toLocaleTimeString()}] Dynamic travel velocity checking registered 0 alarms in the last hour`
  ]);

  // Load components data
  useEffect(() => {
    setSessions(SessionGovernanceEngine.getActiveSessions(tenantId));
    setTrustedDevices(DeviceTrustEngine.getTenantTrustedDevices(tenantId));
    setInvites(OrganizationInviteEngine.getInvites());
  }, []);

  const handleRevokeSession = (sessionId: string) => {
    SessionGovernanceEngine.terminateSession(tenantId, sessionId);
    const refreshed = SessionGovernanceEngine.getActiveSessions(tenantId);
    setSessions(refreshed);
    setAuditLogs(prev => [`🚨 Session [${sessionId}] was manually terminated by administrator.`, ...prev]);
  };

  const handleApproveDevice = (deviceHash: string) => {
    DeviceTrustEngine.approveDevice(tenantId, deviceHash);
    const refreshed = DeviceTrustEngine.getTenantTrustedDevices(tenantId);
    setTrustedDevices(refreshed);
    setAuditLogs(prev => [`✅ Hardware Fingerprint [${deviceHash.substring(0, 8)}] approved successfully.`, ...prev]);
  };

  const handleRevokeDevice = (deviceHash: string) => {
    DeviceTrustEngine.revokeDevice(tenantId, deviceHash);
    const refreshed = DeviceTrustEngine.getTenantTrustedDevices(tenantId);
    setTrustedDevices(refreshed);
    setAuditLogs(prev => [`⚠️ Hardware Fingerprint [${deviceHash.substring(0, 8)}] authorization revoked.`, ...prev]);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const invite = await OrganizationInviteEngine.createInvite(
        inviteEmail,
        inviteRole,
        inviteBranch,
        currentUserId
      );
      setGeneratedInvite(invite);
      setInvites(OrganizationInviteEngine.getInvites());
      setInviteEmail("");
      setAuditLogs(prev => [`✉️ Signed secure invite spooled for ${inviteEmail} with token ${invite.token.substring(0, 12)}...`, ...prev]);
    } catch (err: any) {
      setAuditLogs(prev => [`🚨 Invite Generation Failed: ${err.message}`, ...prev]);
    }
  };

  const handleToggleCountry = (code: string) => {
    if (allowedCountries.includes(code)) {
      if (allowedCountries.length === 1) return; // Prevent blocking all
      setAllowedCountries(prev => prev.filter(c => c !== code));
      setAuditLogs(prev => [`⚠️ Country [${code}] removed from whitelist network registry.`, ...prev]);
    } else {
      setAllowedCountries(prev => [...prev, code]);
      setAuditLogs(prev => [`✅ Country [${code}] added to allowed operational zones.`, ...prev]);
    }
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans space-y-8">
      {/* Top dashboard header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Identity & Session Governance Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Enterprise Access Policy Firewalls & Workstation Fingerprint Audits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ShieldCheck className="w-4 h-4" />
            COMPLIANCE: ACTIVE
          </div>
          <button 
            onClick={() => {
              setSessions(SessionGovernanceEngine.getActiveSessions(tenantId));
              setTrustedDevices(DeviceTrustEngine.getTenantTrustedDevices(tenantId));
              setInvites(OrganizationInviteEngine.getInvites());
              setAuditLogs(prev => [`[${new Date().toLocaleTimeString()}] Synchronized telemetry indices.`, ...prev]);
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Grid: Overview numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Security Score */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Security Index</span>
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">98/100</div>
          <div className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wide">Excellent Governance</div>
          <div className="absolute right-[-10px] bottom-[-15px] text-slate-800 opacity-20 transform scale-150">
            <ShieldCheck className="w-24 h-24" />
          </div>
        </div>

        {/* Live sessions */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Sessions</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">{sessions.length}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">All within active limits</div>
        </div>

        {/* Whitelisted Devices */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Trusted Hardware</span>
            <Smartphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">
            {trustedDevices.filter(d => d.isApproved).length}
          </div>
          <div className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wide">
            {trustedDevices.filter(d => !d.isApproved).length} pending audit approvals
          </div>
        </div>

        {/* Blocked Geographic Zones */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Geographic Locks</span>
            <Globe className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">{blockedCountriesCount}</div>
          <div className="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-wide">Countries blacklisted</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sessions and Devices */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Sessions Panel */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Live Operator Sessions & Telemetry
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-500 uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-2">Operator ID</th>
                    <th className="py-3 px-2">Location/IP</th>
                    <th className="py-3 px-2">Fingerprint</th>
                    <th className="py-3 px-2 text-center">Risk Score</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess) => (
                    <tr key={sess.sessionId} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-300">{sess.userId}</div>
                        <div className="text-[9px] text-slate-500 font-mono">ID: {sess.sessionId}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>{sess.regionName}, {sess.countryCode}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{sess.ipAddress}</div>
                      </td>
                      <td className="py-3 px-2 font-mono text-[9px] text-slate-400">
                        {sess.deviceFingerprint.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          sess.riskScore < 30 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : sess.riskScore < 70 
                            ? "bg-amber-500/10 text-amber-400" 
                            : "bg-rose-500/10 text-rose-400 animate-pulse"
                        }`}>
                          {sess.riskScore}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleRevokeSession(sess.sessionId)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-950/20 border border-rose-900/30 hover:border-rose-500 hover:bg-rose-600 hover:text-white rounded-lg text-rose-400 transition"
                        >
                          Revoke Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trusted Devices Panel */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Trusted Workstation Hardware Manifest
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-500 uppercase tracking-widest text-[9px]">
                    <th className="py-3 px-2">Device Name</th>
                    <th className="py-3 px-2">Browser Fingerprint Hash</th>
                    <th className="py-3 px-2">Authorized By</th>
                    <th className="py-3 px-2 text-center">Verification Status</th>
                    <th className="py-3 px-2 text-right">Audit Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {trustedDevices.map((dev) => (
                    <tr key={dev.deviceHash} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-300">{dev.deviceName}</div>
                        <div className="text-[9px] text-slate-500 font-mono truncate max-w-xs">{dev.userAgentSnippet}</div>
                      </td>
                      <td className="py-3 px-2 font-mono text-[9px] text-slate-400">
                        {dev.deviceHash}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-slate-300">{dev.registeredBy}</div>
                        <div className="text-[9px] text-slate-500">Reg: {new Date(dev.registeredAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {dev.isApproved ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            APPROVED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            PENDING AUDIT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {dev.isApproved ? (
                          <button
                            onClick={() => handleRevokeDevice(dev.deviceHash)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                            title="Revoke Trust"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproveDevice(dev.deviceHash)}
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                            title="Approve Device"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Policies and Invites */}
        <div className="space-y-8">
          {/* Security Policy Firewalls */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              Dynamic Policy Firewalls
            </h2>

            <div className="space-y-6">
              {/* MFA Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Enforce Google/SMS MFA</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Mandate secondary OTP on all supervisor actions.</div>
                </div>
                <button 
                  onClick={() => {
                    setMfaEnforced(prev => !prev);
                    setAuditLogs(prev => [`🛡️ MFA policy setting mutated to: ${!mfaEnforced ? "ENFORCED" : "OPTIONAL"}.`, ...prev]);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 transition"
                >
                  {mfaEnforced ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Session Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-200">Session Inactivity Lock</span>
                  <span className="text-xs text-indigo-400 font-mono font-bold">{sessionTimeout}m</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="60" 
                  step="5"
                  value={sessionTimeout}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSessionTimeout(val);
                    setAuditLogs(prev => [`🕒 Session inactivity threshold updated to: ${val} minutes.`, ...prev]);
                  }}
                  className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-1" 
                />
              </div>

              {/* Allowed Country Locks */}
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2">Allowed Country Whitelist</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: "IN", label: "India" },
                    { code: "AE", label: "UAE" },
                    { code: "SG", label: "Singapore" },
                    { code: "US", label: "United States" },
                    { code: "UK", label: "United Kingdom" },
                    { code: "JP", label: "Japan" }
                  ].map((country) => {
                    const active = allowedCountries.includes(country.code);
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleToggleCountry(country.code)}
                        className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition ${
                          active 
                            ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30" 
                            : "bg-slate-950/20 text-slate-500 border-slate-850 hover:text-slate-300"
                        }`}
                      >
                        {country.code} ({country.label.substring(0, 3)})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Secure Organization Invite Dispatcher */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Onboard Corporate Employees
            </h2>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Employee Email Address</label>
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@delhifuelcorp.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Scope Mapping Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-[10px] text-slate-300 focus:outline-none"
                  >
                    <option value="operator">Operator (Branch UI)</option>
                    <option value="manager">Manager (Approve Shift)</option>
                    <option value="owner">Corporate Owner (Full)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Branch Scope</label>
                  <select
                    value={inviteBranch}
                    onChange={(e) => setInviteBranch(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-[10px] text-slate-300 focus:outline-none"
                  >
                    <option value="branch-delhi-01">Delhi West POS</option>
                    <option value="branch-mumbai-02">Mumbai POS</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Cryptographic Token
              </button>
            </form>

            {generatedInvite && (
              <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-500/10 rounded-xl space-y-1">
                <div className="text-[9px] uppercase font-bold text-emerald-400">Dispatch Successful</div>
                <div className="text-[10px] text-slate-300 font-mono break-all bg-slate-950/60 p-2 rounded border border-slate-900">
                  {generatedInvite.token}
                </div>
                <div className="text-[8px] text-slate-500">Share this token to enable verified supervisor signup.</div>
              </div>
            )}

            {/* List of outstanding spooled invites */}
            <div className="mt-5 space-y-2">
              <label className="block text-[9px] text-slate-500 uppercase font-bold">Outstanding Invites</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {invites.map((inv, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-900 flex justify-between items-center text-[10px]">
                    <div>
                      <div className="font-bold text-slate-300 truncate max-w-xs">{inv.email}</div>
                      <div className="text-slate-500 font-mono text-[8px] mt-0.5">
                        Role: {inv.targetRole} | {inv.isUsed ? "Consumed" : Date.now() > inv.expiresAt ? "Expired" : "Active"}
                      </div>
                    </div>
                    {!inv.isUsed && (
                      <button
                        onClick={() => {
                          const filtered = invites.filter(i => i.token !== inv.token);
                          setInvites(filtered);
                          OrganizationInviteEngine.saveInvites(filtered);
                        }}
                        className="text-rose-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Telemetry Audit Log */}
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <AlertOctagon className="w-4.5 h-4.5 text-indigo-400" />
          Realtime IAM Threat & Event Streams
        </h2>
        <div className="bg-slate-950/50 rounded-xl border border-slate-900 p-4 font-mono text-[10px] text-slate-400 space-y-2 h-44 overflow-y-auto">
          {auditLogs.map((log, index) => (
            <div key={index} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
