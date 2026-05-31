/**
 * FinancialReportCenter.tsx
 * ─────────────────────────
 * Accountant-grade financial reporting center for Indian petroleum stations.
 *
 * Tabs:
 *  1. Monthly P&L        — revenue, cost, margin per pump per month
 *  2. GSTR-1 Filing      — outward supply summary, HSN table, VAT breakdown
 *  3. GSTR-3B Filing     — ITC, net liability, payment tracker
 *  4. Tax Calendar       — due dates, filing status, penalty risk
 *  5. Annual Summary     — FY totals, comparison, trend charts
 *  6. Fuel Margin        — dealer margin analysis per fuel type
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, BarChart3, Calendar, TrendingUp, TrendingDown, Fuel,
  CheckCircle2, AlertCircle, Clock, AlertTriangle, Download,
  ChevronRight, IndianRupee, Percent, Package, Shield, RefreshCw
} from 'lucide-react';
import {
  GSTReportEngine, MonthlyTaxSummary, AnnualTaxReport, GSTR1Summary, GSTR3BSummary
} from '../modules/shared/GSTReportEngine';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const INR = (n: number, dec = 2) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const PCT = (n: number) => `${n >= 0 ? '' : '-'}${Math.abs(n).toFixed(2)}%`;

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

type TabId = 'pl' | 'gstr1' | 'gstr3b' | 'calendar' | 'annual' | 'margin';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'pl',       label: 'Monthly P&L',    icon: BarChart3 },
  { id: 'gstr1',    label: 'GSTR-1',         icon: FileText },
  { id: 'gstr3b',   label: 'GSTR-3B',        icon: IndianRupee },
  { id: 'calendar', label: 'Tax Calendar',   icon: Calendar },
  { id: 'annual',   label: 'Annual Summary', icon: TrendingUp },
  { id: 'margin',   label: 'Fuel Margin',    icon: Fuel },
];

function KpiCard({ label, value, sub, icon: Icon, accent = 'blue', trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  accent?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const styles: Record<string, string> = {
    blue:   'border-blue-500/30   bg-blue-500/8   text-blue-400',
    green:  'border-emerald-500/30 bg-emerald-500/8 text-emerald-400',
    amber:  'border-amber-500/30  bg-amber-500/8  text-amber-400',
    red:    'border-red-500/30    bg-red-500/8    text-red-400',
    purple: 'border-purple-500/30 bg-purple-500/8 text-purple-400',
    slate:  'border-slate-700     bg-slate-800/40 text-slate-400',
  };
  const cls = styles[accent] ?? styles.blue;
  const [bdr, bg, ic] = cls.split(' ');
  return (
    <div className={`border ${bdr} ${bg} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${ic}`} />
        {trend === 'up'   && <TrendingUp   className="w-3.5 h-3.5 text-emerald-400" />}
        {trend === 'down' && <TrendingDown  className="w-3.5 h-3.5 text-red-400" />}
      </div>
      <div className="text-xl font-bold text-slate-100 font-mono">{value}</div>
      <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, badge }: { title: string; icon: React.ElementType; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</span>
      {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{badge}</span>}
    </div>
  );
}

// ─── BAR CHART (pure CSS) ─────────────────────────────────────────────────────

function MiniBar({ value, max, color = '#3b82f6', label }: { value: number; max: number; color?: string; label: string; key?: React.Key }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="text-[10px] text-slate-500 w-12 shrink-0 text-right">{label}</div>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-[10px] font-mono text-slate-400 w-20 text-right">{INR(value, 0)}</div>
    </div>
  );
}

// ─── FILING STATUS BADGE ──────────────────────────────────────────────────────

function FilingBadge({ filed, dueDate }: { filed: boolean; dueDate: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !filed && today > dueDate;
  if (filed)   return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">✓ Filed</span>;
  if (overdue) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse">⚠ Overdue</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">Pending — due {dueDate}</span>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function FinancialReportCenter() {
  const [tab, setTab] = useState<TabId>('pl');
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [state, setState] = useState('MH');
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyTaxSummary[]>([]);
  const [annualReport, setAnnualReport] = useState<AnnualTaxReport | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Generate demo data ─────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const pumpId = 'PUMP_001';
    const gstin = '27AABCU9603R1ZX';
    const pumpName = 'Shree Ram Fuel Station';

    const { fuelSales, nonFuelSales, itc } = GSTReportEngine.generateDemoData(pumpId, state, 6);

    const summaries: MonthlyTaxSummary[] = [];
    const today = new Date();
    for (let m = 5; m >= 0; m--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - m);
      const month = d.toISOString().slice(0, 7);
      const summary = GSTReportEngine.buildMonthlyTaxSummary(
        month, pumpId, pumpName, state, gstin,
        fuelSales, nonFuelSales, itc,
        Math.round(120000 + Math.random() * 40000), // operating expenses
        Math.round(80000 + Math.random() * 20000),  // staff cost
        { ms: 87.50, hsd: 76.40, atf: 98.00, speed: 91.00 }  // dealer purchase cost
      );
      summaries.push(summary);
    }

    // Mark 4 of 6 as filed
    summaries.slice(0, 4).forEach(s => { s.gstr1Filed = true; s.gstr3bFiled = true; });

    const annual = GSTReportEngine.buildAnnualReport(summaries, '2024-25', gstin);
    setMonthlySummaries(summaries);
    setAnnualReport(annual);
    setLoading(false);
  }, [state]);

  const current = monthlySummaries[selectedMonth];
  const maxRevenue = useMemo(() => Math.max(...monthlySummaries.map(m => m.totalRevenue)), [monthlySummaries]);

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[#06080e] flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-200 flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-[#0b0f1a]/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Financial Report Center
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5">GST Returns · P&amp;L · Fuel Margins · Tax Calendar — {current?.pumpName}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* State selector */}
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
            {['MH','DL','KA','TN','GJ','UP','RJ','MP','WB'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {annualReport && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium
              ${annualReport.pendingMonths === 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
              {annualReport.pendingMonths} returns pending
            </span>
          )}
        </div>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-slate-800/50 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-2 font-medium rounded-t-lg transition whitespace-nowrap
                ${active ? 'bg-slate-800 border border-slate-700 border-b-slate-800 text-slate-200 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── MONTH SELECTOR ───────────────────────────────────────────────────────── */}
      {tab !== 'annual' && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/40">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Month:</span>
          {monthlySummaries.map((m, i) => (
            <button key={m.month} onClick={() => setSelectedMonth(i)}
              className={`text-[11px] px-3 py-1 rounded-full border transition
                ${i === selectedMonth ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
              {fmtMonth(m.month)}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB CONTENT ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ═══ MONTHLY P&L ═══════════════════════════════════════════════════════ */}
        {tab === 'pl' && current && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Revenue"   value={INR(current.totalRevenue, 0)}  icon={IndianRupee} accent="blue"   trend="up" />
              <KpiCard label="Fuel Revenue"    value={INR(current.fuelRevenue, 0)}   icon={Fuel}        accent="purple" />
              <KpiCard label="Gross Profit"    value={INR(current.grossProfit, 0)}   icon={TrendingUp}  accent={current.grossProfit > 0 ? 'green' : 'red'} />
              <KpiCard label="Net Profit"      value={INR(current.netProfit, 0)}     icon={TrendingUp}  accent={current.netProfit > 0 ? 'green' : 'red'}
                sub={`Margin: ${PCT(current.netMarginPct)}`} />
              <KpiCard label="Dealer Purchase" value={INR(current.dealerPurchaseCost, 0)} icon={Package}    accent="slate" />
              <KpiCard label="VAT Collected"   value={INR(current.vatCollected, 0)}  icon={Percent}     accent="amber" />
              <KpiCard label="Excise Duty"     value={INR(current.exciseDutyComponent, 0)} icon={Shield} accent="amber" />
              <KpiCard label="GST (Non-fuel)"  value={INR(current.gstCollected, 0)}  icon={FileText}    accent="blue" />
            </div>

            {/* Revenue waterfall */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <SectionHeader title="Revenue Waterfall" icon={BarChart3} badge={fmtMonth(current.month)} />
              <div className="space-y-3">
                <MiniBar value={current.totalRevenue}        max={current.totalRevenue} color="#6366f1" label="Revenue" />
                <MiniBar value={current.vatCollected}        max={current.totalRevenue} color="#f59e0b" label="VAT" />
                <MiniBar value={current.exciseDutyComponent} max={current.totalRevenue} color="#f97316" label="Excise" />
                <MiniBar value={current.dealerPurchaseCost}  max={current.totalRevenue} color="#64748b" label="Purchase" />
                <MiniBar value={current.operatingExpenses}   max={current.totalRevenue} color="#94a3b8" label="OpEx" />
                <MiniBar value={current.staffCost}           max={current.totalRevenue} color="#78716c" label="Staff" />
                <div className="border-t border-slate-800 pt-3">
                  <MiniBar value={current.netProfit}         max={current.totalRevenue} color={current.netProfit > 0 ? '#10b981' : '#ef4444'} label="Net P" />
                </div>
              </div>
            </div>

            {/* Month-on-month table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Monthly Comparison
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Month','Revenue','Fuel Rev','Gross P','Net P','GM%','NM%','VAT','GST'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-right first:text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {monthlySummaries.map((m, i) => (
                      <tr key={m.month}
                        className={`hover:bg-slate-800/30 transition cursor-pointer ${i === selectedMonth ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''}`}
                        onClick={() => setSelectedMonth(i)}>
                        <td className="px-4 py-2.5 font-medium text-slate-300">{fmtMonth(m.month)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-200">{INR(m.totalRevenue, 0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-400">{INR(m.fuelRevenue, 0)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${m.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{INR(m.grossProfit, 0)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${m.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{INR(m.netProfit, 0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-300">{PCT(m.grossMarginPct)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-indigo-300">{PCT(m.netMarginPct)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-300">{INR(m.vatCollected, 0)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-300">{INR(m.gstCollected, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ GSTR-1 ════════════════════════════════════════════════════════════ */}
        {tab === 'gstr1' && current && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">GSTIN: <span className="font-mono text-slate-300">{current.gstr1.gstin}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">State: {current.gstr1.state} | Period: {fmtMonth(current.month)}</div>
              </div>
              <div className="flex items-center gap-2">
                <FilingBadge filed={current.gstr1Filed} dueDate={current.gstr1DueDate} />
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <KpiCard label="B2C Taxable Value" value={INR(current.gstr1.b2cTaxableValue, 0)} icon={IndianRupee} accent="blue" />
              <KpiCard label="Total GST"          value={INR(current.gstr1.totalGst, 0)}          icon={Percent}     accent="green" />
              <KpiCard label="VAT on Fuel"        value={INR(current.gstr1.vatOnFuel, 0)}          icon={Fuel}        accent="amber" />
            </div>

            {/* B2C Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Table 5A — B2C (Other) Outward Supplies
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Type','Taxable Value','CGST','SGST','IGST','Total'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-right first:text-left text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-300">Non-fuel Retail (B2C)</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{INR(current.gstr1.b2cTaxableValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-300">{INR(current.gstr1.b2cCgst)}</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-300">{INR(current.gstr1.b2cSgst)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-300">{INR(current.gstr1.totalGst)}</td>
                  </tr>
                  <tr className="bg-amber-900/10 border-t border-amber-800/20">
                    <td className="px-4 py-3 text-amber-300">Fuel Sales (Outside GST — VAT/Excise)</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{INR(current.fuelRevenue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">—</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">—</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">{INR(current.gstr1.vatOnFuel)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* HSN Summary */}
            {current.gstr1.hsnSummary.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Table 12 — HSN-wise Summary
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['HSN','Description','UQC','Qty','Taxable Value','CGST','SGST'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-right first:text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {current.gstr1.hsnSummary.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/20">
                        <td className="px-4 py-2.5 font-mono text-slate-300">{row.hsnCode}</td>
                        <td className="px-4 py-2.5 text-slate-400 capitalize">{row.description}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{row.uqc}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{row.qty}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-200">{INR(row.taxableValue)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-300">{INR(row.cgst)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-indigo-300">{INR(row.sgst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ GSTR-3B ═══════════════════════════════════════════════════════════ */}
        {tab === 'gstr3b' && current && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">GSTIN: <span className="font-mono text-slate-300">{current.gstr3b.gstin}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">Period: {fmtMonth(current.month)}</div>
              </div>
              <div className="flex gap-2">
                <FilingBadge filed={current.gstr3bFiled} dueDate={current.gstr3bDueDate} />
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            {/* 3.1 — Outward supplies */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <SectionHeader title="3.1 — Outward Supplies" icon={TrendingUp} />
              <div className="space-y-2 text-xs">
                {[
                  { label: '3.1(a) Taxable (other than zero-rated)',  val: current.gstr3b.outwardTaxable },
                  { label: '3.1(b) Zero-rated supply',               val: 0 },
                  { label: '3.1(c) Nil-rated, exempt',               val: current.gstr3b.outwardNilRated },
                  { label: '3.1(d) Non-GST (fuel — VAT/Excise)',     val: current.gstr3b.outwardNonGst },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="font-mono text-slate-200">{INR(row.val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ITC */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <SectionHeader title="4 — Eligible ITC" icon={Shield} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <KpiCard label="IGST ITC"  value={INR(current.gstr3b.itcIgst)}   icon={IndianRupee} accent="purple" />
                <KpiCard label="CGST ITC"  value={INR(current.gstr3b.itcCgst)}   icon={IndianRupee} accent="blue" />
                <KpiCard label="SGST ITC"  value={INR(current.gstr3b.itcSgst)}   icon={IndianRupee} accent="indigo" />
                <KpiCard label="Total ITC" value={INR(current.gstr3b.itcTotal)}  icon={IndianRupee} accent="green" />
              </div>
              {current.gstr3b.itcIneligible > 0 && (
                <div className="text-xs text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ineligible ITC: {INR(current.gstr3b.itcIneligible)} — blocked under Rule 17(5)
                </div>
              )}
            </div>

            {/* Net liability */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <SectionHeader title="6 — Payment of Tax" icon={IndianRupee} />
              <div className="space-y-2 text-xs">
                {[
                  { label: 'CGST Payable',        val: current.gstr3b.cgstPayable,       color: 'text-blue-300' },
                  { label: 'SGST Payable',         val: current.gstr3b.sgstPayable,       color: 'text-indigo-300' },
                  { label: 'IGST Payable',         val: current.gstr3b.igstPayable,       color: 'text-purple-300' },
                  { label: 'Interest (if late)',   val: current.gstr3b.interestLiability, color: 'text-amber-300' },
                  { label: 'Late Fee',             val: current.gstr3b.lateFee,           color: 'text-red-300' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-slate-400">{row.label}</span>
                    <span className={`font-mono font-bold ${row.color}`}>{INR(row.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 border-t-2 border-slate-700 mt-1">
                  <span className="text-slate-200 font-bold">Net Tax Payable</span>
                  <span className="font-mono font-bold text-lg text-emerald-300">{INR(current.gstr3b.totalNetLiability)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAX CALENDAR ══════════════════════════════════════════════════════ */}
        {tab === 'calendar' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <SectionHeader title="GST Filing Calendar" icon={Calendar} badge={`${monthlySummaries.filter(m=>!m.gstr3bFiled).length} pending`} />
            <div className="space-y-3">
              {monthlySummaries.map((m, i) => {
                const today = new Date().toISOString().slice(0, 10);
                const gstr1Overdue  = !m.gstr1Filed  && today > m.gstr1DueDate;
                const gstr3bOverdue = !m.gstr3bFiled && today > m.gstr3bDueDate;
                return (
                  <div key={m.month}
                    className={`border rounded-xl p-4 ${(gstr1Overdue || gstr3bOverdue) ? 'border-red-500/30 bg-red-900/10' : m.gstr3bFiled ? 'border-emerald-500/20 bg-emerald-900/5' : 'border-slate-800 bg-slate-900/30'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{fmtMonth(m.month)}</span>
                        {(gstr1Overdue || gstr3bOverdue) && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {m.gstr3bFiled && !gstr3bOverdue && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Liability: <span className="text-slate-300 font-bold">{INR(m.gstr3b.totalNetLiability)}</span>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-300">GSTR-1</div>
                          <div className="text-slate-600 mt-0.5">Due: {m.gstr1DueDate}</div>
                        </div>
                        <FilingBadge filed={m.gstr1Filed} dueDate={m.gstr1DueDate} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-300">GSTR-3B</div>
                          <div className="text-slate-600 mt-0.5">Due: {m.gstr3bDueDate}</div>
                        </div>
                        <FilingBadge filed={m.gstr3bFiled} dueDate={m.gstr3bDueDate} />
                      </div>
                    </div>
                    {m.penaltyRisk > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Estimated penalty risk: {INR(m.penaltyRisk)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ ANNUAL SUMMARY ════════════════════════════════════════════════════ */}
        {tab === 'annual' && annualReport && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-200">FY {annualReport.fy} — Annual Tax & P&L Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">{annualReport.pumpName} | GSTIN: {annualReport.gstin}</p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Annual Revenue"     value={INR(annualReport.annualRevenue, 0)}     icon={IndianRupee} accent="blue"   trend="up" />
              <KpiCard label="Fuel Revenue"       value={INR(annualReport.annualFuelRevenue, 0)} icon={Fuel}        accent="purple" />
              <KpiCard label="Annual Gross Profit"value={INR(annualReport.annualGrossProfit, 0)} icon={TrendingUp}  accent={annualReport.annualGrossProfit > 0 ? 'green' : 'red'} />
              <KpiCard label="Annual Net Profit"  value={INR(annualReport.annualNetProfit, 0)}   icon={TrendingUp}  accent={annualReport.annualNetProfit > 0 ? 'green' : 'red'} />
              <KpiCard label="Annual VAT"         value={INR(annualReport.annualVat, 0)}         icon={Percent}     accent="amber" />
              <KpiCard label="Annual Excise"      value={INR(annualReport.annualExcise, 0)}      icon={Shield}      accent="amber" />
              <KpiCard label="Annual GST"         value={INR(annualReport.annualGst, 0)}         icon={FileText}    accent="blue" />
              <KpiCard label="ITC Claimed"        value={INR(annualReport.annualItcClaimed, 0)}  icon={CheckCircle2}accent="green" />
            </div>

            {/* Compliance */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border border-emerald-500/30 bg-emerald-900/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{annualReport.filedMonths}</div>
                <div className="text-xs text-slate-400 mt-1">Returns Filed</div>
              </div>
              <div className={`border rounded-xl p-4 text-center ${annualReport.pendingMonths > 0 ? 'border-amber-500/30 bg-amber-900/10' : 'border-emerald-500/30 bg-emerald-900/10'}`}>
                <div className={`text-3xl font-bold ${annualReport.pendingMonths > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{annualReport.pendingMonths}</div>
                <div className="text-xs text-slate-400 mt-1">Returns Pending</div>
              </div>
              <div className={`border rounded-xl p-4 text-center ${annualReport.totalPenaltyRisk > 0 ? 'border-red-500/30 bg-red-900/10' : 'border-emerald-500/30 bg-emerald-900/10'}`}>
                <div className={`text-2xl font-bold ${annualReport.totalPenaltyRisk > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{INR(annualReport.totalPenaltyRisk, 0)}</div>
                <div className="text-xs text-slate-400 mt-1">Penalty Risk</div>
              </div>
            </div>

            {/* Month-by-month chart */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <SectionHeader title="Revenue by Month" icon={BarChart3} />
              <div className="space-y-2">
                {annualReport.months.map((m, i) => (
                  <MiniBar key={m.month} value={m.totalRevenue} max={maxRevenue}
                    color={i % 2 === 0 ? '#6366f1' : '#3b82f6'} label={fmtMonth(m.month)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FUEL MARGIN ═══════════════════════════════════════════════════════ */}
        {tab === 'margin' && current && (
          <div className="max-w-4xl mx-auto space-y-6">
            <SectionHeader title="Fuel Margin Analysis" icon={Fuel} badge={fmtMonth(current.month)} />

            <div className="grid sm:grid-cols-2 gap-4">
              {(['ms', 'hsd'] as const).map(fuel => {
                const fuelSalesForType = monthlySummaries[selectedMonth];
                const retailRate  = fuel === 'ms' ? 104.72 : 91.60;
                const purchaseCost = fuel === 'ms' ? 87.50 : 76.40;
                const approxLitres = fuel === 'ms' ? 45000 : 38000;
                const taxes = GSTReportEngine.computeFuelTaxes(approxLitres, fuel, retailRate, state);
                const dealerReceives = purchaseCost * approxLitres;
                const margin = taxes.dealerMargin * approxLitres;
                const marginPerL = taxes.dealerMargin;
                return (
                  <div key={fuel} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Fuel className={`w-4 h-4 ${fuel === 'ms' ? 'text-green-400' : 'text-amber-400'}`} />
                      <span className="font-bold text-slate-200 uppercase">{fuel === 'ms' ? 'Petrol (MS)' : 'Diesel (HSD)'}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'Retail Price/L',      val: `₹${retailRate.toFixed(2)}`, color: 'text-slate-200' },
                        { label: 'Dealer Purchase/L',   val: `₹${purchaseCost.toFixed(2)}`, color: 'text-slate-400' },
                        { label: 'VAT Component/L',     val: `₹${(taxes.vatAmount / approxLitres).toFixed(2)}`, color: 'text-amber-300' },
                        { label: 'Excise Duty/L',       val: `₹${(taxes.exciseDuty / approxLitres).toFixed(2)}`, color: 'text-orange-300' },
                        { label: 'Dealer Margin/L',     val: `₹${marginPerL.toFixed(2)}`, color: 'text-emerald-400' },
                        { label: 'Monthly Volume ~',    val: `${(approxLitres / 1000).toFixed(0)}K L`, color: 'text-slate-300' },
                        { label: 'Gross Dealer Income', val: INR(margin, 0), color: 'text-emerald-300 font-bold' },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between py-1 border-b border-slate-800/50">
                          <span className="text-slate-500">{row.label}</span>
                          <span className={`font-mono ${row.color}`}>{row.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 bg-slate-800/60 rounded-lg text-[10px] text-slate-500">
                      ℹ Dealer margin is regulated by OMC. Actual varies ±₹0.05/L by region.
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-0.5" />
              <strong>Note:</strong> Petrol and Diesel are outside the GST framework in India. Revenue is subject to Central Excise Duty (CESS) + State VAT. GST applies only to lubricants, accessories, and convenience store sales at 5%–18%.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
