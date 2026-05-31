import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Database, 
  RefreshCw, 
  Terminal, 
  TrendingUp, 
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  FileText
} from 'lucide-react';
import { OfflineRecoveryEngine, SyncEngineStatus, QueuedSyncEvent } from '../modules/shared/OfflineRecoveryEngine';

export const ProductionObservabilityConsole: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isOnline: true,
    pendingCount: 0,
    isFlushing: false,
    consecutiveFailures: 0,
    nextRetryDelayMs: 1500
  });

  const [queueItems, setQueueItems] = useState<QueuedSyncEvent[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [dbWrites, setDbWrites] = useState<number>(142);
  const [dbReads, setDbReads] = useState<number>(1829);
  const [activeTab, setActiveTab] = useState<'latency' | 'sync' | 'firestore'>('latency');

  useEffect(() => {
    const engine = OfflineRecoveryEngine.getInstance();
    
    // Subscribe to sync engine status shifts
    const unsubscribe = engine.subscribe((status) => {
      setSyncStatus(status);
      setQueueItems(engine.getQueue());
      setTelemetryLogs(engine.getTelemetryMetrics());
    });

    // Simulate incremental firestore R/W updates
    const interval = setInterval(() => {
      setDbReads(prev => prev + Math.floor(Math.random() * 4));
      if (Math.random() > 0.7) {
        setDbWrites(prev => prev + 1);
      }
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleForceSync = () => {
    OfflineRecoveryEngine.getInstance().triggerImmediateSync();
  };

  const simulatedOcrStats = [
    { name: 'Average Ingestion Latency', value: '4.2s', delta: '-0.3s', trend: 'optimal' },
    { name: 'Consensus Decision Speed', value: '320ms', delta: '-12ms', trend: 'optimal' },
    { name: 'Multi-Engine Sync Agreement', value: '99.4%', delta: '+0.1%', trend: 'optimal' },
    { name: 'Manual Override Rate', value: '1.2%', valueColor: 'text-indigo-400' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-200 font-sans">
      
      {/* HUD Telemetry Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-indigo-600 bg-clip-text text-transparent uppercase">
            Production Telemetry Observability
          </h1>
          <p className="text-slate-400 text-xs mt-1 tracking-wider uppercase font-semibold">
            Enterprise Station Operations, OCR Latency Pipelines & Background Recovery HUD
          </p>
        </div>

        {/* Network status badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider ${
            syncStatus.isOnline 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' 
              : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
          }`}>
            {syncStatus.isOnline ? (
              <>
                <Wifi className="h-4.5 w-4.5 text-emerald-400 animate-pulse" /> Mumbai Link Stable
              </>
            ) : (
              <>
                <WifiOff className="h-4.5 w-4.5 text-rose-400 animate-bounce" /> Mumbai Offline Mode
              </>
            )}
          </div>

          <button
            onClick={handleForceSync}
            disabled={syncStatus.isFlushing || !syncStatus.isOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
              syncStatus.isFlushing 
                ? 'bg-slate-800 border-slate-700 text-slate-500' 
                : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-lg'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus.isFlushing ? 'animate-spin' : ''}`} />
            Sync Ledger Queue
          </button>
        </div>
      </div>

      {/* Main Core Quality Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sync Queue Panel */}
        <div className="glass-panel border border-[#1e293b]/50 rounded-2xl p-5 bg-[#0d1527]/40 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="z-10">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Offline Queue Buffer</span>
            <span className="text-3xl font-black text-indigo-400 mt-2 block font-mono">{syncStatus.pendingCount} Entries</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-wider z-10">
            {syncStatus.isFlushing ? 'Active sync stream replaying' : 'Replay queue stabilized'}
          </p>
          <div className="absolute right-2 bottom-2 text-indigo-500/10 pointer-events-none">
            <Database className="w-24 h-24" />
          </div>
        </div>

        {/* Firestore reads */}
        <div className="glass-panel border border-[#1e293b]/50 rounded-2xl p-5 bg-[#0d1527]/40 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="z-10">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Firestore Reads Counter</span>
            <span className="text-3xl font-black text-emerald-400 mt-2 block font-mono">{dbReads} Reads</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-wider z-10">Indexed query optimizations active</p>
          <div className="absolute right-2 bottom-2 text-emerald-500/10 pointer-events-none">
            <TrendingUp className="w-24 h-24" />
          </div>
        </div>

        {/* Firestore writes */}
        <div className="glass-panel border border-[#1e293b]/50 rounded-2xl p-5 bg-[#0d1527]/40 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="z-10">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Firestore Writes Counter</span>
            <span className="text-3xl font-black text-blue-400 mt-2 block font-mono">{dbWrites} Writes</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-wider z-10">All changes committed via event stream</p>
          <div className="absolute right-2 bottom-2 text-blue-500/10 pointer-events-none">
            <Database className="w-24 h-24" />
          </div>
        </div>

        {/* Event Loop Latency */}
        <div className="glass-panel border border-[#1e293b]/50 rounded-2xl p-5 bg-[#0d1527]/40 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="z-10">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Ledger Replay Latency</span>
            <span className="text-3xl font-black text-emerald-400 mt-2 block font-mono">1.2s avg</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-wider z-10">Reconstructive checksum loops secure</p>
          <div className="absolute right-2 bottom-2 text-emerald-500/10 pointer-events-none">
            <Cpu className="w-24 h-24" />
          </div>
        </div>

      </div>

      {/* Observability Section & Console Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left main control panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel border border-[#1e293b]/50 rounded-2xl bg-[#0d1527]/40 overflow-hidden shadow-xl">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setActiveTab('latency')}
                className={`flex-1 py-4 font-bold text-xs uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'latency'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                OCR Pipeline Latency Metrics
              </button>
              <button
                onClick={() => setActiveTab('sync')}
                className={`flex-1 py-4 font-bold text-xs uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  activeTab === 'sync'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Background Queue Event Logs ({queueItems.length})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'latency' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {simulatedOcrStats.map((stat, idx) => (
                      <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase block">{stat.name}</span>
                          <span className={`text-xl font-black mt-1 block font-mono ${stat.valueColor || 'text-slate-200'}`}>
                            {stat.value}
                          </span>
                        </div>
                        {stat.delta && (
                          <span className="text-[10px] bg-emerald-950/50 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                            {stat.delta}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Operational latency graph mockup using pure styled elements */}
                  <div className="p-4 bg-slate-900/40 border border-slate-800/40 rounded-xl space-y-4">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-400" /> Real-Time Shift Close Processing Timing (last 6 shifts)
                    </span>
                    <div className="h-32 flex items-end justify-between gap-2.5 pt-4">
                      {[180, 220, 150, 290, 110, 140].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                          <span className="text-[10px] text-slate-500 font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            {val}s
                          </span>
                          <div 
                            style={{ height: `${(val / 300) * 100}%` }}
                            className="w-full bg-indigo-600/60 hover:bg-indigo-500/80 rounded-t border-t border-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                          />
                          <span className="text-[9px] text-slate-500 font-mono font-extrabold mt-1">
                            SHIFT-{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="space-y-4">
                  {queueItems.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
                      <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
                      <div className="font-extrabold text-xs text-slate-300 uppercase tracking-widest">
                        Replay Queue Empty
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        All local operational events have been successfully reconciled and synced with firestore master collections.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {queueItems.map((evt) => (
                        <div key={evt.id} className="p-3.5 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">
                              {evt.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-200 font-bold block mt-1">{evt.id}</span>
                            <span className="text-[9px] text-slate-500 block">Queued: {new Date(evt.queuedAt).toLocaleTimeString()}</span>
                          </div>

                          <div className="text-right space-y-1">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Retries: {evt.attempts}</span>
                            {evt.errorLog && (
                              <span className="text-[9px] text-rose-400 font-bold block">{evt.errorLog}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side diagnostics logs console */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel border border-[#1e293b]/50 rounded-2xl p-6 bg-[#0d1527]/40 space-y-4 shadow-xl">
            <h2 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-indigo-400 animate-pulse" /> Diagnostic Recovery Console
            </h2>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[10px] text-emerald-400 space-y-2 h-[280px] overflow-y-auto leading-relaxed">
              <div className="text-slate-500 font-bold">[2026-05-21 15:59:05] - CONSOLE INIT</div>
              <div>&gt; OfflineRecoveryEngine sensing setup complete.</div>
              <div>&gt; Listening on local status changes.</div>
              
              {telemetryLogs.map((log, idx) => (
                <div key={idx} className={log.success ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                  &gt; Event {log.eventId} replayed. {log.success ? 'Success' : 'Failed'} ({log.durationMs}ms)
                </div>
              ))}

              {queueItems.length > 0 && (
                <div className="text-amber-400 animate-pulse">
                  &gt; Warning: {queueItems.length} transactions buffered in local memory index.
                </div>
              )}
              
              <div className="text-slate-400">&gt; Waiting for next sync loop iteration...</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductionObservabilityConsole;
