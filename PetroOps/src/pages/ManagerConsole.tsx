import React, { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  FileText,
  ShieldAlert,
  ArrowRightLeft,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Plus
} from 'lucide-react';
import { OfflineStatusBar } from '../components/OfflineStatusBar';

interface DiscrepancyRecord {
  id: string;
  attendant: string;
  shift: string;
  date: string;
  field: string;
  expected: string;
  actual: string;
  variance: string;
  severity: 'high' | 'medium' | 'low';
}

interface PendingApproval {
  id: string;
  attendant: string;
  shift: string;
  time: string;
  nozzleVariance: string;
  cashVariance: string;
  needsOverride: boolean;
}

export const ManagerConsole: React.FC = () => {
  const [discrepancyList, setDiscrepancyList] = useState<DiscrepancyRecord[]>([
    { id: 'disc_1', attendant: 'Ramesh Kumar', shift: 'Night (B)', date: '2026-05-21', field: 'Card Swipe POS sales', expected: '₹ 89,450', actual: '₹ 87,450', variance: '- ₹ 2,000', severity: 'high' },
    { id: 'disc_2', attendant: 'Suresh Patil', shift: 'Day (A)', date: '2026-05-20', field: 'Diesel Nozzle Sales (L)', expected: '1,450.20 L', actual: '1,455.50 L', variance: '+ 5.30 L', severity: 'medium' },
  ]);

  const [approvals, setApprovals] = useState<PendingApproval[]>([
    { id: 'app_1', attendant: 'Ramesh Kumar', shift: 'Night (B)', time: '06:30 AM', nozzleVariance: '+ 0.00 L', cashVariance: '- ₹ 2,000', needsOverride: true },
    { id: 'app_2', attendant: 'Amit Singh', shift: 'Day (A)', time: '02:00 PM', nozzleVariance: '+ 1.20 L', cashVariance: '₹ 0', needsOverride: false }
  ]);

  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [activeOverride, setActiveOverride] = useState<PendingApproval | null>(null);
  const [overrideRemarks, setOverrideRemarks] = useState<string>('');
  const [overrideLogs, setOverrideLogs] = useState<string[]>([]);

  const handleApproveShift = (id: string, override = false) => {
    // Approve Attendant Shift
    setApprovals(prev => prev.filter(app => app.id !== id));
    
    // If it was overridden, log it in our corporate governance auditing service
    if (override && activeOverride) {
      setOverrideLogs(prev => [
        ...prev,
        `[Override] Approved shift for ${activeOverride.attendant} (${activeOverride.shift}) with Remarks: "${overrideRemarks}"`
      ]);
    }
    
    setShowOverrideModal(false);
    setActiveOverride(null);
    setOverrideRemarks('');
  };

  const getSeverityBadge = (sev: 'high' | 'medium' | 'low') => {
    if (sev === 'high') return 'bg-rose-950/80 border border-rose-500/50 text-rose-300';
    if (sev === 'medium') return 'bg-amber-950/80 border border-amber-500/50 text-amber-300';
    return 'bg-slate-800 text-slate-400';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16 font-sans">
      {/* Manager Header */}
      <nav className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Manager Control Center</h1>
            <p className="text-slate-400 text-xs">MUMBAI HIGHWAY MERCHANT #04</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">Station Status: <strong className="text-emerald-400">SECURE</strong></span>
        </div>
      </nav>

      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Discrepancy & Wetstock Alerts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Shift discrepancies checklist */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5" />
              Immediate Shift Discrepancies
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5">Operator</th>
                    <th className="py-2.5">Field</th>
                    <th className="py-2.5">Expected</th>
                    <th className="py-2.5">Actual</th>
                    <th className="py-2.5 text-right">Variance</th>
                    <th className="py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancyList.map((disc) => (
                    <tr key={disc.id} className="border-b border-slate-850 hover:bg-slate-900/50">
                      <td className="py-3 font-medium text-white">{disc.attendant} ({disc.shift})</td>
                      <td className="py-3 text-slate-300">{disc.field}</td>
                      <td className="py-3 font-mono text-slate-450">{disc.expected}</td>
                      <td className="py-3 font-mono text-slate-200">{disc.actual}</td>
                      <td className="py-3 text-right font-mono text-rose-400 font-bold">{disc.variance}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadge(disc.severity)}`}>
                          REQUIRES REVIEW
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wet stock variance warnings */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <TrendingDown className="h-4.5 w-4.5" />
              Fuel Stock Volume Variance Warnings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase">MS (Motor Spirit / Petrol)</h3>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">Variance: + 5.20 L</div>
                  <p className="text-[10px] text-slate-550 mt-0.5">Calculated within safe limits (0.3% of sales)</p>
                </div>
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              </div>

              <div className="bg-slate-900/80 p-4 rounded-lg border border-rose-900/40 flex justify-between items-start animate-pulse">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase">HSD (High Speed Diesel)</h3>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-1">Variance: - 18.50 L</div>
                  <p className="text-[10px] text-slate-450 mt-0.5">WARNING: Out of safe bounds (0.8% variance)</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Approval Queues */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
              Attendant Shift Closings Approval
            </h2>

            <div className="space-y-3">
              {approvals.map((app) => (
                <div key={app.id} className="bg-slate-900/80 p-4 rounded-lg border border-slate-850 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-xs text-white">{app.attendant}</div>
                      <div className="text-[10px] text-slate-400">{app.shift} Shift closing at {app.time}</div>
                    </div>
                    {app.needsOverride && (
                      <span className="text-[9px] bg-rose-950/80 border border-rose-900 text-rose-400 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                        OVERRIDE NEEDED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b border-slate-800 py-2">
                    <div>
                      <span className="text-slate-500">Nozzle Var:</span>
                      <span className="text-slate-300 ml-1">{app.nozzleVariance}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Till Var:</span>
                      <span className={`ml-1 font-bold ${app.cashVariance.includes('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {app.cashVariance}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {app.needsOverride ? (
                      <button
                        onClick={() => {
                          setActiveOverride(app);
                          setShowOverrideModal(true);
                        }}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded text-[10px] uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Credentials Override
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproveShift(app.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded text-[10px] uppercase transition cursor-pointer"
                      >
                        Approve Shift Close
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {approvals.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">
                  All active attendant closing shifts are approved and reconciled.
                </div>
              )}
            </div>
          </div>

          {/* Supervisor override logs */}
          {overrideLogs.length > 0 && (
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Override audit history
              </h2>
              <div className="bg-slate-900/80 rounded p-3 text-[10px] text-slate-400 space-y-1.5 font-mono max-h-40 overflow-y-auto">
                {overrideLogs.map((log, idx) => (
                  <div key={idx} className="border-b border-slate-850 pb-1 last:border-0">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERRIDE DIALOG OVERLAY */}
      {showOverrideModal && activeOverride && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-sm uppercase">Supervisor Override Clearance</h3>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-400">
                You are manually overriding a cash variance warning of <strong>{activeOverride.cashVariance}</strong> for attendant <strong>{activeOverride.attendant}</strong>. This event will be logged in the immutable audit trail.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase block font-bold">Authorized pin / override key</label>
                  <input
                    type="password"
                    placeholder="Enter Supervisor PIN..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-200 mt-1 outline-none focus:border-indigo-500 font-mono text-center tracking-widest"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase block font-bold">Override rationale notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide reason for approval (e.g. attendant card machine mismatch resolved)..."
                    value={overrideRemarks}
                    onChange={(e) => setOverrideRemarks(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setActiveOverride(null);
                  }}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded text-[10px] uppercase transition cursor-pointer"
                >
                  Cancel Override
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveShift(activeOverride.id, true)}
                  disabled={!overrideRemarks}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-bold py-2.5 rounded text-[10px] uppercase transition cursor-pointer"
                >
                  Clear Discrepancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync bar */}
      <OfflineStatusBar />
    </div>
  );
};

export default ManagerConsole;
