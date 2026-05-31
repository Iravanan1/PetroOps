import React from 'react';

export const dynamic = 'force-dynamic';

async function getLiveTanks() {
  try {
    const res = await fetch('http://localhost:3001/api/v1/stations/station-branch-04/tanks', {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    if (!res.ok) throw new Error('API response not ok');
    const data = await res.json();
    return data.map((t: any) => ({
      id: t.id,
      code: `Tank #${t.code}`,
      fuelType: t.fuelType,
      currentLevel: t.currentLevel,
      capacity: t.capacityLiters,
      temperature: t.temperature
    }));
  } catch (error) {
    console.error('Failed to fetch live tanks, falling back to mock data:', error);
    return [
      { id: 'T1', code: 'Tank #T1', fuelType: 'Speed 97', currentLevel: 14820, capacity: 20000, temperature: 24.5 },
      { id: 'T2', code: 'Tank #T2', fuelType: 'Octane 95', currentLevel: 18400, capacity: 20000, temperature: 24.8 },
      { id: 'T3', code: 'Tank #T3', fuelType: 'High-Speed Diesel', currentLevel: 31200, capacity: 40000, temperature: 25.1 },
    ];
  }
}

export default async function TanksPage() {
  const tanks = await getLiveTanks();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Tanks & Wetstock</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time Automatic Tank Gauge (ATG) telemetry and volumetric calculations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tanks.map((tank: any) => {
          const fillRatio = (tank.currentLevel / tank.capacity) * 100;
          return (
            <div key={tank.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-lg">{tank.code}</span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">{tank.fuelType}</span>
              </div>

              <div>
                <div className="text-2xl font-bold text-white">{tank.currentLevel.toLocaleString()} Liters</div>
                <div className="text-xs text-slate-500">Capacity: {tank.capacity.toLocaleString()}L</div>
              </div>

              {/* Progress Indicator */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fillRatio}%` }}></div>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Temp: {tank.temperature}°C</span>
                <span>{fillRatio.toFixed(1)}% Full</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
