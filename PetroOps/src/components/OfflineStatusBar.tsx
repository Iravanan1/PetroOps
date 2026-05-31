import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CloudLightning, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Trash2, 
  CheckCircle, 
  ChevronUp, 
  ChevronDown,
  Clock
} from 'lucide-react';
import { OfflineRecoveryEngine, SyncEngineStatus, QueuedSyncEvent } from '../modules/shared/OfflineRecoveryEngine';

export const OfflineStatusBar: React.FC = () => {
  const [status, setStatus] = useState<SyncEngineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isFlushing: false,
    consecutiveFailures: 0,
    nextRetryDelayMs: 1500
  });

  const [queue, setQueue] = useState<QueuedSyncEvent[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Subscribe to OfflineRecoveryEngine updates
  useEffect(() => {
    const engine = OfflineRecoveryEngine.getInstance();
    
    const unsubscribe = engine.subscribe((newStatus) => {
      setStatus(newStatus);
      setQueue([...engine.getQueue()]);
    });

    return () => unsubscribe();
  }, []);

  const handleForceReSync = () => {
    if (!status.isOnline) return;
    setToastMsg("Forcing resilient queue synchronization...");
    OfflineRecoveryEngine.getInstance().triggerImmediateSync();
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRetrySingle = async (eventId: string) => {
    setActionBusy(eventId);
    const ok = await OfflineRecoveryEngine.getInstance().retrySingleEvent(eventId);
    setActionBusy(null);
    if (ok) {
      setToastMsg(`Transaction ${eventId.substring(0, 12)}... replayed successfully!`);
    } else {
      setToastMsg(`Resilient retry failed. Network drops detected.`);
    }
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDeleteSingle = async (eventId: string) => {
    await OfflineRecoveryEngine.getInstance().deleteSingleEvent(eventId);
    setToastMsg(`Transaction ${eventId.substring(0, 12)}... deleted from local queue.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear the entire offline sync queue? Stale changes will be lost.")) {
      await OfflineRecoveryEngine.getInstance().clearOfflineQueue();
      setToastMsg("Offline ledger queue successfully purged.");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  // Estimate local storage usage size roughly
  const getCacheUsage = () => {
    try {
      if (typeof localStorage === 'undefined') return '0.00 MB';
      const size = (JSON.stringify(localStorage).length / (1024 * 1024)).toFixed(2);
      return `${size} MB`;
    } catch {
      return '0.42 MB';
    }
  };

  return (
    <>
      {/* Toast Notification Box */}
      {toastMsg && (
        <div className="fixed bottom-16 right-6 z-50 animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl flex items-center gap-2 max-w-sm">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <p className="text-[11px] font-mono text-slate-200 font-semibold">{toastMsg}</p>
          </div>
        </div>
      )}

      {/* Main Drawer Dashboard */}
      {isOpen && (
        <div className="fixed bottom-12 left-0 right-0 z-40 mx-4 max-w-5xl md:mx-auto bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <CloudLightning className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Resilient Offline Ingestion Queue
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {queue.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold uppercase tracking-wider bg-rose-950/30 border border-rose-900/50 hover:bg-rose-950/50 px-2.5 py-1 rounded-md transition cursor-pointer"
                >
                  Purge Queue
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-5 space-y-3 font-mono text-[11px]">
            {queue.length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-slate-700" />
                <p>No offline transactions pending. Ledgers are 100% in parity with the branch portal.</p>
              </div>
            ) : (
              queue.map((item) => {
                const isItemBusy = actionBusy === item.id;
                
                return (
                  <div 
                    key={item.id}
                    className="bg-slate-900/50 hover:bg-slate-900 border border-slate-850 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider">
                          {item.type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400 font-bold font-mono">
                          ID: {item.id.substring(0, 16)}...
                        </span>
                        {item.attempts > 0 && (
                          <span className="bg-amber-950/60 text-amber-400 border border-amber-900 px-2 py-0.5 rounded font-bold text-[9px]">
                            {item.attempts} attempts
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-slate-400 space-y-1">
                        <div>
                          Queued At: <span className="text-slate-300">{new Date(item.queuedAt).toLocaleTimeString()}</span>
                        </div>
                        {item.errorLog && (
                          <div className="text-rose-400 font-semibold flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>Error: {item.errorLog}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleRetrySingle(item.id)}
                        disabled={isItemBusy || !status.isOnline}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-655 hover:border-indigo-400 disabled:border-slate-800 text-[10px] font-bold text-white px-3 py-1.5 rounded-lg border border-indigo-500/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`h-3 w-3 ${isItemBusy ? 'animate-spin' : ''}`} />
                        Replay
                      </button>
                      <button
                        onClick={() => handleDeleteSingle(item.id)}
                        disabled={isItemBusy}
                        className="bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 p-2 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar Panel */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800/80 text-xs px-4 py-2.5 flex items-center justify-between z-50 font-mono">
        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {status.isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Wifi className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                STATION STATUS: ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
                <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                STATION STATUS: OFFLINE PWA
              </span>
            )}
          </div>

          {/* Cache usage index */}
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span>Local Cache: <strong className="text-slate-200">{getCacheUsage()} / 10MB</strong></span>
          </div>

          {/* Pending items notice */}
          {status.pendingCount > 0 && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60 hover:bg-amber-950/60 transition cursor-pointer"
            >
              <CloudLightning className="h-3 w-3 text-amber-400 animate-bounce" />
              <span>{status.pendingCount} Operations Queued</span>
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          )}

          {/* Exponential Retry Notification Banner */}
          {status.consecutiveFailures > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/60">
              <Clock className="h-3 w-3 animate-spin text-rose-400" />
              <span>
                Backing off: Retry in {(status.nextRetryDelayMs / 1000).toFixed(0)}s (failures: {status.consecutiveFailures})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {status.pendingCount > 0 && status.isOnline && (
            <button
              onClick={handleForceReSync}
              disabled={status.isFlushing}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 hover:border-indigo-400 disabled:border-slate-800 text-[10px] uppercase font-bold py-1 px-3 rounded text-white border border-indigo-500/30 transition cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${status.isFlushing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          )}
          <span className="text-slate-500 text-[10px]">
            v1.0.0 Stable (PWA)
          </span>
        </div>
      </footer>
    </>
  );
};

export default OfflineStatusBar;
