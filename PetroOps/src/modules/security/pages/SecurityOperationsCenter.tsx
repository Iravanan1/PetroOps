import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Key, Smartphone, 
  Clock, Search, UserCheck, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { DeviceTrustEngine, TrustedDevice } from '../DeviceTrustEngine';
import { SessionGovernanceService, ActiveSession } from '../SessionGovernanceService';
import { ApprovalWorkflowEngine, SecurityApprovalRequest } from '../ApprovalWorkflowEngine';
import { TamperDetectionService, ChainVerificationResult } from '../TamperDetectionService';
import SensitiveActionApproval from '../components/SensitiveActionApproval';

export default function SecurityOperationsCenter() {
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'SESSIONS' | 'APPROVALS' | 'INTEGRITY'>('DEVICES');
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [approvals, setApprovals] = useState<SecurityApprovalRequest[]>([]);
  const [integrity, setIntegrity] = useState<ChainVerificationResult | null>(null);

  // Step-Up Modal states
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [selectedApproveId, setSelectedApproveId] = useState<string | null>(null);

  useEffect(() => {
    setDevices(DeviceTrustEngine.getDevices());
    setSessions(SessionGovernanceService.getSessions());
    setApprovals(ApprovalWorkflowEngine.getApprovals());
    setIntegrity(TamperDetectionService.verifyLogsIntegrity());
  }, []);

  const handleRevokeDevice = (deviceId: string) => {
    DeviceTrustEngine.revokeDevice(deviceId);
    setDevices(DeviceTrustEngine.getDevices());
    alert('Trusted device revoked successfully! Station terminal logouts updated.');
  };

  const handleTerminateSession = (sessionId: string) => {
    SessionGovernanceService.terminateSession(sessionId);
    setSessions(SessionGovernanceService.getSessions());
    alert('Active terminal session terminated dynamically!');
  };

  const triggerStepUp = (id: string, action: string) => {
    setSelectedApproveId(id);
    setPendingAction(action);
    setIsStepUpOpen(true);
  };

  const handleStepUpSuccess = () => {
    if (selectedApproveId) {
      ApprovalWorkflowEngine.processRequest(selectedApproveId, 'Owner Potaliya', 'APPROVED', 'PIN step-up authorization validated.');
      setApprovals(ApprovalWorkflowEngine.getApprovals());
      setIsStepUpOpen(false);
      alert('Supervisor override approved remotely! Audit comment logged in WAL transaction file.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400]">
              <ShieldAlert className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Security Operations Center
              </h1>
              <p className="text-xs text-[#666666] mt-0.5">
                Active terminals visibility, multi-factor step-up walls, and WAL tamper chain audits.
              </p>
            </div>
          </div>
        </div>

        {/* HUD Tab list */}
        <div className="flex flex-wrap gap-2 border-b border-[#EBEBEA] pb-3 bg-white p-3 rounded-2xl border">
          {(
            [
              { id: 'DEVICES', label: '📱 Trusted Devices', detail: 'Terminal fingerprints' },
              { id: 'SESSIONS', label: '🕰️ Active Sessions', detail: 'Dynamic session revocation' },
              { id: 'APPROVALS', label: '🔑 Remote Override approvals', detail: 'MFA escalation desk' },
              { id: 'INTEGRITY', label: '📜 Immutability Chain audits', detail: 'WAL tamper detector' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left min-h-[44px] border flex flex-col justify-center cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-white border-[#EBEBEA] hover:bg-[#F9F9F8] text-[#666666]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[8px] uppercase tracking-wider font-bold block mt-0.5 ${
                activeTab === tab.id ? 'text-[#D35400]' : 'text-[#999999]'
              }`}>{tab.detail}</span>
            </button>
          ))}
        </div>

        {/* Active Tab render */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
          
          {activeTab === 'DEVICES' && (
            <div className="space-y-6">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666]">Authorized Pump Terminals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {devices.map(dev => (
                  <div 
                    key={dev.deviceId}
                    className={`p-5 border rounded-2xl flex flex-col justify-between h-44 ${
                      dev.status === 'TRUSTED'
                        ? 'border-[#EBEBEA] bg-white'
                        : 'border-rose-100 bg-rose-50/20 text-rose-950'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-black text-[#1A1A1A]">{dev.label}</h4>
                        <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                          dev.status === 'TRUSTED' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}>{dev.status}</span>
                      </div>
                      <p className="text-[9px] font-mono text-[#666666] tracking-wider uppercase">{dev.fingerprint}</p>
                      <p className="text-[9px] text-[#666666] font-bold">IP: {dev.ipAddress} • Last active: {dev.lastActive}</p>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#EBEBEA]">
                      {dev.status === 'TRUSTED' && (
                        <button
                          onClick={() => handleRevokeDevice(dev.deviceId)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[9px] font-black uppercase rounded-lg cursor-pointer"
                        >
                          Revoke trust
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'SESSIONS' && (
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666]">Active Sessions dashboard</h3>
              <div className="border border-[#EBEBEA] rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs font-bold text-[#1A1A1A]">
                  <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[8px]">
                    <tr>
                      <th className="p-4">Session Ref</th>
                      <th className="p-4">Authorized User</th>
                      <th className="p-4">Access Role</th>
                      <th className="p-4">Terminal Device</th>
                      <th className="p-4">Last request</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEA]">
                    {sessions.map(sess => (
                      <tr key={sess.sessionId} className={sess.isActive ? 'hover:bg-[#F9F9F8]' : 'opacity-50 bg-[#F3F3F1]/20'}>
                        <td className="p-4 font-mono">{sess.sessionId}</td>
                        <td className="p-4">{sess.userId}</td>
                        <td className="p-4 uppercase text-[9px] tracking-wider">{sess.userRole}</td>
                        <td className="p-4">{sess.deviceLabel}</td>
                        <td className="p-4 font-mono text-[10px] text-[#666666]">{sess.lastRequestTime}</td>
                        <td className="p-4 text-right">
                          {sess.isActive ? (
                            <button
                              onClick={() => handleTerminateSession(sess.sessionId)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[9px] font-black uppercase rounded-lg cursor-pointer"
                            >
                              Kill session
                            </button>
                          ) : (
                            <span className="text-[9px] text-[#999999] italic uppercase">Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'APPROVALS' && (
            <div className="space-y-6">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666]">Pending Escalation queue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {approvals.map(req => (
                  <div 
                    key={req.id}
                    className="p-5 border border-[#EBEBEA] rounded-2xl flex flex-col justify-between h-52 bg-white"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider bg-[#F3F3F1] text-[#666666] border border-[#EBEBEA]">{req.action.replace(/_/g, ' ')}</span>
                        <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                        }`}>{req.status}</span>
                      </div>

                      <h5 className="text-[10px] text-[#666666] font-bold">Requestor: {req.requestor} • {req.timestamp}</h5>
                      <p className="text-[10px] leading-relaxed font-bold text-[#1A1A1A]">{req.justification}</p>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-[#EBEBEA]">
                      {req.status === 'PENDING' ? (
                        <button
                          onClick={() => triggerStepUp(req.id, req.action)}
                          className="px-3 py-1.5 bg-[#D35400] hover:bg-[#A04000] text-white text-[9px] font-black uppercase rounded-lg cursor-pointer"
                        >
                          Step-Up Approve
                        </button>
                      ) : (
                        <span className="text-[9px] text-emerald-700 font-extrabold block">Handled by: {req.approver}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'INTEGRITY' && (
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666]">Immutability Chain audits</h3>
              
              {integrity && integrity.passed ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="uppercase font-black block tracking-wider text-[11px]">Database ledger balance Cleared</span>
                    <span className="block mt-0.5">
                      All audit hashes verified continuity successfully. Genesis first block match is 100% stable. No suspicious period mutations detected.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-rose-700 mt-0.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <span className="uppercase font-black block tracking-wider text-[11px]">CRITICAL TAMPER WARNING</span>
                    <span className="block mt-0.5 text-rose-800 font-black">
                      {integrity?.errorDetails}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Step-Up prompt modal */}
      <SensitiveActionApproval 
        action={pendingAction}
        isOpen={isStepUpOpen}
        onClose={() => setIsStepUpOpen(false)}
        onSuccess={handleStepUpSuccess}
      />
    </div>
  );
}
