import React from 'react';

const mockLogs = [
  { id: 1, station: 'Branch #04', tank: 'Tank #01', event: 'Sudden dip level reduction', classification: 'CRITICAL_DISCREPANCY', variance: '-24L', time: '10 mins ago' },
  { id: 2, station: 'Branch #01', tank: 'Tank #03', event: 'Nozzle calibration flow drift', classification: 'FLOW_DRIFT', variance: '+12L', time: '1 hour ago' },
  { id: 3, station: 'Branch #02', tank: 'Tank #02', event: 'Standard automatic dip validation', classification: 'STABLE', variance: '0L', time: '2 hours ago' },
];

export default function AIInsightsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Insights & Telemetry Checks</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time threat auditor telemetry logs, fuel theft detection, and dispenser calibration drifts.</p>
      </div>

      {/* Discrepancies Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <span className="font-bold text-white">Active Audit Stream</span>
          <span className="text-xs text-emerald-400 font-medium">● Monitoring Live Telemetry</span>
        </div>

        <div className="divide-y divide-slate-800">
          {mockLogs.map((log) => (
            <div key={log.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">{log.station}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{log.tank}</span>
                </div>
                <div className="text-sm text-slate-300">{log.event}</div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">Variance: {log.variance}</div>
                  <div className="text-xs text-slate-500">{log.time}</div>
                </div>

                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  log.classification === 'CRITICAL_DISCREPANCY'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : log.classification === 'FLOW_DRIFT'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {log.classification}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
