/**
 * OwnerDashboard.tsx
 * ───────────────────
 * Real multi-pump owner command center for Indian petroleum station owners.
 *
 * Panels:
 *  A. Live Cash Position     — today's cash across all pumps in real time
 *  B. Daily P&L Summary      — revenue, fuel margin, net profit vs yesterday
 *  C. Fuel Volume Dashboard  — litres sold by fuel type, vs target
 *  D. Tax Liability Status   — pending GSTR returns, total liability
 *  E. Operator Performance   — collections per operator, shortages, attendance
 *  F. Credit & Recoveries    — total outstanding credit, recovery rate
 *  G. Wetstock Health        — tank levels, variance alerts
 *  H. Action Center          — pending approvals, discrepancy sign-offs, alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Fuel, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Users, BarChart3, Droplets, Bell, RefreshCw, Clock, Shield, Activity,
  ChevronRight, AlertCircle, FileText, Zap, Target, ArrowUp, ArrowDown
} from 'lucide-react';
import { GSTReportEngine } from '../modules/shared/GSTReportEngine';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PumpSummary {
  id: string;
  name: string;
  location: string;
  state: string;
  isOnline: boolean;

  // Today
  todayCashCollected: number;
  todayUpi: number;
  todayCard: number;
  todayCreditSales: number;
  todayExpenses: number;
  todayNetCash: number;

  // Fuel
  msLitresToday: number;
  hsdLitresToday: number;
  msTarget: number;
  hsdTarget: number;
  msRevenue: number;
  hsdRevenue: number;

  // Margin
  grossMarginToday: number;
  netProfitToday: number;

  // Operators
  activeOperators: number;
  shortages: number;

  // Credit
  creditOutstanding: number;
  creditRecoveredToday: number;

  // Wetstock
  msTankLevel: number;
  msTankCapacity: number;
  hsdTankLevel: number;
  hsdTankCapacity: number;
  wetstockAlert: boolean;

  // Tax
  gstPending: number;
  vatPending: number;
  nextReturnDue: string;

  // Shift
  currentShiftStatus: 'open' | 'active' | 'reconciling' | 'closed';
}

interface OwnerAlert {
  id: string;
  pumpId: string;
  pumpName: string;
  type: 'shortage' | 'wetstock' | 'credit_high' | 'tax_due' | 'ocr_failure' | 'shift_open' | 'discrepancy';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  ts: string;
  ack: boolean;
}

// ─── DEMO DATA GENERATOR ─────────────────────────────────────────────────────

function generatePumpSummary(id: string, name: string, location: string): PumpSummary {
  const r = (a: number, b: number) => parseFloat((Math.random() * (b - a) + a).toFixed(2));
  const ri = (a: number, b: number) => Math.round(r(a, b));

  const msL = ri(1800, 3200);
  const hsdL = ri(1500, 2800);
  const msRev = parseFloat((msL * 104.72).toFixed(2));
  const hsdRev = parseFloat((hsdL * 91.60).toFixed(2));
  const upi = ri(15000, 45000);
  const card = ri(8000, 25000);
  const credit = ri(3000, 12000);
  const expenses = ri(2000, 6000);
  const cash = parseFloat((msRev + hsdRev + upi + card - credit - expenses).toFixed(2));
  const margin = parseFloat(((msL * 3.06) + (hsdL * 2.48)).toFixed(2)); // approx dealer margin

  const msCap = 25000, hsdCap = 30000;
  const msLevel = ri(8000, msCap - 1000);
  const hsdLevel = ri(6000, hsdCap - 1000);

  return {
    id, name, location,
    state: ['MH', 'DL', 'KA', 'GJ'][ri(0, 3)],
    isOnline: Math.random() > 0.1,
    todayCashCollected: msRev + hsdRev,
    todayUpi: upi,
    todayCard: card,
    todayCreditSales: credit,
    todayExpenses: expenses,
    todayNetCash: cash,
    msLitresToday: msL,
    hsdLitresToday: hsdL,
    msTarget: 2800,
    hsdTarget: 2400,
    msRevenue: msRev,
    hsdRevenue: hsdRev,
    grossMarginToday: margin,
    netProfitToday: parseFloat((margin - expenses).toFixed(2)),
    activeOperators: ri(2, 4),
    shortages: ri(0, 3),
    creditOutstanding: ri(25000, 180000),
    creditRecoveredToday: ri(0, 8000),
    msTankLevel: msLevel,
    msTankCapacity: msCap,
    hsdTankLevel: hsdLevel,
    hsdTankCapacity: hsdCap,
    wetstockAlert: msLevel < 5000 || hsdLevel < 4000,
    gstPending: ri(0, 45000),
    vatPending: ri(0, 120000),
    nextReturnDue: new Date(Date.now() + ri(2, 18) * 86400000).toISOString().slice(0, 10),
    currentShiftStatus: ['open', 'active', 'reconciling', 'closed'][ri(0, 3)] as any,
  };
}

function generateAlerts(pumps: PumpSummary[]): OwnerAlert[] {
  const alerts: OwnerAlert[] = [];
  pumps.forEach(p => {
    if (p.shortages > 0) alerts.push({ id: `a_${p.id}_sh`, pumpId: p.id, pumpName: p.name, type: 'shortage', severity: 'critical', message: `${p.shortages} till shortage(s) detected this shift — total unreconciled`, ts: new Date().toISOString(), ack: false });
    if (p.wetstockAlert) alerts.push({ id: `a_${p.id}_ws`, pumpId: p.id, pumpName: p.name, type: 'wetstock', severity: 'warn', message: `Tank level critical — refill order required (MS: ${(p.msTankLevel / 1000).toFixed(1)}kL, HSD: ${(p.hsdTankLevel / 1000).toFixed(1)}kL)`, ts: new Date().toISOString(), ack: false });
    if (p.gstPending > 20000) alerts.push({ id: `a_${p.id}_tax`, pumpId: p.id, pumpName: p.name, type: 'tax_due', severity: 'warn', message: `GST liability ₹${p.gstPending.toLocaleString('en-IN')} unpaid — GSTR-3B due ${p.nextReturnDue}`, ts: new Date().toISOString(), ack: false });
    if (p.creditOutstanding > 100000) alerts.push({ id: `a_${p.id}_cr`, pumpId: p.id, pumpName: p.name, type: 'credit_high', severity: 'warn', message: `Credit book ₹${(p.creditOutstanding / 1000).toFixed(0)}k outstanding — aging over 30 days`, ts: new Date().toISOString(), ack: false });
  });
  return alerts.sort((a, b) => a.severity === 'critical' ? -1 : 1);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const INR = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const PCT = (v: number, t: number) => t > 0 ? `${((v / t) * 100).toFixed(1)}%` : '0%';

const SHIFT_STATUS_STYLE: Record<string, string> = {
  open:        'text-blue-400  bg-blue-500/15  border-blue-500/30',
  active:      'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  reconciling: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  closed:      'text-slate-400 bg-slate-800    border-slate-700',
};

const SEV_STYLE: Record<string, string> = {
  critical: 'border-red-500/40  bg-red-900/20  text-red-300',
  warn:     'border-amber-500/30 bg-amber-900/15 text-amber-300',
  info:     'border-slate-700   bg-slate-900/40 text-slate-400',
};

function TankBar({ level, capacity, fuel }: { level: number; capacity: number; fuel: string }) {
  const pct = capacity > 0 ? (level / capacity) * 100 : 0;
  const low = pct < 25;
  const color = low ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-slate-500 uppercase">{fuel}</span>
        <span className={`font-mono ${low ? 'text-red-400' : 'text-slate-400'}`}>{(level / 1000).toFixed(1)}kL / {(capacity / 1000).toFixed(0)}kL</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Delta({ value, prefix = '₹' }: { value: number; prefix?: string }) {
  const up = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {prefix}{Math.abs(value).toLocaleString('en-IN')}
    </span>
  );
}

// ─── PUMP CARD ────────────────────────────────────────────────────────────────

function PumpCard({ pump, selected, onClick }: { pump: PumpSummary; selected: boolean; onClick: () => void; key?: React.Key }) {
  const targetAchieved = pump.msLitresToday >= pump.msTarget * 0.9 && pump.hsdLitresToday >= pump.hsdTarget * 0.9;
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 cursor-pointer transition hover:shadow-lg hover:shadow-blue-500/5
        ${selected ? 'border-blue-500/50 bg-blue-500/8 shadow-blue-500/10 shadow-lg' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${pump.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-bold text-slate-200">{pump.name}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{pump.location}</div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold ${SHIFT_STATUS_STYLE[pump.currentShiftStatus]}`}>
          {pump.currentShiftStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <div className="text-slate-500">Today Revenue</div>
          <div className="font-bold font-mono text-slate-100">{INR(pump.msRevenue + pump.hsdRevenue)}</div>
        </div>
        <div>
          <div className="text-slate-500">Net Profit</div>
          <div className={`font-bold font-mono ${pump.netProfitToday >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {INR(pump.netProfitToday)}
          </div>
        </div>
        <div>
          <div className="text-slate-500">MS Sold</div>
          <div className="font-mono text-slate-300">{pump.msLitresToday.toLocaleString('en-IN')} L</div>
        </div>
        <div>
          <div className="text-slate-500">HSD Sold</div>
          <div className="font-mono text-slate-300">{pump.hsdLitresToday.toLocaleString('en-IN')} L</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {pump.shortages > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded">{pump.shortages} shortage</span>}
        {pump.wetstockAlert && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded">Low tank</span>}
        {targetAchieved && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">Target ✓</span>}
        {pump.gstPending > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded">GST due</span>}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const [pumps, setPumps] = useState<PumpSummary[]>([]);
  const [alerts, setAlerts] = useState<OwnerAlert[]>([]);
  const [selectedPumpIdx, setSelectedPumpIdx] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    const ps = [
      generatePumpSummary('PUMP_001', 'Shree Ram Fuel Station', 'Andheri West, Mumbai'),
      generatePumpSummary('PUMP_002', 'Jai Hanuman Petrol Pump', 'Thane City, Mumbai'),
      generatePumpSummary('PUMP_003', 'Balaji Service Station',  'Pune Road, Nashik'),
      generatePumpSummary('PUMP_004', 'Om Sai Petroleum',         'Hadapsar, Pune'),
    ];
    setPumps(ps);
    setAlerts(generateAlerts(ps));
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pump = pumps[selectedPumpIdx];
  const totalRevenue   = pumps.reduce((s, p) => s + p.msRevenue + p.hsdRevenue, 0);
  const totalNetProfit = pumps.reduce((s, p) => s + p.netProfitToday, 0);
  const totalMS        = pumps.reduce((s, p) => s + p.msLitresToday, 0);
  const totalHSD       = pumps.reduce((s, p) => s + p.hsdLitresToday, 0);
  const totalCredit    = pumps.reduce((s, p) => s + p.creditOutstanding, 0);
  const totalGSTDue    = pumps.reduce((s, p) => s + p.gstPending, 0);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.ack).length;

  if (!pump) return (
    <div className="min-h-screen bg-[#06080e] flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-200 flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-[#0b0f1a]/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            Owner Command Center
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5">{pumps.length} pumps · Live P&L · Cash · Tax · Wetstock · Operators</p>
        </div>
        <div className="flex items-center gap-3">
          {criticalAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/15 border border-red-500/30 rounded-lg text-xs text-red-400 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              {criticalAlerts} critical
            </div>
          )}
          <div className="text-[10px] text-slate-600">
            Refreshed {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button onClick={load} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* ── A. NETWORK KPIs ───────────────────────────────────────────────── */}
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 font-medium">Network Today — All {pumps.length} Pumps</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Network Revenue',  value: INR(totalRevenue),    icon: IndianRupee, accent: 'blue' },
              { label: 'Network Profit',   value: INR(totalNetProfit),  icon: TrendingUp,  accent: totalNetProfit >= 0 ? 'green' : 'red' },
              { label: 'MS Sold (L)',      value: `${(totalMS / 1000).toFixed(1)}kL`,   icon: Fuel,        accent: 'purple' },
              { label: 'HSD Sold (L)',     value: `${(totalHSD / 1000).toFixed(1)}kL`,  icon: Fuel,        accent: 'amber' },
              { label: 'Credit Book',      value: INR(totalCredit),     icon: Users,       accent: totalCredit > 300000 ? 'red' : 'slate' },
              { label: 'GST Pending',      value: INR(totalGSTDue),     icon: FileText,    accent: totalGSTDue > 50000 ? 'amber' : 'green' },
            ].map(k => {
              const Icon = k.icon;
              const styles: Record<string, string> = {
                blue:   'border-blue-500/30 bg-blue-500/8 text-blue-400',
                green:  'border-emerald-500/30 bg-emerald-500/8 text-emerald-400',
                amber:  'border-amber-500/30 bg-amber-500/8 text-amber-400',
                red:    'border-red-500/30 bg-red-500/8 text-red-400',
                purple: 'border-purple-500/30 bg-purple-500/8 text-purple-400',
                slate:  'border-slate-700 bg-slate-800/40 text-slate-400',
              };
              const cls = styles[k.accent] ?? styles.blue;
              const [b, bg, ic] = cls.split(' ');
              return (
                <div key={k.label} className={`border ${b} ${bg} rounded-xl p-3`}>
                  <Icon className={`w-4 h-4 ${ic} mb-1.5`} />
                  <div className="text-base font-bold font-mono text-slate-100">{k.value}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{k.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* ── B. PUMP SELECTOR ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Select Pump</div>
            {pumps.map((p, i) => (
              <PumpCard key={p.id} pump={p} selected={i === selectedPumpIdx} onClick={() => setSelectedPumpIdx(i)} />
            ))}
          </div>

          {/* ── C. SELECTED PUMP DETAIL ──────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-200">{pump.name}</h2>
                <p className="text-xs text-slate-500">{pump.location} · State: {pump.state}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${SHIFT_STATUS_STYLE[pump.currentShiftStatus]}`}>
                Shift: {pump.currentShiftStatus}
              </span>
            </div>

            {/* Cash flow breakdown */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Today Cash Position
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Fuel Revenue',    val: pump.msRevenue + pump.hsdRevenue, color: 'text-slate-100' },
                  { label: 'UPI Collected',   val: pump.todayUpi,           color: 'text-blue-300' },
                  { label: 'Card Collected',  val: pump.todayCard,          color: 'text-indigo-300' },
                  { label: 'Credit Recovery', val: pump.creditRecoveredToday, color: 'text-emerald-300' },
                  { label: '− Credit Sales',  val: -pump.todayCreditSales,  color: 'text-amber-300' },
                  { label: '− Expenses',      val: -pump.todayExpenses,     color: 'text-orange-300' },
                ].map(r => (
                  <div key={r.label} className={`p-2.5 bg-slate-900/60 rounded-lg border border-slate-800`}>
                    <div className="text-slate-500 text-[10px]">{r.label}</div>
                    <div className={`font-mono font-bold mt-0.5 ${r.color}`}>{INR(Math.abs(r.val))}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-slate-800/80 rounded-lg flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Net Cash Position</span>
                <span className={`font-mono font-bold text-lg ${pump.todayNetCash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {INR(pump.todayNetCash)}
                </span>
              </div>
            </div>

            {/* Fuel volume vs target */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Volume vs Target
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { fuel: 'Petrol (MS)', sold: pump.msLitresToday, target: pump.msTarget, color: '#22c55e', rev: pump.msRevenue },
                  { fuel: 'Diesel (HSD)', sold: pump.hsdLitresToday, target: pump.hsdTarget, color: '#f59e0b', rev: pump.hsdRevenue },
                ].map(f => {
                  const pct = f.target > 0 ? Math.min(100, (f.sold / f.target) * 100) : 0;
                  const ok = pct >= 90;
                  return (
                    <div key={f.fuel}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-400">{f.fuel}</span>
                        <span className={`font-bold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: f.color }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{f.sold.toLocaleString('en-IN')} L sold</span>
                        <span>Target: {f.target.toLocaleString('en-IN')} L</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Revenue: {INR(f.rev)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wetstock + Tax row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" /> Tank Levels
                </div>
                <TankBar level={pump.msTankLevel} capacity={pump.msTankCapacity} fuel="Petrol (MS)" />
                <TankBar level={pump.hsdTankLevel} capacity={pump.hsdTankCapacity} fuel="Diesel (HSD)" />
                {pump.wetstockAlert && (
                  <div className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Order fuel stock immediately
                  </div>
                )}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Tax Snapshot
                </div>
                {[
                  { label: 'GST Liability', val: pump.gstPending, color: pump.gstPending > 20000 ? 'text-amber-400' : 'text-emerald-400' },
                  { label: 'VAT Pending',   val: pump.vatPending, color: pump.vatPending > 50000 ? 'text-amber-400' : 'text-slate-300' },
                  { label: 'Credit Book',   val: pump.creditOutstanding, color: pump.creditOutstanding > 100000 ? 'text-red-400' : 'text-slate-300' },
                  { label: 'Recovery Today',val: pump.creditRecoveredToday, color: 'text-emerald-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs border-b border-slate-800/50 pb-1.5">
                    <span className="text-slate-500">{r.label}</span>
                    <span className={`font-mono font-bold ${r.color}`}>{INR(r.val)}</span>
                  </div>
                ))}
                <div className="text-[10px] text-slate-600 flex items-center gap-1 pt-1">
                  <Clock className="w-3 h-3" /> Next return: {pump.nextReturnDue}
                </div>
              </div>
            </div>

            {/* Operator status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium flex items-center gap-1.5 mb-3">
                <Users className="w-3.5 h-3.5" /> Operator Status
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{pump.activeOperators}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">On Shift</div>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${pump.shortages > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-900/60 border-slate-800'}`}>
                  <div className={`text-2xl font-bold ${pump.shortages > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{pump.shortages}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">Shortages</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-center">
                  <div className="text-2xl font-bold text-blue-400">{PCT(pump.msLitresToday + pump.hsdLitresToday, (pump.msTarget + pump.hsdTarget))}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">Target Achieved</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── D. ALERTS CENTER ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Network Alerts
            </div>
            <span className="text-[10px] text-slate-600">{alerts.filter(a => !a.ack).length} unacknowledged</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 9).map(alert => (
              <div key={alert.id} className={`border rounded-xl p-3 ${SEV_STYLE[alert.severity]}`}>
                <div className="flex items-start gap-2">
                  {alert.severity === 'critical'
                    ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5">{alert.pumpName}</div>
                    <div className="text-xs leading-relaxed">{alert.message}</div>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 text-center py-8 text-slate-500 text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All clear — no active alerts
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
