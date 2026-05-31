import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Wifi,
  Database,
  FileCheck,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Clock,
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';

interface BranchHealthMetric {
  branchId: string;
  name: string;
  location: string;
  uptime: number;
  ocrAccuracy: number;
  syncDelayMs: number;
  activeDiscrepanciesCount: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

export const OperationalReliabilityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<BranchHealthMetric[]>([
    {
      branchId: "BR-DEL-01",
      name: "Connaught Place Station",
      location: "New Delhi, DL",
      uptime: 99.85,
      ocrAccuracy: 94.6,
      syncDelayMs: 240,
      activeDiscrepanciesCount: 0,
      status: 'ONLINE'
    },
    {
      branchId: "BR-MUM-02",
      name: "Bandra Fuel Oasis",
      location: "Mumbai, MH",
      uptime: 99.92,
      ocrAccuracy: 92.1,
      syncDelayMs: 380,
      activeDiscrepanciesCount: 1,
      status: 'ONLINE'
    },
    {
      branchId: "BR-BLR-03",
      name: "Indiranagar Retail Pump",
      location: "Bengaluru, KA",
      uptime: 98.40,
      ocrAccuracy: 88.5,
      syncDelayMs: 1450,
      activeDiscrepanciesCount: 3,
      status: 'DEGRADED'
    },
    {
      branchId: "BR-HYD-04",
      name: "Gachibowli Highway Outlet",
      location: "Hyderabad, TS",
      uptime: 100.0,
      ocrAccuracy: 96.2,
      syncDelayMs: 190,
      activeDiscrepanciesCount: 0,
      status: 'ONLINE'
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uptimeTimeline, setUptimeTimeline] = useState<number[]>([99.8, 99.9, 99.7, 99.9, 99.8, 99.9, 99.92]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Modulate metrics to simulate live network queries
      setMetrics(prev => prev.map(item => {
        const accuracyNoise = (Math.random() - 0.5) * 1.5;
        const delayNoise = Math.round((Math.random() - 0.5) * 60);
        return {
          ...item,
          ocrAccuracy: Math.min(100, Math.max(80, Number((item.ocrAccuracy + accuracyNoise).toFixed(1)))),
          syncDelayMs: Math.max(50, item.syncDelayMs + delayNoise)
        };
      }));
      setUptimeTimeline(prev => [...prev.slice(1), Number((99.5 + Math.random() * 0.5).toFixed(2))]);
      setIsRefreshing(false);
    }, 800);
  };

  // Periodic automatic metrics fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => prev.map(item => {
        const accuracyNoise = (Math.random() - 0.5) * 0.8;
        const delayNoise = Math.round((Math.random() - 0.5) * 30);
        return {
          ...item,
          ocrAccuracy: Math.min(100, Math.max(80, Number((item.ocrAccuracy + accuracyNoise).toFixed(1)))),
          syncDelayMs: Math.max(50, item.syncDelayMs + delayNoise)
        };
      }));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const totalActiveDiscrepancies = metrics.reduce((acc, curr) => acc + curr.activeDiscrepanciesCount, 0);
  const avgOcrAccuracy = Number((metrics.reduce((acc, curr) => acc + curr.ocrAccuracy, 0) / metrics.length).toFixed(1));
  const overallUptime = Number((metrics.reduce((acc, curr) => acc + curr.uptime, 0) / metrics.length).toFixed(2));
  const avgSyncDelay = Math.round(metrics.reduce((acc, curr) => acc + curr.syncDelayMs, 0) / metrics.length);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      
      {/* Top Navigation / Breadcrumb */}
      <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-xs font-mono">SYSTEM MONITORING</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Operational Reliability Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Enterprise overview of petroleum branch sync latency, hardware uptime, and OCR precision.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'QUERYING CLUSTER...' : 'REFRESH METRICS'}
        </button>
      </header>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI: Overall Uptime */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-800">
            <Wifi className="h-10 w-10 text-emerald-500/10" />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Overall Cluster Uptime</div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">{overallUptime}%</div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            All terminal endpoints are reachable.
          </div>
        </div>

        {/* KPI: Sync Latency */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-850">
            <Database className="h-10 w-10 text-sky-500/10" />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Avg Sync Latency</div>
          <div className="text-3xl font-extrabold font-mono text-sky-400 mt-2">{avgSyncDelay}ms</div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-sky-400" />
            Direct Firestore replication active.
          </div>
        </div>

        {/* KPI: OCR Precision Index */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-850">
            <FileCheck className="h-10 w-10 text-indigo-500/10" />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">OCR Precision Index</div>
          <div className="text-3xl font-extrabold font-mono text-indigo-400 mt-2">{avgOcrAccuracy}%</div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-indigo-400" />
            Consensus hybrid routing operational.
          </div>
        </div>

        {/* KPI: Active Discrepancies */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-slate-850">
            <AlertOctagon className="h-10 w-10 text-rose-500/10" />
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Unresolved Discrepancies</div>
          <div className={`text-3xl font-extrabold font-mono mt-2 ${totalActiveDiscrepancies > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
            {totalActiveDiscrepancies}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
            {totalActiveDiscrepancies > 0 ? (
              <>
                <AlertOctagon className="h-3 w-3 text-rose-400" />
                <span className="text-rose-400/90 font-semibold">Requires manager override audit.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                No physical balance mismatch.
              </>
            )}
          </div>
        </div>

      </div>

      {/* Charts & Map Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Branch Health Grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-rose-400" />
            Multi-Tenant Branch Node Health
          </h2>
          
          <div className="space-y-4">
            {metrics.map((branch) => (
              <div 
                key={branch.branchId} 
                className="bg-slate-950 p-4.5 rounded-lg border border-slate-850 hover:border-slate-800 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      branch.status === 'ONLINE' 
                        ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                        : branch.status === 'DEGRADED'
                          ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                          : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                    }`} />
                    <span className="text-sm font-bold text-white">{branch.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{branch.branchId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>{branch.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-8 text-right font-mono text-xs w-full md:w-auto">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Uptime</div>
                    <div className="font-bold text-slate-200">{branch.uptime}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">OCR Acc.</div>
                    <div className="font-bold text-slate-200">{branch.ocrAccuracy}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Latency</div>
                    <div className={`font-bold ${branch.syncDelayMs > 1000 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {branch.syncDelayMs}ms
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Uptime telemetry visualization */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-sky-400" />
              Dynamic Uptime Stream
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Continuous live query heartbeat across regional cloud servers.
            </p>

            {/* Simulated bar chart */}
            <div className="flex items-end justify-between h-36 bg-slate-950 p-4 rounded-lg border border-slate-850 gap-2 mb-4">
              {uptimeTimeline.map((u, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[8px] font-mono text-slate-500 font-bold leading-none">{u}%</div>
                  <div 
                    className="w-full bg-emerald-500/25 rounded-t border-t border-emerald-500 transition-all duration-500"
                    style={{ height: `${((u - 98) / 2) * 100}px` }}
                  />
                  <span className="text-[8px] font-mono text-slate-650">H{i+1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded border border-slate-850/80 text-[10px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              Telemetry Node Status
            </div>
            <p className="leading-normal">
              Main database cluster replicated across Mumbai and Hyderabad primary instances. backup schedules verified complete with zero sync anomalies.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default OperationalReliabilityDashboard;
