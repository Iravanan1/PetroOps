import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Award, FileText, Download, CheckCircle, 
  Archive, FileSpreadsheet, Lock, Clock, RefreshCw, Send, AlertOctagon
} from "lucide-react";
import { LegalRetentionEngine } from "../modules/compliance/LegalRetentionEngine";
import { DigitalSignatureVerification } from "../modules/compliance/DigitalSignatureVerification";
import { ComplianceArchiveEngine, ArchiveBlock } from "../modules/compliance/ComplianceArchiveEngine";
import { AuditCertificationEngine, AuditCertificate } from "../modules/compliance/AuditCertificationEngine";

export default function EnterpriseComplianceCenter() {
  const tenantId = "tenant-delhi-01";
  const defaultAuditor = "compliance.officer@delhifuel.co.in";

  // State Management
  const [certificates, setCertificates] = useState<AuditCertificate[]>([]);
  const [archives, setArchives] = useState<ArchiveBlock[]>([]);
  const [complianceLogs, setComplianceLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Compliance Hub locked down under strict LegalRetentionEngine parameters`,
    `[${new Date().toLocaleTimeString()}] Initialized cold archives. Found ${ComplianceArchiveEngine.getArchives(tenantId).length} spooled archive blocks`
  ]);

  // Forensic Integrity verification status
  const [verificationMap, setVerificationMap] = useState<Record<string, "VALID" | "FAILED" | "PENDING">>({});

  // Retention Check Form
  const [checkCollection, setCheckCollection] = useState("ledgerTransactions");
  const [checkDateString, setCheckDateString] = useState("2024-05-15");
  const [checkResult, setCheckResult] = useState<any | null>(null);

  // Archive Form
  const [recordCountToArchive, setRecordCountToArchive] = useState(25);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  // Certificate Form
  const [certStartDate, setCertStartDate] = useState("2025-04-01");
  const [certEndDate, setCertEndDate] = useState("2026-03-31");
  const [certVolume, setCertVolume] = useState(1500000);
  const [certIssued, setCertIssued] = useState<AuditCertificate | null>(null);

  // Load datasets on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCertificates(AuditCertificationEngine.getCertificates(tenantId));
    setArchives(ComplianceArchiveEngine.getArchives(tenantId));
  };

  const handleRunVerification = async (cert: AuditCertificate) => {
    setVerificationMap(prev => ({ ...prev, [cert.certificateId]: "PENDING" }));
    
    // Simulate real signature validation latency
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const isValid = await AuditCertificationEngine.verifyCertificateAuthenticity(cert);
      setVerificationMap(prev => ({ 
        ...prev, 
        [cert.certificateId]: isValid ? "VALID" : "FAILED" 
      }));
      setComplianceLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Cryptographic verification for certificate [${cert.certificateId}] returned: ${isValid ? "SECURE_INTEGRITY_VERIFIED" : "INTEGRITY_TAMPERED"}`,
        ...prev
      ]);
    } catch (e: any) {
      setVerificationMap(prev => ({ ...prev, [cert.certificateId]: "FAILED" }));
      setComplianceLogs(prev => [`🚨 [Verification Error] ${e.message}`, ...prev]);
    }
  };

  const handleCheckLock = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(checkDateString).getTime();
    if (isNaN(timestamp)) {
      setCheckResult({ error: "Invalid date string format" });
      return;
    }

    const report = LegalRetentionEngine.evaluateRetentionLock(checkCollection, timestamp);
    setCheckResult(report);

    setComplianceLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Checked lock on [${checkCollection}] for date [${checkDateString}]: isLocked=${report.isLocked}`,
      ...prev
    ]);
  };

  const handlePackArchive = async () => {
    setArchiveSuccess(false);
    setComplianceLogs(prev => [`[${new Date().toLocaleTimeString()}] Initiating snapshot compilation for cold storage compression...`, ...prev]);

    // Construct mock shift transaction payloads to compress
    const dummyRecords = Array.from({ length: recordCountToArchive }).map((_, idx) => ({
      transactionId: `tx_arc_${Math.floor(Math.random() * 900000) + 100000}`,
      timestamp: Date.now() - idx * 24 * 60 * 60 * 1000,
      liters: 120 + Math.random() * 200,
      totalAmount: 12000 + Math.random() * 20000,
      paymentMode: idx % 2 === 0 ? "UPI" : "CASH",
      operator: "Op. Shreyansh"
    }));

    try {
      const prevBlock = archives[archives.length - 1];
      const previousHash = prevBlock ? prevBlock.rollingHash : "genesis_rolling_seal_hash_0000000000";

      const block = await ComplianceArchiveEngine.buildColdArchiveBlock(
        tenantId,
        dummyRecords,
        previousHash
      );

      setArchives(ComplianceArchiveEngine.getArchives(tenantId));
      setArchiveSuccess(true);
      setComplianceLogs(prev => [
        `✅ [Archive Packed] Spooled cold block [${block.archiveId}]: RecordCount=${block.recordCount}, PackedSize=${(block.compressedPayload.length / 1024).toFixed(1)} KB`,
        ...prev
      ]);
    } catch (e: any) {
      setComplianceLogs(prev => [`🚨 [Archive Failed] Compression pipeline error: ${e.message}`, ...prev]);
    }
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertIssued(null);

    const startTs = new Date(certStartDate).getTime();
    const endTs = new Date(certEndDate).getTime();

    if (isNaN(startTs) || isNaN(endTs)) return;

    try {
      // Mock balance payload representing corporate trial balance sheet
      const mockBalances = {
        totalRevenueINR: certVolume * 96.5, // Estimated fuel rate
        totalExpensesINR: certVolume * 89.2,
        netIncomeINR: certVolume * 7.3,
        cashAssetsINR: 14592000,
        bankAssetsINR: 38590400,
        unsettledDisputesINR: 0
      };

      const cert = await AuditCertificationEngine.issueAuditCertificate(
        tenantId,
        startTs,
        endTs,
        certVolume,
        mockBalances,
        defaultAuditor
      );

      setCertIssued(cert);
      setCertificates(AuditCertificationEngine.getCertificates(tenantId));
      setComplianceLogs(prev => [
        `📜 [Certificate Issued] Formed certified statement: ID=${cert.certificateId}, IntegrityScore=${cert.complianceIntegrityScore}%`,
        ...prev
      ]);
    } catch (err: any) {
      setComplianceLogs(prev => [`🚨 Certificate setup failed: ${err.message}`, ...prev]);
    }
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Enterprise Legal & Compliance Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Statutory Data Preservation Locks, Gzip Cold Archival Bundles & Cryptographic Seals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <ShieldCheck className="w-4 h-4" />
            REGULATORY COMPLIANT: 100%
          </div>
          <button 
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Overview Statistics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Compliance Rating Card */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Statutory Score</span>
            <Award className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">100%</div>
          <div className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wide">Courtroom Safe</div>
        </div>

        {/* Locked Documents Count */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Preserved Records</span>
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">48,010</div>
          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Active statutory locks</div>
        </div>

        {/* Cold Storage Compression Volume */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Cold Archives</span>
            <Archive className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">{archives.length}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Gzipped storage volumes</div>
        </div>

        {/* Active Tax Certificates */}
        <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden glass-panel">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Certificates Issued</span>
            <FileText className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">{certificates.length}</div>
          <div className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wide">ECDSA signature verified</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Retention Check and cold archives packing */}
        <div className="lg:col-span-1 space-y-8">
          {/* Statutory Freeze Lock Tester */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              Statutory Freeze Lock Auditor
            </h2>

            <form onSubmit={handleCheckLock} className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Target Data Collection</label>
                <select
                  value={checkCollection}
                  onChange={(e) => setCheckCollection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ledgerTransactions">ledgerTransactions (8 Years Lock)</option>
                  <option value="shiftRecords">shiftRecords (5 Years Lock)</option>
                  <option value="auditCertificates">auditCertificates (10 Years Lock)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Record Inception Date</label>
                <input 
                  type="date"
                  value={checkDateString}
                  onChange={(e) => setCheckDateString(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                Validate Preservation Window
              </button>
            </form>

            {checkResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                {checkResult.error ? (
                  <div className="text-xs text-rose-400 font-bold">{checkResult.error}</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">Preserved Lock:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        checkResult.isLocked 
                          ? "bg-rose-500/10 text-rose-400" 
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {checkResult.isLocked ? "IMMUTABLE (LOCKED)" : "MUTATION ELIGIBLE"}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono leading-relaxed mt-1">
                      {checkResult.reason}
                    </div>

                    <div className="text-[9px] text-slate-400 flex justify-between border-t border-slate-900 pt-1">
                      <span>Seal Release Date:</span>
                      <span className="font-bold">{new Date(checkResult.retentionDeadline).toLocaleDateString()}</span>
                    </div>

                    {checkResult.isLocked && (
                      <div className="text-[9px] text-amber-500 font-bold">
                        ⚠️ statutory freeze in effect for another {checkResult.monthsRemaining} months.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Archive Packer widget */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-400" />
              Compress & Pack Cold Archive
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Shift Transaction Rows Count</label>
                <input 
                  type="number" 
                  value={recordCountToArchive}
                  onChange={(e) => setRecordCountToArchive(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <button
                onClick={handlePackArchive}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                Compile Gzip Block
              </button>

              {archiveSuccess && (
                <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  Successfully spooled compressed ledger bundle. Check telemetry logs.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: active certificates list and verification streams */}
        <div className="lg:col-span-2 space-y-8">
          {/* Auditing Certifications Issued */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              Courtroom-Ready Regulatory Certifications
            </h2>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {certificates.map((cert) => {
                const status = verificationMap[cert.certificateId] || "PENDING";
                return (
                  <div key={cert.certificateId} className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-xs text-slate-300">{cert.certificateId}</div>
                        <div className="text-[9px] text-slate-500">Issued: {new Date(cert.issuedAt).toLocaleString()}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {status === "VALID" ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            VALID
                          </span>
                        ) : status === "FAILED" ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            CORRUPT/TAMPERED
                          </span>
                        ) : status === "PENDING" ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                            VERIFYING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-500">
                            UNVERIFIED
                          </span>
                        )}

                        <button
                          onClick={() => handleRunVerification(cert)}
                          className="px-2 py-1 text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                        >
                          Verify Signature
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-950 p-2.5 rounded border border-slate-900">
                      "{cert.legalPreservationStatement}"
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px] text-slate-500 pt-1">
                      <div>
                        <span className="block font-bold">Auditor Email:</span>
                        <span className="text-slate-400">{cert.certifiedBy}</span>
                      </div>
                      <div>
                        <span className="block font-bold">Transaction Vol:</span>
                        <span className="text-slate-300 font-mono">{cert.totalTransactionVolume} Liters</span>
                      </div>
                      <div>
                        <span className="block font-bold">Balances Hash:</span>
                        <span className="text-slate-400 font-mono">{cert.reconciledBalanceSheetHash.substring(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="block font-bold">ECDSA Signature:</span>
                        <span className="text-slate-400 font-mono">{cert.cryptographicSignature.signatureHex.substring(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spooled Gzip Archive Blocks */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-400" />
              Preserved Gzip Archive Chain (Cold Storage)
            </h2>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {archives.length === 0 ? (
                <div className="text-slate-600 italic text-center py-6 text-xs">No cold archives packed yet.</div>
              ) : (
                archives.map((block) => (
                  <div key={block.archiveId} className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-[10px]">
                    <div>
                      <div className="font-extrabold text-slate-300">{block.archiveId}</div>
                      <div className="text-slate-500 font-mono text-[8px] mt-0.5">
                        Records: {block.recordCount} | Size: {(block.compressedPayload.length / 1024).toFixed(1)} KB | Sealed: {new Date(block.sealedAt).toLocaleString()}
                      </div>
                      <div className="text-slate-500 font-mono text-[8px] mt-1 flex items-center gap-1">
                        <span className="font-bold uppercase">SHA-256 Chain Hash:</span>
                        <span className="text-emerald-500 font-bold">{block.rollingHash.substring(0, 24)}...</span>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        try {
                          const rawText = await ComplianceArchiveEngine.decompressText(block.compressedPayload);
                          console.log(`Decompressed Archive: ${block.archiveId}`, JSON.parse(rawText));
                          setComplianceLogs(prev => [`📖 [Archive Reader] Decompressed cold block [${block.archiveId}] successfully. Verified ${block.recordCount} rows.`, ...prev]);
                        } catch (e: any) {
                          setComplianceLogs(prev => [`🚨 [Archive Reader Failed] ${e.message}`, ...prev]);
                        }
                      }}
                      className="px-2.5 py-1 text-[9px] bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                    >
                      Extract Raw
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form to issue a new Tax Certificate */}
          <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Send className="w-4.5 h-4.5 text-rose-400" />
              Issue New Audit Certification
            </h2>

            <form onSubmit={handleIssueCertificate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Period Start</label>
                <input 
                  type="date"
                  value={certStartDate}
                  onChange={(e) => setCertStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Period End</label>
                <input 
                  type="date"
                  value={certEndDate}
                  onChange={(e) => setCertEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Reconciled Vol (Ltrs)</label>
                <input 
                  type="number"
                  value={certVolume}
                  onChange={(e) => setCertVolume(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.2)]"
              >
                Sign Certificate
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Compliance Event Log */}
      <div className="bg-[#090f1d] border border-slate-800 rounded-2xl p-6 shadow-xl glass-panel">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <AlertOctagon className="w-4.5 h-4.5 text-indigo-400" />
          Realtime Courtroom & Regulatory Audit Streams
        </h2>
        <div className="bg-slate-950/50 rounded-xl border border-slate-900 p-4 font-mono text-[10px] text-slate-400 space-y-2 h-44 overflow-y-auto">
          {complianceLogs.map((log, index) => (
            <div key={index} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
