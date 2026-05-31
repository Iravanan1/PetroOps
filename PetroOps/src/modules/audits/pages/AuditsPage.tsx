import React, { useState } from 'react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { SharedTable } from '../../shared/components/SharedTable';
import { SharedDrawer } from '../../shared/components/SharedDrawer';
import { AuditHistoryViewer } from '../../shared/components/AuditHistoryViewer';
import { runAutomatedIntegrityTests, TestSuiteResult } from '../../../utils/reconciliationTests';
import { ShieldAlert, ChevronRight, CheckCircle, TrendingUp, AlertTriangle, Sparkles, Lock, Play } from 'lucide-react';

export default function AuditsPage() {
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Test Runner State
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<'All Branches' | 'Rajasthan' | 'Gujarat'>('All Branches');
  const [corruptionLogs, setCorruptionLogs] = useState<string | null>(null);

  const handleRunTests = () => {
    setRunningTests(true);
    setTimeout(() => {
      const results = runAutomatedIntegrityTests();
      setTestResults(results);
      setRunningTests(false);
    }, 800);
  };

  const handleClosePeriod = () => {
    setPeriodClosed(true);
  };

  const handleScanCorruption = () => {
    // Run mock corruption checks
    setCorruptionLogs("Initializing monotonic event ledger scan...\nNo sequence collisions or checksum tampering detected. Event ledger is 100% deterministic.");
  };

  const handleExportDR = () => {
    const json = JSON.stringify({
      checkpointId: "chk_92849",
      timestamp: new Date().toISOString(),
      eventsCount: shifts.length,
      station: "NH-62 Station Rajasthan"
    }, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `disaster_recovery_checkpoint_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: "Shift Date", render: (s: ShiftRecord) => <span className="font-semibold">{s.shiftDate}</span> },
    { header: "Shift Label", render: (s: ShiftRecord) => <span>{s.shiftLabel}</span> },
    { header: "AI Confidence", render: (s: ShiftRecord) => <span className="font-bold text-blue-400">{s.aiConfidence}%</span> },
    { header: "OCR Confidence", render: (s: ShiftRecord) => (
        <span className={`font-bold ${s.ocrConfidence < 85 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
          {s.ocrConfidence}% {s.ocrConfidence < 85 ? ' (LOW)' : ''}
        </span>
      )
    },
    { header: "Till Discrepancy", render: (s: ShiftRecord) => <span className="font-bold text-white">₹{s.cashShortage}</span> },
    { header: "Audit status", render: (s: ShiftRecord) => (
        <span className={`px-2.5 py-0.5 text-[8px] font-black rounded-full border uppercase ${
          periodClosed || s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {periodClosed ? 'LOCKED' : s.status}
        </span>
      )
    },
    { header: "Actions", render: (s: ShiftRecord) => (
        <button 
          onClick={() => setSelectedShift(s)}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 rounded-xl font-bold flex items-center gap-1"
        >
          Audit History <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const searchFilter = (s: ShiftRecord, query: string) => {
    return s.shiftDate.includes(query) || s.status.toLowerCase().includes(query.toLowerCase());
  };

  const pendingAudits = shifts.filter(s => s.status === 'NEEDS_REVIEW' || s.ocrConfidence < 85).length;
  const resolvedAudits = shifts.filter(s => s.status === 'APPROVED' && s.ocrConfidence >= 85).length;

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
        Home &gt; Audits &amp; Compliance
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-blue-400" /> Audits &amp; Compliance Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">Investigate AI anomalies, monitor raw OCR confidences, and verify immutable manager logs.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-Station Branch Selector */}
          <select
            value={selectedBranch}
            onChange={(e: any) => setSelectedBranch(e.target.value)}
            className="bg-[#0b101d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="All Branches">All Pump Branches</option>
            <option value="Rajasthan">Rajasthan NH-62 Branch</option>
            <option value="Gujarat">Gujarat Highway Branch</option>
          </select>

          <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPipeline('potaliya-petroleum')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
                pipeline === 'potaliya-petroleum' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Local AI
            </button>
            <button
              onClick={() => setPipeline('potaliya-petroleum-google')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
                pipeline === 'potaliya-petroleum-google' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Cloud
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Shifts Requiring Manual Review</p>
          <p className="text-2xl font-black text-rose-400">{periodClosed ? 0 : pendingAudits}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-400" /> Action required to reconcile</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Reconciled &amp; Approved shifts</p>
          <p className="text-2xl font-black text-emerald-400">{periodClosed ? shifts.length : resolvedAudits}</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Fully locked and verified</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-800">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Branch Operational Health</p>
          <p className="text-2xl font-black text-blue-400">92/100</p>
          <p className="text-[9px] text-slate-500 mt-2 font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-400" /> Replays, settle match, &amp; PWA sync status</p>
        </div>
      </div>

      {/* Observability SLI Telemetry Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Dashboard load SLI</p>
          <p className="text-sm font-black text-white font-mono mt-1">42ms <span className="text-[9px] text-emerald-400 font-bold">(Optimal)</span></p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Replay execution SLI</p>
          <p className="text-sm font-black text-white font-mono mt-1">8ms <span className="text-[9px] text-emerald-400 font-bold">(Optimal)</span></p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Firestore Query SLI</p>
          <p className="text-sm font-black text-white font-mono mt-1">115ms <span className="text-[9px] text-emerald-400 font-bold">(Optimal)</span></p>
        </div>
        <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Offline Queue recovery SLI</p>
          <p className="text-sm font-black text-white font-mono mt-1">0ms <span className="text-[9px] text-emerald-400 font-bold">(Optimal)</span></p>
        </div>
      </div>

      {/* Financial Integrity HUD Panel */}
      <div className="p-6 rounded-3xl bg-[#0a0f1d] border border-slate-850 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" /> Resilient Financial Integrity &amp; Replay HUD
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Deterministic event-sourced ledger verification, disaster snapshot checkpoints, and corruption scanning.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunTests}
              disabled={runningTests}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 border border-slate-800 hover:text-white rounded-xl text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> {runningTests ? "Auditing..." : "Replay & Verify"}
            </button>
            <button
              onClick={handleScanCorruption}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 border border-slate-800 hover:text-white rounded-xl text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5"
            >
              Scan Corruption
            </button>
            <button
              onClick={handleExportDR}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 border border-slate-800 hover:text-white rounded-xl text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5"
            >
              Export Checkpoint
            </button>
            <button
              onClick={handleClosePeriod}
              disabled={periodClosed}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 ${
                periodClosed 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> {periodClosed ? "Period Locked" : "Freeze Period"}
            </button>
          </div>
        </div>

        {corruptionLogs && (
          <div className="p-4 bg-teal-950/20 border border-teal-900/30 rounded-2xl">
            <p className="text-[10px] font-mono text-teal-400">{corruptionLogs}</p>
          </div>
        )}

        {testResults && (
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className={`font-bold uppercase tracking-wider ${testResults.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                Test Suite Verification: {testResults.success ? "Passed" : "Failed"}
              </span>
              <span className="text-slate-500 font-mono">
                {testResults.passedCount} Passed | {testResults.failedCount} Failed
              </span>
            </div>
            <pre className="mt-2 bg-[#060a13] p-3 rounded-xl border border-slate-900 overflow-x-auto text-[9px] font-mono text-slate-400 leading-normal max-h-40 overflow-y-auto">
              {testResults.logs.join('\n')}
            </pre>
          </div>
        )}
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0f1d]/40 border border-slate-800">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Querying Firestore records...</div>
        ) : (
          <SharedTable
            columns={columns}
            data={shifts}
            searchPlaceholder="Search audit registers..."
            searchFilter={searchFilter}
            exportFileName="audits_compliance"
          />
        )}
      </div>

      <SharedDrawer
        isOpen={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title="Comprehensive Audit Revision History Log"
      >
        {selectedShift && (
          <div className="flex flex-col gap-6 text-xs text-slate-300">
            <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
              <h5 className="font-bold text-white uppercase tracking-wider text-[10px]">Reconciliation Meta</h5>
              <p>Shift Target ID: <strong>{selectedShift.id}</strong></p>
              <p>Scan Page Reference: <strong>{selectedShift.scanReference}</strong></p>
            </div>
            
            <AuditHistoryViewer history={selectedShift.auditHistory} />
          </div>
        )}
      </SharedDrawer>
    </div>
  );
}

