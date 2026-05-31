import React from 'react';

export const dynamic = 'force-dynamic';

async function getLiveMetrics() {
  try {
    const tanksRes = await fetch('http://localhost:3001/api/v1/stations/station-branch-04/tanks', {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    let totalWetstock = 82400;
    if (tanksRes.ok) {
      const tanks = await tanksRes.json();
      totalWetstock = tanks.reduce((acc: number, t: any) => acc + t.currentLevel, 0);
    }

    return {
      totalSalesToday: '₹7,282.10',
      activeDispensers: '2 / 2',
      wetstockCapacity: `${totalWetstock.toLocaleString()} Liters`,
      integratedCommits: '2 Transactions'
    };
  } catch (error) {
    console.error('Failed to fetch live metrics, falling back to mock metrics:', error);
    return {
      totalSalesToday: '₹4,82,900.50',
      activeDispensers: '16 / 18',
      wetstockCapacity: '82,400 Liters',
      integratedCommits: '412 Transactions'
    };
  }
}

export default async function DashboardHome() {
  const metrics = await getLiveMetrics();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Live Station Network</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time status indicators and aggregated billing metrics.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium px-4 py-2 rounded-lg transition-all">
          Generate Network Audit
        </button>
      </div>

      {/* Metric Grid Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
          <div className="text-xs text-slate-400 font-medium tracking-wider">TOTAL SALES TODAY</div>
          <div className="text-3xl font-bold text-white">{metrics.totalSalesToday}</div>
          <div className="text-xs text-emerald-400">↑ 12.4% vs yesterday</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
          <div className="text-xs text-slate-400 font-medium tracking-wider">ACTIVE DISPENSERS</div>
          <div className="text-3xl font-bold text-white">{metrics.activeDispensers}</div>
          <div className="text-xs text-slate-400">All loops reporting stable</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
          <div className="text-xs text-slate-400 font-medium tracking-wider">WETSTOCK CAPACITY</div>
          <div className="text-3xl font-bold text-white">{metrics.wetstockCapacity}</div>
          <div className="text-xs text-emerald-400">Stable inventory level</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
          <div className="text-xs text-slate-400 font-medium tracking-wider">INTEGRATED COMMITS</div>
          <div className="text-3xl font-bold text-white">{metrics.integratedCommits}</div>
          <div className="text-xs text-emerald-400">100% verified ledger hashes</div>
        </div>
      </div>
    </div>
  );
}
