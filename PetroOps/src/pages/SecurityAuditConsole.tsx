import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertOctagon, 
  Terminal, 
  Eye, 
  Database,
  FileSpreadsheet,
  FileCheck,
  KeyRound,
  RefreshCw
} from "lucide-react";
import { 
  FirestoreSecurityValidationEngine, 
  TransactionPayload 
} from "../modules/security/services/FirestoreSecurityValidationEngine";
import { 
  ImmutableLedgerGuard, 
  ChainedTransaction 
} from "../modules/security/services/ImmutableLedgerGuard";
import { 
  PeriodMutationBlocker, 
  FiscalPeriod 
} from "../modules/security/services/PeriodMutationBlocker";

interface SecurityAccessLog {
  id: string;
  timestamp: number;
  operation: "READ" | "WRITE" | "UPDATE" | "DELETE";
  collection: string;
  initiatedBy: string;
  tenantId: string;
  status: "ALLOWED" | "BLOCKED" | "TAMPER_DETECTED";
  reason: string;
}

export default function SecurityAuditConsole() {
  const [activeTenantId, setActiveTenantId] = useState("TENANT-DELHI-99");
  
  // Ledger state & mock transactions
  const [transactionChain, setTransactionChain] = useState<ChainedTransaction[]>([]);
  const [chainIntegrityStatus, setChainIntegrityStatus] = useState<{ isCorrupted: boolean; corruptedSequenceIndices: number[] } | null>(null);
  
  // Fiscal Periods state
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriod[]>([]);
  const [isLockingModalOpen, setIsLockingModalOpen] = useState(false);
  const [newPeriodId, setNewPeriodId] = useState("FP-2026-M05");
  const [newStart, setNewStart] = useState("2026-05-01");
  const [newEnd, setNewEnd] = useState("2026-05-31");
  
  // Unlock Modal parameters
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [targetUnlockPeriodId, setTargetUnlockPeriodId] = useState<string | null>(null);
  const [auditorId, setAuditorId] = useState("AUD-CHIEF-01");
  const [auditorKey, setAuditorKey] = useState("");

  // Validator test inputs
  const [valAmount, setValAmount] = useState("12500");
  const [valType, setValType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [valHead, setValHead] = useState("Fuel Sale - Cash Outflow");
  const [valTenant, setValTenant] = useState("TENANT-DELHI- Delhi NCR");
  const [valLocked, setValLocked] = useState(false);
  const [valResult, setValResult] = useState<{ isValid: boolean; error?: string } | null>(null);

  // Security operational logs stream
  const [accessLogs, setAccessLogs] = useState<SecurityAccessLog[]>([]);

  useEffect(() => {
    loadDatabaseState();
  }, []);

  const loadDatabaseState = () => {
    // Populate default chained transaction records if empty
    let initialChain: ChainedTransaction[] = [];
    const basePayloads: TransactionPayload[] = [
      { tenantId: "TENANT-DELHI-99", amount: 15200.5, type: "DEBIT", accountHead: "NZ-1 Cash Sale", timestamp: Date.now() - 3600000 * 5, periodLocked: false },
      { tenantId: "TENANT-DELHI-99", amount: 4500.0, type: "CREDIT", accountHead: "Punjab Transport Credit", timestamp: Date.now() - 3600000 * 4, periodLocked: false },
      { tenantId: "TENANT-DELHI-99", amount: 8900.2, type: "DEBIT", accountHead: "NZ-2 UPI Outflow", timestamp: Date.now() - 3600000 * 3, periodLocked: false },
      { tenantId: "TENANT-DELHI-99", amount: 3200.0, type: "DEBIT", accountHead: "Petty Cash Petrol Expense", timestamp: Date.now() - 3600000 * 2, periodLocked: false }
    ];

    let currentPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
    initialChain = basePayloads.map((payload, index) => {
      const nodeHash = ImmutableLedgerGuard.calculateNodeHash(currentPrevHash, payload, index);
      const node: ChainedTransaction = {
        ...payload,
        transactionId: `TX-${1000 + index}`,
        previousHash: currentPrevHash,
        currentHash: nodeHash,
        sequenceNumber: index
      };
      currentPrevHash = nodeHash;
      return node;
    });

    setTransactionChain(initialChain);
    
    // Check initial integrity
    const auditRes = ImmutableLedgerGuard.verifyChainIntegrity(initialChain);
    setChainIntegrityStatus(auditRes);

    // Load closed periods
    setFiscalPeriods(PeriodMutationBlocker.getFiscalPeriods());

    // Populate initial security logs
    setAccessLogs([
      { id: "LOG-1", timestamp: Date.now() - 45000, operation: "WRITE", collection: "ledgerTransactions", initiatedBy: "OP-Delhi-1", tenantId: "TENANT-DELHI-99", status: "ALLOWED", reason: "Payload matching active schema and unlocked status verified." },
      { id: "LOG-2", timestamp: Date.now() - 32000, operation: "DELETE", collection: "ledgerTransactions", initiatedBy: "OP-Delhi-1", tenantId: "TENANT-DELHI-99", status: "BLOCKED", reason: "Firestore.rules rule book blocked direct document delete invocation." },
      { id: "LOG-3", timestamp: Date.now() - 25000, operation: "WRITE", collection: "ledgerTransactions", initiatedBy: "MGR-22", tenantId: "TENANT-MUMBAI-01", status: "BLOCKED", reason: "Tenancy violation! Operation rejected due to cross-tenant write boundaries." }
    ]);
  };

  const runChainIntegrityCheck = () => {
    const auditRes = ImmutableLedgerGuard.verifyChainIntegrity(transactionChain);
    setChainIntegrityStatus(auditRes);
    
    // Add logs
    const newLog: SecurityAccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      operation: "READ",
      collection: "ledgerTransactions",
      initiatedBy: "SECURE-AUDITOR",
      tenantId: activeTenantId,
      status: auditRes.isCorrupted ? "TAMPER_DETECTED" : "ALLOWED",
      reason: auditRes.isCorrupted 
        ? `Ledger integrity check failed! Sequence index corruption: ${auditRes.corruptedSequenceIndices.join(", ")}`
        : "Complete sequence cryptographic chain audited. 0 anomalies detected."
    };
    setAccessLogs((prev) => [newLog, ...prev]);
  };

  // Malicious action simulator to show off visual tamper detection!
  const simulateTampering = (index: number) => {
    const cloned = [...transactionChain];
    // Maliciously update amount of a transaction in memory to simulate database override
    cloned[index] = {
      ...cloned[index],
      amount: cloned[index].amount + 5000.0, // Alter value!
    };
    setTransactionChain(cloned);
    
    // Check integrity instantly to trigger alarm
    const auditRes = ImmutableLedgerGuard.verifyChainIntegrity(cloned);
    setChainIntegrityStatus(auditRes);

    const newLog: SecurityAccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      operation: "UPDATE",
      collection: "ledgerTransactions",
      initiatedBy: "MALICIOUS-DB-AGENT",
      tenantId: activeTenantId,
      status: "TAMPER_DETECTED",
      reason: `Tamper Detected! Sequence index [${index}] amount was manually altered. Chain hash broken.`
    };
    setAccessLogs((prev) => [newLog, ...prev]);
  };

  const handleRunValidatorTest = () => {
    const testPayload: Partial<TransactionPayload> = {
      tenantId: valTenant.split(" ")[0].trim(),
      amount: parseFloat(valAmount),
      type: valType,
      accountHead: valHead,
      timestamp: Date.now(),
      periodLocked: valLocked
    };

    const res = FirestoreSecurityValidationEngine.validateTransaction(testPayload, activeTenantId);
    setValResult(res);

    const newLog: SecurityAccessLog = {
      id: `LOG-${Date.now()}`,
      timestamp: Date.now(),
      operation: "WRITE",
      collection: "ledgerTransactions",
      initiatedBy: "SIMULATOR-AGENT",
      tenantId: activeTenantId,
      status: res.isValid ? "ALLOWED" : "BLOCKED",
      reason: res.isValid 
        ? "Pre-Transit payload schema validation passed."
        : `Pre-Transit rejected: ${res.error}`
    };
    setAccessLogs((prev) => [newLog, ...prev]);
  };

  const handleLockNewPeriod = () => {
    try {
      const startEp = new Date(newStart).getTime();
      const endEp = new Date(newEnd).getTime();
      PeriodMutationBlocker.lockPeriod(newPeriodId, startEp, endEp, "SECURE-ADMIN", "SIG-" + Math.random().toString(36).substr(2, 9).toUpperCase());
      setIsLockingModalOpen(false);
      loadDatabaseState();
      
      const newLog: SecurityAccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        operation: "WRITE",
        collection: "lockedPeriods",
        initiatedBy: "SECURE-ADMIN",
        tenantId: activeTenantId,
        status: "ALLOWED",
        reason: `New operational period locking committed: ${newPeriodId}`
      };
      setAccessLogs((prev) => [newLog, ...prev]);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRequestUnlock = (periodId: string) => {
    setTargetUnlockPeriodId(periodId);
    setIsUnlockModalOpen(true);
  };

  const handleConfirmUnlock = () => {
    if (!targetUnlockPeriodId) return;
    try {
      PeriodMutationBlocker.unlockPeriodWithAuthorization(targetUnlockPeriodId, {
        auditorId,
        securityKey: auditorKey
      });
      setIsUnlockModalOpen(false);
      setAuditorKey("");
      loadDatabaseState();

      const newLog: SecurityAccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        operation: "UPDATE",
        collection: "lockedPeriods",
        initiatedBy: auditorId,
        tenantId: activeTenantId,
        status: "ALLOWED",
        reason: `Auditor signature override verification passed. Unlocked period ${targetUnlockPeriodId}.`
      };
      setAccessLogs((prev) => [newLog, ...prev]);
    } catch (e: any) {
      const newLog: SecurityAccessLog = {
        id: `LOG-${Date.now()}`,
        timestamp: Date.now(),
        operation: "UPDATE",
        collection: "lockedPeriods",
        initiatedBy: auditorId,
        tenantId: activeTenantId,
        status: "BLOCKED",
        reason: `Unlock attempt blocked! Exception: ${e.message}`
      };
      setAccessLogs((prev) => [newLog, ...prev]);
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] p-6 space-y-6">
      
      {/* HUD Header Bar */}
      <div className="border border-red-900/30 bg-[#0d121f] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-2xl gap-4 relative overflow-hidden">
        {/* Glow decorative highlight */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-900/10 rounded-full blur-3xl -z-10" />
        
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500 w-6 h-6 animate-pulse" />
            ENTERPRISE SECURITY & DATABASE LOCK CONSOLE
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Enforce client-side structural validation barriers, lock closed accounting epochs, and monitor rolling database transaction hash signatures.
          </p>
        </div>
        
        {/* Context indicators */}
        <div className="flex gap-3 items-center">
          <div className="bg-[#141b2c] border border-slate-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Auditing Tenant</div>
            <input
              type="text"
              value={activeTenantId}
              onChange={(e) => setActiveTenantId(e.target.value)}
              className="bg-transparent text-cyan-400 font-bold text-center text-xs outline-none focus:border-b focus:border-cyan-500 mt-0.5 w-32"
            />
          </div>

          <button
            onClick={loadDatabaseState}
            className="p-2.5 bg-[#141b2c] hover:bg-[#1a233b] border border-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Reset simulation parameters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Ledger Blockchain chain + Closed Periods (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Cryptographic Ledger audit trail */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                  <Database className="text-emerald-400 w-4 h-4" />
                  LEDGER BLOCKCHAIN INTEGRITY SEQUENCE
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Every node encodes the hash of the preceding transaction. Edits instantly break all downstream signatures.
                </p>
              </div>
              <button
                onClick={runChainIntegrityCheck}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow"
              >
                <Activity className="w-3.5 h-3.5" />
                Audit Chain
              </button>
            </div>

            {/* Visual chained block cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transactionChain.map((node, idx) => {
                const isCorrupted = chainIntegrityStatus?.corruptedSequenceIndices.includes(idx);
                return (
                  <div 
                    key={node.transactionId}
                    className={`border ${
                      isCorrupted 
                        ? "border-red-500 bg-red-950/10 shadow-lg shadow-red-500/5" 
                        : "border-slate-800 bg-[#0e1628]"
                    } rounded-lg p-3 relative flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-white font-bold text-xs">{node.transactionId}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">Seq: #{node.sequenceNumber}</span>
                      </div>

                      <div className="mt-2 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Account:</span>
                          <span className="font-medium text-slate-400 truncate max-w-[120px]">{node.accountHead}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Type:</span>
                          <span className={node.type === "DEBIT" ? "text-emerald-400" : "text-yellow-400 font-semibold"}>
                            {node.type}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Amount:</span>
                          <span className="font-bold text-white">Rs. {node.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[8px] font-mono space-y-1">
                      <div className="text-slate-400 truncate" title={node.previousHash}>
                        <span className="text-purple-400">Prev Hash:</span> {node.previousHash}
                      </div>
                      <div className="text-slate-400 truncate" title={node.currentHash}>
                        <span className="text-emerald-400">Curr Hash:</span> {node.currentHash}
                      </div>
                    </div>

                    {/* Tamper button simulator */}
                    <div className="mt-3 flex justify-end gap-1.5">
                      <button
                        onClick={() => simulateTampering(idx)}
                        className="bg-[#1b253b] hover:bg-red-900/30 text-slate-400 hover:text-red-400 font-bold text-[9px] px-2 py-0.5 rounded transition"
                      >
                        Override Amount (Tamper)
                      </button>
                    </div>

                    {isCorrupted && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/20 border border-red-500 text-red-400 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        Signature Broken
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked Period Blockers (Phase 2 SPEC 1 & 4) */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                  <Lock className="text-red-400 w-4 h-4" />
                  CLOSED & SEALED CALENDAR PERIODS
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Operations within these closed boundaries require double cryptographic signatures from authorized auditors to deploy.
                </p>
              </div>
              <button
                onClick={() => setIsLockingModalOpen(true)}
                className="bg-red-950/60 hover:bg-red-950 text-red-300 border border-red-900/50 font-semibold text-xs px-3 py-1.5 rounded transition shadow"
              >
                Seal Date Range
              </button>
            </div>

            {/* List periods */}
            <div className="space-y-3">
              {fiscalPeriods.map((period) => (
                <div 
                  key={period.periodId}
                  className={`border ${
                    period.isClosed 
                      ? "border-red-900/30 bg-red-950/5" 
                      : "border-slate-800 bg-[#0e1628]"
                  } rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">{period.periodId}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        period.isClosed 
                          ? "bg-red-500/20 text-red-400" 
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {period.isClosed ? "CLOSED & SECURED" : "UNLOCKED / ACTIVE"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Interval: {new Date(period.startDate).toLocaleDateString()} to {new Date(period.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {period.isClosed && (
                      <div className="text-right text-[9px] text-slate-400">
                        Sealed By: <span className="text-slate-200">{period.closedBy}</span>
                        <div className="truncate max-w-[120px] text-[8px] text-purple-400 font-mono mt-0.5">
                          {period.auditorSignature}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {period.isClosed ? (
                        <button
                          onClick={() => handleRequestUnlock(period.periodId)}
                          className="bg-emerald-950/60 hover:bg-emerald-950 text-emerald-300 border border-emerald-900/50 font-semibold text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <Unlock className="w-2.5 h-2.5" />
                          Auditor Override
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            PeriodMutationBlocker.lockPeriod(
                              period.periodId,
                              period.startDate,
                              period.endDate,
                              "AUDIT-MANUAL"
                            );
                            loadDatabaseState();
                          }}
                          className="bg-red-950/60 hover:bg-red-950 text-red-300 border border-red-900/50 font-semibold text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          Seal Period
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Transit Payload simulator + Logs stream (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Pre-Transit validation simulator (Phase 2 SPEC 2) */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold tracking-wide text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <FileCheck className="text-cyan-400 w-4 h-4" />
              PRE-TRANSIT PAYLOAD SECURE GATEWAY
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Tenant Domain Mapping</label>
                <input
                  type="text"
                  value={valTenant}
                  onChange={(e) => setValTenant(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-1.5 rounded mt-1 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Transaction Amount (Rs)</label>
                  <input
                    type="text"
                    value={valAmount}
                    onChange={(e) => setValAmount(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-1.5 rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Account Head Mapping</label>
                  <input
                    type="text"
                    value={valHead}
                    onChange={(e) => setValHead(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-1.5 rounded mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#101726] border border-slate-700 p-2.5 rounded">
                <div>
                  <span className="font-semibold text-slate-300">Sealed Calendar Status</span>
                  <p className="text-[9px] text-slate-500">Is period closed in DB calendar bounds?</p>
                </div>
                <input
                  type="checkbox"
                  checked={valLocked}
                  onChange={(e) => setValLocked(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>

              <button
                onClick={handleRunValidatorTest}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 rounded transition shadow"
              >
                Simulate Secure Dispatch
              </button>

              {/* Render Validator Results */}
              {valResult && (
                <div className={`mt-4 p-3 rounded-lg border ${
                  valResult.isValid 
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                    : "bg-red-950/20 border-red-800/40 text-red-300"
                } flex items-start gap-2.5`}>
                  {valResult.isValid ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white">Payload Approved</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">
                          Structural constraints audited successfully. Dispatched payload cleared for transit.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-white">Transmission BLOCKED</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">
                          {valResult.error}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Real-time security access logs logs stream (Phase 2 SPEC 5) */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg flex flex-col h-[350px]">
            <h2 className="text-sm font-semibold tracking-wide text-white border-b border-slate-800 pb-3 mb-3 flex items-center gap-2">
              <Terminal className="text-red-500 w-4 h-4" />
              FIRESTORE SECURE MONITOR FEED
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[10px] pr-1">
              {accessLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2.5 rounded border ${
                    log.status === "TAMPER_DETECTED" ? "border-red-500 bg-red-950/15" :
                    log.status === "BLOCKED" ? "border-pink-800/40 bg-pink-950/10" : "border-slate-800 bg-[#0a0f1a]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-bold ${
                      log.status === "TAMPER_DETECTED" ? "text-red-400 animate-pulse" :
                      log.status === "BLOCKED" ? "text-pink-400" : "text-cyan-400"
                    }`}>
                      [{log.status}] {log.operation}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-400 mt-1">
                    Path: <span className="text-slate-200">/{log.collection}</span> • User: <span className="text-slate-200">{log.initiatedBy}</span>
                  </div>
                  <div className="text-slate-300 mt-1 border-t border-slate-800/60 pt-1">
                    Detail: {log.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lock new calendar range modal dialog */}
      {isLockingModalOpen && (
        <div className="fixed inset-0 bg-[#000000e0] flex items-center justify-center p-4 z-50">
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="text-red-500 w-4 h-4" />
              LOCK FISCAL CALENDAR BLOCK
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Period Identifier</label>
                <input
                  type="text"
                  value={newPeriodId}
                  onChange={(e) => setNewPeriodId(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-2 rounded mt-1 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-2 py-1 rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">End Date</label>
                  <input
                    type="date"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-2 py-1 rounded mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsLockingModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLockNewPeriod}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded text-xs transition shadow"
              >
                Seal Bounds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auditor double-signature override credentials unlock modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 bg-[#000000e0] flex items-center justify-center p-4 z-50">
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="text-emerald-500 w-4 h-4 animate-bounce" />
              DOUBLE-AUDITOR REOPEN ASSURANCE
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Reopening locked calendar blocks represents high regulatory liability. Provide double credentials with signature key logs.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Lead Auditor ID</label>
                <input
                  type="text"
                  value={auditorId}
                  onChange={(e) => setAuditorId(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-2 rounded mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Private Override Security Key</label>
                <input
                  type="password"
                  placeholder="AUDIT-SECURE-KEY-2026"
                  value={auditorKey}
                  onChange={(e) => setAuditorKey(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 text-slate-200 px-3 py-2 rounded mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsUnlockModalOpen(false);
                  setAuditorKey("");
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded text-xs transition"
              >
                Decline
              </button>
              <button
                onClick={handleConfirmUnlock}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded text-xs transition shadow"
              >
                Override Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
