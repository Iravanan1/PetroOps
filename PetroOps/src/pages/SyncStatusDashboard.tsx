import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, 
  Trash2, Play, Activity, Clock, ShieldAlert, FileText, Database, ArrowRight
} from 'lucide-react';
import { OfflineRecoveryEngine, QueuedSyncEvent, SyncEngineStatus } from '../modules/shared/OfflineRecoveryEngine';
import { useAuthStore } from '../store/useAuthStore';

export default function SyncStatusDashboard() {
  const { user } = useAuthStore();
  const [engineStatus, setEngineStatus] = useState<SyncEngineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isFlushing: false,
    consecutiveFailures: 0,
    nextRetryDelayMs: 1500
  });

  const [queue, setQueue] = useState<QueuedSyncEvent[]>([]);
  const [telemetry, setTelemetry] = useState<Array<{ eventId: string; success: boolean; durationMs: number }>>([]);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadEngineState = useCallback(() => {
    const engine = OfflineRecoveryEngine.getInstance();
    setEngineStatus(engine.getStatus());
    setQueue([...engine.getQueue()]);
    setTelemetry([...engine.getTelemetryMetrics()]);
  }, []);

  useEffect(() => {
    const engine = OfflineRecoveryEngine.getInstance();
    
    // Subscribe to real-time sync status updates
    const unsubscribe = engine.subscribe((status) => {
      setEngineStatus(status);
      setQueue([...engine.getQueue()]);
      setTelemetry([...engine.getTelemetryMetrics()]);
    });

    loadEngineState();

    return () => unsubscribe();
  }, [loadEngineState]);

  const handleForceSync = async () => {
    setBusyEventId('force_all');
    try {
      const engine = OfflineRecoveryEngine.getInstance();
      engine.triggerImmediateSync();
      showToast('Synchronization sync flow triggered successfully');
      loadEngineState();
    } catch (err: any) {
      showToast(err?.message || 'Sync flush execution failed', false);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleRetrySingle = async (eventId: string) => {
    setBusyEventId(eventId);
    try {
      const engine = OfflineRecoveryEngine.getInstance();
      const ok = await engine.retrySingleEvent(eventId);
      if (ok) {
        showToast(`Event sync success: ${eventId}`);
      } else {
        showToast(`Sync failed. Event remains in local queue.`, false);
      }
      loadEngineState();
    } catch (err: any) {
      showToast(err?.message || 'Manual replay failed', false);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDeleteSingle = async (eventId: string) => {
    if (!window.confirm('Delete this pending event from local database? This could cause ledger desynchronization if already reconciled.')) {
      return;
    }
    try {
      const engine = OfflineRecoveryEngine.getInstance();
      await engine.deleteSingleEvent(eventId);
      showToast('Event removed from offline ledger queue');
      loadEngineState();
    } catch (err: any) {
      showToast(err?.message || 'Delete operation failed', false);
    }
  };

  const handleClearQueue = async () => {
    if (!window.confirm('WARNING: Are you absolutely sure you want to clear the entire offline operations queue? This will purge all un-synced shift drafts, OCR corrections, and ledger payments. This action is irreversible.')) {
      return;
    }
    try {
      const engine = OfflineRecoveryEngine.getInstance();
      await engine.clearOfflineQueue();
      showToast('All buffered offline transactions successfully purged');
      loadEngineState();
    } catch (err: any) {
      showToast(err?.message || 'Purge queue failed', false);
    }
  };

  const fmtType = (type: string) => {
    switch (type) {
      case 'shift_entry': return 'Shift Ingestion Draft';
      case 'nozzle_update': return 'Nozzle Meter Read';
      case 'credit_recovery': return 'Credit Recoveries Transaction';
      case 'manager_override': return 'Audit Policy Override';
      case 'ocr_correction': return 'OCR Ground-Truth Manual Correction';
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans pb-20">
      
      {/* Toast Notification Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold
          transition-all duration-300 animate-in fade-in slide-in-from-top-4
          ${toast.ok
            ? 'bg-[#2E7D32]/5 border-[#2E7D32]/25 text-[#2E7D32]'
            : 'bg-[#C62828]/5 border-[#C62828]/25 text-[#C62828]'}`}>
          {toast.ok ? <CheckCircle2 className="w-4.5 h-4.5 text-[#2E7D32]" /> : <AlertTriangle className="w-4.5 h-4.5 text-[#C62828]" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Offline Banner Alert */}
        {!engineStatus.isOnline && (
          <div className="bg-[#C62828]/5 border border-[#C62828]/20 rounded-2xl p-4.5 flex items-center gap-3.5 animate-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-[#C62828]/10 text-[#C62828] rounded-xl">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-[#C62828] uppercase tracking-wider">Device Physical Connection Offline</h4>
              <p className="text-[11px] text-[#C62828]/80 mt-0.5 leading-relaxed font-medium">
                PumpAI has automatically engaged local offline isolation safety parameters. All shift adjustments, billing transactions, and OCR validations are running on IndexedDB. Operations will sync automatically on internet reconnection.
              </p>
            </div>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EBEBEA] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Offline Queue & Sync Dashboard</h1>
                <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Replay-Safe Sync Controller & Telemetry logs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border transition-all duration-300
              ${engineStatus.isOnline 
                ? 'bg-[#2E7D32]/5 border-[#2E7D32]/20 text-[#2E7D32]' 
                : 'bg-[#C62828]/5 border-[#C62828]/20 text-[#C62828]'}`}>
              {engineStatus.isOnline ? (
                <><Wifi className="w-3.5 h-3.5 text-[#2E7D32] animate-pulse" /> Live Connected</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5 text-[#C62828]" /> Offline Isolated</>
              )}
            </span>
          </div>
        </div>

        {/* Telemetry Indicator Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Pending Event Ingestion</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-[#1A1A1A]">
                {engineStatus.pendingCount}
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1 uppercase tracking-wider">
                {engineStatus.pendingCount > 0 ? 'Queued Local Transactions' : 'Ledgers Balanced & Synced'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-4.5 h-4.5 text-[#D35400]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Replay Failures</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-extrabold ${engineStatus.consecutiveFailures > 0 ? 'text-[#C62828]' : 'text-[#1A1A1A]'}`}>
                {engineStatus.consecutiveFailures}
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Consecutive synchronization attempts failed
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Backoff Delay</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-[#1A1A1A]">
                {(engineStatus.nextRetryDelayMs / 1000).toFixed(1)}s
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Exponential backoff delay interval
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Thread Status</span>
            </div>
            <div className="mt-2">
              <div className={`text-xl font-bold uppercase tracking-widest ${engineStatus.isFlushing ? 'text-amber-600' : 'text-[#2E7D32]'}`}>
                {engineStatus.isFlushing ? 'Syncing...' : 'Idle Secure'}
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Active thread dispatcher status
              </p>
            </div>
          </div>

        </div>

        {/* Global Operational Controls */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Resilient Synchronization System</h2>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                PumpAI coordinates transactions on-site with automatic replay verification checks. In case of localized network drops or tablet power failures, transactions accumulate securely in IndexedDB and are deterministically uploaded to prevent balance parity distortion.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-0 shrink-0">
              {queue.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="flex items-center justify-center gap-2 bg-white hover:bg-[#C62828]/5 hover:text-[#C62828] text-[#666666] border border-[#EBEBEA] hover:border-[#C62828]/25 rounded-xl py-3 px-4.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge Local Queue
                </button>
              )}

              <button
                onClick={handleForceSync}
                disabled={busyEventId !== null || engineStatus.pendingCount === 0 || !engineStatus.isOnline}
                className="flex items-center justify-center gap-2 bg-[#D35400] hover:bg-[#A04000] disabled:opacity-50 text-white rounded-xl py-3 px-5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-xs"
              >
                {busyEventId === 'force_all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Force Synchronization
              </button>
            </div>
          </div>

          {!engineStatus.isOnline && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-[11px] text-[#666666] leading-relaxed">
              <span className="font-bold text-amber-700 block mb-0.5">⚠️ Sync Suspended</span>
              Physical network loop is offline. Reconnect your router or tablet wifi to clear the {engineStatus.pendingCount} pending local updates.
            </div>
          )}
        </div>

        {/* Offline Ingestion Queue Table */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EBEBEA] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Pending Offline Queue Registry</h2>
              <p className="text-[10px] text-[#999999] uppercase tracking-wider mt-0.5">List of operations awaiting server synchronization</p>
            </div>
            <span className="text-[10px] bg-[#F3F3F1] border border-[#D9D9D6] px-3 py-1 rounded-full text-[#666666] font-bold">
              {queue.length} Active Records
            </span>
          </div>

          <div className="overflow-x-auto">
            {queue.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9F9F8] border-b border-[#EBEBEA]">
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[#666666]">Event Metadata</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[#666666]">Category / Branch</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[#666666]">Queued Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[#666666] text-center">Retries</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[#666666] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEA]">
                  {queue.map((evt) => {
                    const hasError = evt.errorLog || evt.attempts > 0;
                    const isExpanded = expandedErrorId === evt.id;

                    return (
                      <React.Fragment key={evt.id}>
                        <tr className={`hover:bg-[#F9F9F8]/50 transition ${hasError ? 'bg-[#C62828]/[0.01]' : ''}`}>
                          
                          {/* Event Metadata */}
                          <td className="p-4">
                            <div className="font-mono text-xs font-semibold text-[#1A1A1A] tracking-tight">{evt.id}</div>
                            {evt.errorLog && (
                              <button 
                                onClick={() => setExpandedErrorId(isExpanded ? null : evt.id)}
                                className="text-[10px] text-[#C62828] font-bold mt-1 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-[#C62828]" />
                                Click to View Replay Error Log
                              </button>
                            )}
                          </td>

                          {/* Category / Branch */}
                          <td className="p-4">
                            <div className="text-xs font-semibold text-[#1A1A1A]">{fmtType(evt.type)}</div>
                            <div className="text-[10px] text-[#999999] uppercase tracking-widest font-bold mt-0.5">Branch: {evt.branchId || 'On-Site Tablet'}</div>
                          </td>

                          {/* Queued Date */}
                          <td className="p-4 text-xs font-semibold text-[#666666]">
                            {new Date(evt.queuedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>

                          {/* Retries count */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-full
                              ${evt.attempts > 0 
                                ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' 
                                : 'bg-[#2E7D32]/5 text-[#2E7D32] border border-[#2E7D32]/10'}`}>
                              {evt.attempts}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => handleRetrySingle(evt.id)}
                                disabled={busyEventId === evt.id || !engineStatus.isOnline}
                                title="Force individual transaction replay"
                                className="p-2 border border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#F3F3F1] hover:border-[#D9D9D6] rounded-lg transition disabled:opacity-50 cursor-pointer"
                              >
                                {busyEventId === evt.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-[#D35400]" />
                                ) : (
                                  <Play className="w-4 h-4 text-[#D35400]" />
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteSingle(evt.id)}
                                title="Delete pending transaction draft"
                                className="p-2 border border-transparent hover:border-[#C62828]/20 text-[#666666] hover:bg-[#C62828]/5 hover:text-[#C62828] rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* Expansive Error Log Block */}
                        {isExpanded && evt.errorLog && (
                          <tr>
                            <td colSpan={5} className="bg-[#C62828]/[0.03] border-b border-[#EBEBEA] p-4.5 text-xs text-[#C62828]">
                              <div className="font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4" /> Ledger Synchronization Refusal Report
                              </div>
                              <div className="font-mono bg-[#C62828]/5 border border-[#C62828]/10 rounded-xl p-3 mt-1.5 whitespace-pre-wrap leading-relaxed">
                                {evt.errorLog}
                              </div>
                              {evt.lastAttemptAt && (
                                <p className="text-[10px] text-[#999999] mt-2 font-medium">
                                  Last upload dispatch attempt: {new Date(evt.lastAttemptAt).toLocaleString()}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-[#999999] text-xs font-semibold leading-relaxed max-w-md mx-auto">
                <div className="p-4 rounded-full bg-[#2E7D32]/5 border border-[#2E7D32]/10 text-[#2E7D32] w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                All transactions safely synchronous. The database offline queue is fully settled and local ledger entries are perfectly matching the remote server endpoints.
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Chronological Sync Log */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-[#EBEBEA] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Active Telemetry & Sync Logs</h2>
              <p className="text-[10px] text-[#999999] uppercase tracking-wider mt-0.5">Past synchronization cycle metrics and duration diagnostics</p>
            </div>
            <button
              onClick={loadEngineState}
              className="p-1.5 hover:bg-[#F3F3F1] border border-transparent hover:border-[#D9D9D6] rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4 text-[#666666]" />
            </button>
          </div>

          <div className="divide-y divide-[#EBEBEA] max-h-72 overflow-y-auto">
            {telemetry.length > 0 ? (
              [...telemetry].reverse().map((log, i) => (
                <div key={`${log.eventId}-${i}`} className="flex items-center justify-between p-4 hover:bg-[#F9F9F8]/50 transition">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${log.success ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`} />
                    <div>
                      <div className="text-xs font-mono font-semibold text-[#1A1A1A]">{log.eventId}</div>
                      <span className="text-[10px] text-[#666666] font-medium tracking-wide uppercase mt-0.5 block">
                        Sync Duration: <strong className="text-[#1A1A1A]">{log.durationMs} ms</strong>
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-widest border px-2.5 py-1 rounded-full
                    ${log.success 
                      ? 'bg-[#2E7D32]/5 border-[#2E7D32]/10 text-[#2E7D32]' 
                      : 'bg-[#C62828]/5 border-[#C62828]/10 text-[#C62828]'}`}>
                    {log.success ? 'Replay OK' : 'Failure'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#999999] text-xs font-medium">
                No chronological synchronization runs recorded in active memory telemetry.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
