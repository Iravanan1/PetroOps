/**
 * LiveShiftSimulator.tsx  ← FULL OVERHAUL
 * ─────────────────────────
 * Production stress-testing dashboard for PumpAI petroleum operations.
 *
 * Tabs:
 *  1. Run Configuration  — mode picker, failure toggles, launch controls
 *  2. Live Event Stream  — real-time scrolling event log
 *  3. Shift Inspector    — nozzle, cash, and payment breakdown per shift
 *  4. Replay Validator   — deterministic replay + snapshot integrity results
 *  5. Failure Analysis   — heatmap of failure modes, per-scenario status
 *  6. Metrics Dashboard  — KPI cards, load test progress, timing analytics
 *  7. Scenario Matrix    — all 10 scenarios with injected / pass / fail badges
 *  8. Accounting Replay  — carry-forward chain and ledger integrity
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RefreshCw, Terminal, AlertTriangle, CheckCircle2,
  AlertCircle, BarChart3, Database, Zap, Activity, ChevronRight,
  Clock, Shield, Layers, Eye, FlaskConical, TrendingUp, TrendingDown,
  Package, RotateCcw, Wifi, WifiOff, Copy
} from 'lucide-react';
import {
  ShiftStressEngine, SimEvent, SimRun, SimShift, StressMetrics,
  StressScenario, FailureMode, SeverityLevel
} from '../modules/shared/ShiftStressEngine';

// ─── PALETTE ──────────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<SeverityLevel, string> = {
  info:     'text-slate-300  bg-slate-800/60  border-slate-700',
  warn:     'text-amber-300  bg-amber-900/30  border-amber-700/50',
  error:    'text-red-300    bg-red-900/30    border-red-700/50',
  critical: 'text-rose-200   bg-rose-900/50   border-rose-600/60',
};

const SEVERITY_DOT: Record<SeverityLevel, string> = {
  info:     'bg-slate-500',
  warn:     'bg-amber-400',
  error:    'bg-red-500',
  critical: 'bg-rose-400 animate-pulse',
};

const MODE_COLORS: Record<string, string> = {
  single:     'from-blue-600 to-indigo-600',
  multi_day:  'from-purple-600 to-blue-600',
  load_test:  'from-amber-600 to-orange-600',
  stress:     'from-rose-600 to-red-700',
};

const ALL_FAILURE_MODES: { mode: FailureMode; label: string; icon: string }[] = [
  { mode: 'till_shortage',          label: 'Till Shortage',         icon: '💸' },
  { mode: 'duplicate_entry',        label: 'Duplicate Entry',        icon: '📋' },
  { mode: 'delayed_settlement',     label: 'Delayed Settlement',     icon: '⏱️' },
  { mode: 'ocr_failure',            label: 'OCR Failure',            icon: '📷' },
  { mode: 'carry_forward_mismatch', label: 'Carry-Forward Mismatch', icon: '↪️' },
  { mode: 'nozzle_rollback',        label: 'Nozzle Rollback',        icon: '⛽' },
  { mode: 'offline_conflict',       label: 'Offline Conflict',       icon: '☁️' },
  { mode: 'partial_write',          label: 'Partial Write',          icon: '💾' },
  { mode: 'duplicate_sync',         label: 'Duplicate Sync',         icon: '🔄' },
  { mode: 'network_interruption',   label: 'Network Interruption',   icon: '📡' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────────

const rupee = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtMs = (ms: number) => ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
const pct = (n: number, d: number) => d === 0 ? '0%' : `${((n / d) * 100).toFixed(1)}%`;

function KpiCard({ label, value, sub, accent = 'blue', icon: Icon }:
  { label: string; value: React.ReactNode; sub?: string; accent?: string; icon: React.ElementType }) {
  const accents: Record<string, string> = {
    blue:   'border-blue-500/30   bg-blue-500/8   text-blue-400',
    green:  'border-emerald-500/30 bg-emerald-500/8 text-emerald-400',
    amber:  'border-amber-500/30  bg-amber-500/8  text-amber-400',
    red:    'border-red-500/30    bg-red-500/8    text-red-400',
    purple: 'border-purple-500/30 bg-purple-500/8 text-purple-400',
    slate:  'border-slate-700     bg-slate-800/40 text-slate-400',
  };
  const [border, bg, txt] = accents[accent]?.split(' ') ?? accents.blue.split(' ');
  return (
    <div className={`border ${border} ${bg} rounded-xl p-4 space-y-1`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-4 h-4 ${txt}`} />
        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, badge }: { title: string; icon: React.ElementType; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</span>
      {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">{badge}</span>}
    </div>
  );
}

// ─── TAB IDS ─────────────────────────────────────────────────────────────────────

type TabId = 'config' | 'stream' | 'inspector' | 'replay' | 'failures' | 'metrics' | 'scenarios' | 'accounting';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'config',     label: 'Configure',       icon: FlaskConical },
  { id: 'stream',     label: 'Live Stream',      icon: Terminal },
  { id: 'inspector',  label: 'Shift Inspector',  icon: Eye },
  { id: 'replay',     label: 'Replay Validator', icon: RotateCcw },
  { id: 'failures',   label: 'Failure Analysis', icon: AlertTriangle },
  { id: 'metrics',    label: 'Metrics',          icon: BarChart3 },
  { id: 'scenarios',  label: 'Scenario Matrix',  icon: Layers },
  { id: 'accounting', label: 'Accounting Replay',icon: Database },
];

// ─── ANIMATED EVENT COUNTER ────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    const step = Math.ceil(value / 20);
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, value);
      setDisplayed(current);
      if (current >= value) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [value]);
  return <>{displayed.toLocaleString('en-IN')}</>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────────

export default function LiveShiftSimulator() {
  const [tab, setTab] = useState<TabId>('config');

  // Config state
  const [mode, setMode] = useState<SimRun['mode']>('single');
  const [days, setDays] = useState(7);
  const [txTarget, setTxTarget] = useState(1000);
  const [failureRate, setFailureRate] = useState(0.3);
  const [selectedFailures, setSelectedFailures] = useState<FailureMode[]>([]);
  const [simMode, setSimMode] = useState<'operator' | 'manager' | 'locked_period'>('operator');

  // Run state
  const [isRunning, setIsRunning]     = useState(false);
  const [run, setRun]                 = useState<SimRun | null>(null);
  const [metrics, setMetrics]         = useState<StressMetrics | null>(null);
  const [replayResults, setReplayResults] = useState<any[]>([]);
  const [streamEvents, setStreamEvents]   = useState<SimEvent[]>([]);
  const [progress, setProgress]           = useState(0);
  const [selectedShiftIdx, setSelectedShiftIdx] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  // Auto-scroll stream
  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = 0;
  }, [streamEvents]);

  const toggleFailure = (mode: FailureMode) => {
    setSelectedFailures(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  // ── Launch simulation ──────────────────────────────────────────────────────────

  const handleLaunch = useCallback(async () => {
    setIsRunning(true);
    runningRef.current = true;
    setRun(null);
    setMetrics(null);
    setReplayResults([]);
    setStreamEvents([]);
    setProgress(0);
    setTab('stream');

    // Small async tick to allow React to render
    await new Promise(r => setTimeout(r, 50));

    const config = { days, txTarget, failureRate, scenarios: selectedFailures, simMode };
    const { run: r, metrics: m, replayResults: rr } = ShiftStressEngine.runStressTest(mode, config);

    // Stream events progressively
    const allEvents = r.shifts.flatMap(s => s.events);
    const chunkSize = Math.max(1, Math.floor(allEvents.length / 40));

    for (let i = 0; i < allEvents.length; i += chunkSize) {
      if (!runningRef.current) break;
      const chunk = allEvents.slice(i, i + chunkSize);
      setStreamEvents(prev => [...chunk, ...prev].slice(0, 500));
      setProgress(Math.min(100, Math.round(((i + chunkSize) / allEvents.length) * 100)));
      await new Promise(r => setTimeout(r, 20));
    }

    setProgress(100);
    setRun(r);
    setMetrics(m);
    setReplayResults(rr);
    setIsRunning(false);
    runningRef.current = false;
  }, [mode, days, txTarget, failureRate, selectedFailures, simMode]);

  const handleStop = () => {
    runningRef.current = false;
    setIsRunning(false);
  };

  const handleReset = () => {
    setRun(null); setMetrics(null); setReplayResults([]); setStreamEvents([]); setProgress(0);
  };

  const selectedShift = run?.shifts?.[selectedShiftIdx] ?? null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-200 flex flex-col">

      {/* ── TOP HEADER ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-[#0b0f1a]/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Live Shift Simulator & Stress Tester
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Petroleum station operations — full lifecycle + reconciliation + offline failure injection</p>
        </div>
        <div className="flex items-center gap-3">
          {run && (
            <>
              <span className="text-[10px] font-mono text-slate-500">{run.id}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium
                ${run.ledgerIntact ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
                {run.ledgerIntact ? '✓ Ledger Intact' : '✗ Integrity Failure'}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium
                ${run.replayValid ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
                {run.replayValid ? '✓ Replay Valid' : '⚠ Replay Issues'}
              </span>
            </>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Simulating…
            </div>
          )}
        </div>
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────────────────────────────── */}
      {isRunning && (
        <div className="h-0.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ── TAB BAR ────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-slate-800/50 overflow-x-auto scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-2 font-medium rounded-t-lg transition whitespace-nowrap
                ${active
                  ? 'bg-slate-800 border border-slate-700 border-b-slate-800 text-slate-200 -mb-px'
                  : 'text-slate-500 hover:text-slate-300'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'stream' && streamEvents.length > 0 && (
                <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">{streamEvents.length}</span>
              )}
              {t.id === 'failures' && metrics?.failures > 0 && (
                <span className="text-[9px] bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full">{metrics.failures}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ═══ TAB: CONFIG ════════════════════════════════════════════════════════ */}
        {tab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Mode selector */}
            <div>
              <SectionHeader title="Simulation Mode" icon={FlaskConical} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { id: 'single',    label: 'Single Shift',     desc: '1 shift, manual failure injection' },
                  { id: 'multi_day', label: 'Multi-Day Replay', desc: 'N days, randomized failures' },
                  { id: 'load_test', label: 'Load Test',        desc: '1000+ transactions across N shifts' },
                  { id: 'stress',    label: 'Full Stress Run',  desc: 'All 9 failure modes, sequential' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`p-4 rounded-xl border text-left transition
                      ${mode === m.id
                        ? `bg-gradient-to-br ${MODE_COLORS[m.id]} border-transparent text-white shadow-lg`
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    <div className="text-sm font-bold mb-1">{m.label}</div>
                    <div className="text-[10px] opacity-80">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific params */}
            <div className="grid sm:grid-cols-3 gap-4">
              {mode === 'multi_day' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Days to replay</label>
                  <input type="number" min={1} max={90} value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
              )}
              {(mode === 'multi_day' || mode === 'stress') && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Failure injection rate</label>
                  <input type="range" min={0} max={1} step={0.05} value={failureRate}
                    onChange={e => setFailureRate(Number(e.target.value))}
                    className="w-full accent-rose-500" />
                  <div className="text-xs text-rose-400 font-mono">{(failureRate * 100).toFixed(0)}%</div>
                </div>
              )}
              {mode === 'load_test' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Transaction target</label>
                  <input type="number" min={100} max={10000} step={100} value={txTarget}
                    onChange={e => setTxTarget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                </div>
              )}
            </div>

            {/* Operational Replay Mode */}
            <div>
              <SectionHeader title="Operational Replay Mode" icon={Shield} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { id: 'operator',      label: 'Operator Mode',        desc: 'Standard daily shifts with offline / entry failure checks' },
                  { id: 'manager',       label: 'Manager Override Mode', desc: 'Shortages auto-balanced via Settlement Adjustments' },
                  { id: 'locked_period', label: 'Locked-Period Mode',   desc: 'Tests strict immutability checks on historic periods' },
                ] as const).map(sm => (
                  <button
                    key={sm.id}
                    onClick={() => setSimMode(sm.id)}
                    className={`p-3 rounded-xl border text-left transition
                      ${simMode === sm.id
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    <div className="text-xs font-bold mb-0.5">{sm.label}</div>
                    <div className="text-[10px] opacity-85 leading-normal">{sm.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Failure injection (single + stress) */}
            {(mode === 'single' || mode === 'stress') && (
              <div>
                <SectionHeader title="Inject Failure Scenarios" icon={AlertTriangle} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {ALL_FAILURE_MODES.map(fm => (
                    <button
                      key={fm.mode}
                      onClick={() => toggleFailure(fm.mode)}
                      className={`p-2.5 rounded-lg border text-left text-[11px] transition
                        ${selectedFailures.includes(fm.mode)
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}>
                      <div className="text-sm mb-0.5">{fm.icon}</div>
                      {fm.label}
                    </button>
                  ))}
                </div>
                {selectedFailures.length > 0 && (
                  <p className="text-xs text-rose-400 mt-2">
                    {selectedFailures.length} failure{selectedFailures.length > 1 ? 's' : ''} will be injected into the simulation
                  </p>
                )}
              </div>
            )}

            {/* Launch controls */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleLaunch}
                disabled={isRunning}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r
                  ${MODE_COLORS[mode]} text-white shadow-lg hover:opacity-90 transition disabled:opacity-50`}>
                {isRunning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Simulating…</> : <><Play className="w-4 h-4" /> Launch Simulation</>}
              </button>
              {isRunning && (
                <button onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition text-sm">
                  <Square className="w-4 h-4" /> Stop
                </button>
              )}
              {run && !isRunning && (
                <button onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition text-sm">
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
              )}
            </div>

            {/* Quick summary after run */}
            {run && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-2">
                <KpiCard label="Shifts"      value={run.shiftCount}    icon={Package}   accent="blue" />
                <KpiCard label="Events"      value={run.txCount + run.shifts.flatMap(s=>s.events).length} icon={Activity} accent="purple" />
                <KpiCard label="Failures"    value={run.failureCount}  icon={AlertCircle} accent={run.failureCount > 0 ? 'red' : 'green'} />
                <KpiCard label="Warnings"    value={run.warningCount}  icon={AlertTriangle} accent="amber" />
                <KpiCard label="Duration"    value={fmtMs(run.durationMs)} icon={Clock} accent="slate" />
                <KpiCard label="Replay OK"   value={run.replayValid ? '✓ PASS' : '✗ FAIL'} icon={Shield} accent={run.replayValid ? 'green' : 'red'} />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: LIVE STREAM ═══════════════════════════════════════════════════ */}
        {tab === 'stream' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader title="Event Stream" icon={Terminal} badge={`${streamEvents.length} events`} />
              <div className="flex gap-2 text-[10px]">
                {(['info','warn','error','critical'] as SeverityLevel[]).map(s => (
                  <span key={s} className={`px-2 py-0.5 rounded border ${SEVERITY_STYLE[s]}`}>{s}</span>
                ))}
              </div>
            </div>
            <div
              ref={streamRef}
              className="bg-[#040608] border border-slate-800 rounded-xl p-3 h-[calc(100vh-220px)] overflow-y-auto font-mono text-[11px] space-y-1">
              {streamEvents.length === 0 && (
                <div className="text-center py-20 text-slate-600">
                  {isRunning ? 'Streaming simulation events…' : 'Launch simulation to stream events.'}
                </div>
              )}
              {streamEvents.map((ev, i) => (
                <div key={ev.id + i}
                  className={`flex items-start gap-2 px-2 py-1.5 rounded border ${SEVERITY_STYLE[ev.severity]} transition-all`}>
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[ev.severity]}`} />
                  <span className="text-slate-600 shrink-0">[{ev.seq.toString().padStart(4, '0')}]</span>
                  <span className="text-slate-500 shrink-0">{ev.ts.slice(11, 23)}</span>
                  <span className={`shrink-0 uppercase font-bold text-[9px] tracking-wider px-1.5 py-0.5 rounded
                    ${ev.type.includes('FAILURE') || ev.type.includes('ROLLBACK') || ev.type.includes('CONFLICT')
                      ? 'bg-red-900/60 text-red-400'
                      : ev.type.includes('SHIFT')
                        ? 'bg-blue-900/60 text-blue-400'
                        : ev.type.includes('SNAPSHOT')
                          ? 'bg-purple-900/60 text-purple-400'
                          : 'bg-slate-800 text-slate-400'}`}>
                    {ev.type.slice(0, 14)}
                  </span>
                  <span className="text-slate-300 flex-1 leading-relaxed">{ev.message}</span>
                  <span className="text-slate-700 shrink-0 text-[9px] font-mono">#{ev.checksum}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TAB: SHIFT INSPECTOR ════════════════════════════════════════════════ */}
        {tab === 'inspector' && (
          <div className="max-w-5xl mx-auto space-y-4">
            {!run ? (
              <div className="text-center py-20 text-slate-500">Run a simulation first.</div>
            ) : (
              <>
                {/* Shift selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  {run.shifts.map((s, i) => (
                    <button key={s.id} onClick={() => setSelectedShiftIdx(i)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition
                        ${i === selectedShiftIdx
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                      {s.date} {s.label}
                      {s.shortage > 0 && <span className="ml-1 text-red-400">⚠</span>}
                    </button>
                  ))}
                </div>

                {selectedShift && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Nozzle table */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>⛽</span> Nozzle Register
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Nozzle</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Open</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Close</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Net L</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedShift.nozzles.map(nz => {
                            const net = Math.max(0, nz.closing - nz.opening - nz.testing);
                            return (
                              <tr key={nz.id} className="hover:bg-slate-800/30 transition">
                                <td className="px-3 py-2 text-slate-300 font-medium">{nz.label} <span className="text-slate-500">({nz.fuel})</span></td>
                                <td className="px-3 py-2 text-right text-slate-400 font-mono">{nz.opening.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-slate-400 font-mono">{nz.closing.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-emerald-400 font-mono font-bold">{net.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-slate-200 font-mono">{rupee(net * nz.rate)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cash summary */}
                    <div className="space-y-3">
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">💰 Cash Flow</div>
                        {[
                          { label: 'Opening Float',   val: selectedShift.openingCash,     color: 'text-slate-300' },
                          { label: 'UPI Collected',   val: selectedShift.upiTotal,         color: 'text-blue-300' },
                          { label: 'Card Collected',  val: selectedShift.cardTotal,        color: 'text-indigo-300' },
                          { label: 'Credit Recovery', val: selectedShift.creditRecovery,   color: 'text-emerald-300' },
                          { label: '− Credit Sales',  val: -selectedShift.creditSales,     color: 'text-amber-300' },
                          { label: '− Expenses',      val: -selectedShift.expenses,        color: 'text-orange-300' },
                          { label: 'Till Counted',    val: selectedShift.tillCounted,      color: 'text-slate-100 font-bold text-sm border-t border-slate-700 pt-2 mt-1' },
                          { label: selectedShift.shortage > 0 ? '⚠ Shortage' : '✓ Balance', val: -selectedShift.shortage, color: selectedShift.shortage > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold' },
                        ].map(row => (
                          <div key={row.label} className={`flex justify-between text-xs ${row.color}`}>
                            <span>{row.label}</span>
                            <span className="font-mono">{rupee(Math.abs(row.val))}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📊 Dip Readings</div>
                        <div className="space-y-1">
                          {Object.entries(selectedShift.dipReadings).map(([tank, litres]) => (
                            <div key={tank} className="flex justify-between text-xs">
                              <span className="text-slate-400">{tank.replace(/_/g, ' ')}</span>
                              <span className="font-mono text-blue-300">{Number(litres).toLocaleString('en-IN')}L</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Event log for this shift */}
                    <div className="sm:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Event Log ({selectedShift.events.length} events)
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/40">
                        {selectedShift.events.map((ev, i) => (
                          <div key={i} className={`flex items-center gap-3 px-4 py-2 text-[11px] ${SEVERITY_STYLE[ev.severity]}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[ev.severity]}`} />
                            <span className="text-slate-600 shrink-0">{ev.ts.slice(11, 19)}</span>
                            <span className="text-slate-500 shrink-0 font-mono text-[9px]">{ev.type}</span>
                            <span className="flex-1 text-slate-300">{ev.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: REPLAY VALIDATOR ═══════════════════════════════════════════════ */}
        {tab === 'replay' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {!run ? (
              <div className="text-center py-20 text-slate-500">Run a simulation first.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <KpiCard label="Replays Run"      value={replayResults.length}                           icon={RotateCcw} accent="blue" />
                  <KpiCard label="Replay Successes"  value={replayResults.filter(r => r.valid).length}     icon={CheckCircle2} accent="green" />
                  <KpiCard label="Replay Failures"   value={replayResults.filter(r => !r.valid).length}    icon={AlertCircle} accent={replayResults.some(r=>!r.valid)?'red':'green'} />
                </div>
                <div className="space-y-2">
                  {replayResults.map((r, i) => {
                    const shift = run.shifts[i];
                    if (!shift) return null;
                    return (
                      <div key={shift.id}
                        className={`border rounded-xl p-4 ${r.valid ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {r.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                            <span className="text-sm font-medium text-slate-200">{shift.date} — {shift.label}</span>
                            <span className="text-xs text-slate-500 font-mono">{shift.operatorName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={r.matches ? 'text-emerald-400' : 'text-red-400'}>
                              {r.matches ? '✓ Hash Match' : '✗ Hash Mismatch'}
                            </span>
                            <span className="font-mono text-slate-600 text-[9px]">
                              {r.recomputedHash} / {shift.snapshotHash}
                            </span>
                          </div>
                        </div>
                        {r.issues.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {r.issues.map((issue: string, j: number) => (
                              <div key={j} className="flex items-start gap-2 text-xs text-red-300">
                                <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-red-500" />
                                {issue}
                              </div>
                            ))}
                          </div>
                        )}
                        {r.valid && (
                          <p className="text-xs text-emerald-400/70 mt-1">
                            All events replay deterministically. Snapshot integrity confirmed.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: FAILURE ANALYSIS ═══════════════════════════════════════════════ */}
        {tab === 'failures' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {!run ? (
              <div className="text-center py-20 text-slate-500">Run a simulation first.</div>
            ) : (
              <>
                <SectionHeader title="Failure Heatmap" icon={AlertTriangle} badge={`${run.failureCount} failures`} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {ALL_FAILURE_MODES.map(fm => {
                    const allEvs = run.shifts.flatMap(s => s.events);
                    const count = allEvs.filter(e => e.failureMode === fm.mode).length;
                    const intensity = Math.min(count / 3, 1);
                    return (
                      <div key={fm.mode}
                        className={`rounded-xl p-3 border text-center transition
                          ${count > 0
                            ? 'border-red-500/40 bg-red-900/20'
                            : 'border-slate-800 bg-slate-900/40'}`}
                        style={{ opacity: count > 0 ? 0.6 + intensity * 0.4 : 0.5 }}>
                        <div className="text-2xl mb-1">{fm.icon}</div>
                        <div className="text-[10px] text-slate-400 font-medium leading-tight">{fm.label}</div>
                        <div className={`text-xl font-bold mt-1 ${count > 0 ? 'text-red-400' : 'text-slate-600'}`}>{count}</div>
                        <div className="text-[9px] text-slate-600">occurrences</div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 pt-6">
                  <SectionHeader title="Failure Event Detail" icon={AlertCircle} />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {run.shifts.flatMap(s => s.events)
                      .filter(e => e.failureMode !== 'none')
                      .map((ev, i) => (
                        <div key={i} className={`border rounded-lg px-4 py-3 ${SEVERITY_STYLE[ev.severity]}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">{ev.failureMode.replace(/_/g, ' ')}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase border ${SEVERITY_STYLE[ev.severity]}`}>{ev.severity}</span>
                          </div>
                          <p className="text-xs text-slate-300">{ev.message}</p>
                          <p className="text-[10px] text-slate-600 mt-1 font-mono">shift: {ev.shiftId} | checksum: {ev.checksum}</p>
                        </div>
                      ))}
                    {run.shifts.flatMap(s => s.events).filter(e => e.failureMode !== 'none').length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm">No failures injected in this run.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: METRICS ════════════════════════════════════════════════════════ */}
        {tab === 'metrics' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {!metrics ? (
              <div className="text-center py-20 text-slate-500">Run a simulation first.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard label="Total Events"      value={<AnimatedNumber value={metrics.totalEvents} />}      icon={Activity}      accent="blue" />
                  <KpiCard label="Failures"           value={metrics.failures}           icon={AlertCircle}   accent={metrics.failures > 0 ? 'red' : 'green'} />
                  <KpiCard label="Warnings"           value={metrics.warnings}           icon={AlertTriangle} accent={metrics.warnings > 0 ? 'amber' : 'green'} />
                  <KpiCard label="Replays Run"        value={metrics.replaysRun}         icon={RotateCcw}     accent="purple" />
                  <KpiCard label="Replay Successes"   value={metrics.replaySuccesses}    icon={CheckCircle2}  accent="green" />
                  <KpiCard label="Replay Failures"    value={metrics.replayFailures}     icon={AlertCircle}   accent={metrics.replayFailures > 0 ? 'red' : 'green'} />
                  <KpiCard label="Avg Shift Time"     value={fmtMs(metrics.avgShiftDurationMs)} icon={Clock} accent="slate" />
                  <KpiCard label="Shortages Detected" value={metrics.shortagesDetected}  icon={TrendingDown}  accent={metrics.shortagesDetected > 0 ? 'red' : 'green'} />
                  <KpiCard label="Duplicates Detected" value={metrics.duplicatesDetected} icon={Copy}         accent={metrics.duplicatesDetected > 0 ? 'amber' : 'green'} />
                  <KpiCard label="OCR Failures"       value={metrics.ocrFailures}        icon={Eye}           accent={metrics.ocrFailures > 0 ? 'red' : 'green'} />
                  <KpiCard label="Offline Conflicts"  value={metrics.offlineConflicts}   icon={WifiOff}       accent={metrics.offlineConflicts > 0 ? 'amber' : 'green'} />
                </div>

                {/* Integrity status row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Ledger Integrity',     ok: metrics.ledgerIntegrityOk,   desc: 'All snapshot hashes match replayed data' },
                    { label: 'Snapshot Continuity',  ok: metrics.snapshotContinuity,  desc: 'All shifts have valid checkpoint hashes' },
                    { label: 'Carry-Forward Valid',  ok: metrics.carryForwardValid,   desc: 'No carry-forward mismatches detected' },
                  ].map(item => (
                    <div key={item.label}
                      className={`border rounded-xl p-4 ${item.ok ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {item.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                        <span className={`text-sm font-bold ${item.ok ? 'text-emerald-300' : 'text-red-300'}`}>{item.ok ? 'PASS' : 'FAIL'}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-300 mb-1">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Replay pass rate bar */}
                {metrics.replaysRun > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Replay Pass Rate</span>
                      <span className="font-mono">{pct(metrics.replaySuccesses, metrics.replaysRun)}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${metrics.replaySuccesses === metrics.replaysRun ? 'bg-emerald-500' : 'bg-gradient-to-r from-red-500 to-emerald-500'}`}
                        style={{ width: pct(metrics.replaySuccesses, metrics.replaysRun) }}
                      />
                    </div>
                  </div>
                )}

                {/* Run summary */}
                {run && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Run Summary</div>
                    <p className="text-xs text-slate-300 font-mono">{run.summary}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                      <div>Mode: <span className="text-slate-300">{run.mode}</span></div>
                      <div>Shifts: <span className="text-slate-300">{run.shiftCount}</span></div>
                      <div>Duration: <span className="text-slate-300">{fmtMs(run.durationMs)}</span></div>
                      <div>Tx count: <span className="text-slate-300">{run.txCount.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: SCENARIO MATRIX ════════════════════════════════════════════════ */}
        {tab === 'scenarios' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <SectionHeader title="Stress Scenario Matrix" icon={Layers} badge="10 scenarios" />
            {(run?.scenarios || ShiftStressEngine.getStressScenarios()).map(sc => (
              <div key={sc.id}
                className={`border rounded-xl p-4 ${sc.injected ? 'border-rose-500/30 bg-rose-900/10' : 'border-slate-800 bg-slate-900/30'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">{sc.name}</span>
                      <span className="text-[9px] font-mono text-slate-600">{sc.failureMode}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{sc.description}</p>
                    <div className="flex items-start gap-1.5 text-[11px] text-emerald-400/80">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{sc.expectedOutcome}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {sc.injected ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-medium">
                        Injected
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                        Not injected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TAB: ACCOUNTING REPLAY ══════════════════════════════════════════════ */}
        {tab === 'accounting' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {!run || !run.accountingReplay ? (
              <div className="text-center py-20 text-slate-500">Run a simulation first.</div>
            ) : (
              <>
                {/* 1. Authoritative Double-Entry Ledger State */}
                <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-3">
                    <div>
                      <SectionHeader title="Authoritative Double-Entry Ledger Replay" icon={Database} />
                      <p className="text-[10px] text-slate-500 -mt-2">Replayed strictly by CoreReplayEngine over {run.accountingReplay.replayState.processedCount} transactions</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-mono font-medium
                        ${run.accountingReplay.replayState.isBalanced 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                          : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
                        {run.accountingReplay.replayState.isBalanced ? '✓ Balanced (Debits = Credits)' : '✗ Out of Balance'}
                      </span>
                      <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400 font-mono flex items-center gap-1">
                        <Shield className="w-3 h-3 text-indigo-400" />
                        Trace: {run.accountingReplay.replayState.rollingChecksum}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Debit Accounts */}
                    <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/80">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1 flex justify-between">
                        <span>Debit Accounts (Assets & Expenses)</span>
                        <span className="text-emerald-400">Dr (+)</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(run.accountingReplay.replayState.accountBalances)
                          .filter(([acc]) => acc !== 'Fuel Revenue')
                          .map(([acc, bal]) => (
                            <div key={acc} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                              <span className="text-slate-400">{acc}</span>
                              <span className="font-mono text-slate-200">{rupee(bal as number)}</span>
                            </div>
                          ))}
                        <div className="flex justify-between text-xs font-bold text-slate-200 pt-2 border-t border-slate-700">
                          <span>Total Debits</span>
                          <span className="font-mono text-emerald-400">
                            {rupee(
                              Object.entries(run.accountingReplay.replayState.accountBalances)
                                .filter(([acc]) => acc !== 'Fuel Revenue')
                                .reduce((sum, [, bal]) => sum + (bal as number), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credit Accounts */}
                    <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/80">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1 flex justify-between">
                        <span>Credit Accounts (Revenue & Liabilities)</span>
                        <span className="text-indigo-400">Cr (+)</span>
                      </div>
                      <div className="space-y-2 flex flex-col h-full justify-between pb-8">
                        <div>
                          {Object.entries(run.accountingReplay.replayState.accountBalances)
                            .filter(([acc]) => acc === 'Fuel Revenue')
                            .map(([acc, bal]) => (
                              <div key={acc} className="flex justify-between text-xs py-1 border-b border-slate-800/40">
                                <span className="text-slate-400">{acc}</span>
                                <span className="font-mono text-slate-200">{rupee(bal as number)}</span>
                              </div>
                            ))}
                          {Object.entries(run.accountingReplay.replayState.accountBalances)
                            .filter(([acc]) => acc === 'Fuel Revenue').length === 0 && (
                            <div className="text-xs text-slate-500 py-2">No Credit Accounts posted.</div>
                          )}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-200 pt-2 border-t border-slate-700">
                          <span>Total Credits</span>
                          <span className="font-mono text-indigo-400">
                            {rupee(
                              Object.entries(run.accountingReplay.replayState.accountBalances)
                                .filter(([acc]) => acc === 'Fuel Revenue')
                                .reduce((sum, [, bal]) => sum + (bal as number), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Mismatch Reports & Recommendations */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 space-y-4">
                    <SectionHeader title="Mismatch Audit Reports" icon={AlertCircle} badge={`${run.accountingReplay.mismatchReport.length} items`} />
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {run.accountingReplay.mismatchReport.length === 0 ? (
                        <div className="text-center py-10 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                          <div className="text-xs font-bold uppercase">All Continuity Audits Passed</div>
                          <p className="text-[10px] text-emerald-500/80 mt-1">Carry-forward, nozzles, settlements, and historic locked periods are in perfect alignment.</p>
                        </div>
                      ) : (
                        run.accountingReplay.mismatchReport.map((m, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border text-xs leading-normal flex gap-3
                            ${m.severity === 'critical'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : m.severity === 'error'
                                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                : m.severity === 'warn'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300'}`}>
                            <div className="mt-0.5 shrink-0">
                              {m.severity === 'critical' || m.severity === 'error' ? (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold uppercase text-[9px] tracking-wider bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                  {m.category.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[9px] text-slate-500">{m.timestamp.slice(11, 19)}</span>
                              </div>
                              <p className="text-[11px] text-slate-200">{m.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. Correction Recommendations Box */}
                  <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 space-y-4">
                    <SectionHeader title="Actionable Correction Recommendations" icon={Zap} badge={`${run.accountingReplay.correctionRecommendations.length} recommendations`} />
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {run.accountingReplay.correctionRecommendations.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 bg-slate-900/20 border border-slate-800 rounded-xl p-4">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          <div className="text-xs font-bold uppercase">No Corrections Required</div>
                          <p className="text-[10px] text-slate-500 mt-1">Operational state is healthy and reconciled. Double-entry engine reports no corrective steps are required.</p>
                        </div>
                      ) : (
                        run.accountingReplay.correctionRecommendations.map((rec, idx) => (
                          <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                              {rec.problem}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal">{rec.solution}</p>
                            {rec.actionableCmd && (
                              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-3 group mt-1.5">
                                <code className="text-[10px] text-indigo-400 font-mono truncate select-all">{rec.actionableCmd}</code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.actionableCmd || '');
                                    alert('Actionable command copied to clipboard!');
                                  }}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-slate-300 transition shrink-0"
                                  title="Copy command">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Complete Audit Trace of Shifts */}
                <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl p-5 space-y-4">
                  <SectionHeader title="Shift Continuity Ledger Audit Trace" icon={Layers} />
                  <div className="grid gap-3">
                    {run.shifts.map((s, i) => {
                      const prev = run.shifts[i - 1];
                      const cfDelta = prev ? Math.abs(s.openingCash - prev.carryForward) : 0;
                      const cfOk = cfDelta < 0.01 || i === 0;
                      const rr = replayResults[i];
                      
                      // Find nozzle continuity issues for this shift
                      const nozzleIssues = run.accountingReplay!.nozzleContinuityChecks.filter(c => c.shiftId === s.id && !c.passed);
                      const settlementIssue = run.accountingReplay!.settlementChecks.find(c => c.shiftId === s.id && !c.passed);
                      const lockViolation = run.accountingReplay!.lockedPeriodViolations.find(c => c.date === s.date);

                      return (
                        <div key={s.id}
                          className={`border rounded-xl p-4 transition hover:bg-slate-900/20
                            ${cfOk && rr?.valid && nozzleIssues.length === 0 && !settlementIssue && !lockViolation
                              ? 'border-slate-800/80 bg-slate-900/10' 
                              : 'border-red-500/30 bg-red-900/5'}`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 border-b border-slate-800/50 pb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-300">{s.date} — {s.label}</span>
                              <span className="text-[10px] text-slate-500">{s.operatorName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase
                                ${rr?.valid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {rr?.valid ? 'Replay OK' : 'Replay Fail'}
                              </span>
                              <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase
                                ${cfOk ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {cfOk ? 'Carry-Forward OK' : 'CF Break'}
                              </span>
                              <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase
                                ${nozzleIssues.length === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {nozzleIssues.length === 0 ? 'Meter OK' : 'Meter Gap'}
                              </span>
                              {lockViolation && (
                                <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse">
                                  Lock Violation Blocked
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Opening Float</div>
                              <div className="font-mono text-slate-200 font-medium">{rupee(s.openingCash)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Till Counted</div>
                              <div className="font-mono text-slate-200 font-medium">{rupee(s.tillCounted)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Carry Forward</div>
                              <div className="font-mono text-emerald-400 font-bold">{rupee(s.carryForward)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">Shortage / Variance</div>
                              <div className={`font-mono font-medium ${s.shortage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {s.shortage > 0 ? `−${rupee(s.shortage)}` : '₹0.00'}
                              </div>
                            </div>
                          </div>

                          {/* Specific issues warning box if any */}
                          {(nozzleIssues.length > 0 || settlementIssue || lockViolation || !cfOk) && (
                            <div className="mt-3 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 space-y-1">
                              {!cfOk && (
                                <div className="text-[10px] text-red-300 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Opening cash is broken! Previous shift closing cash: {rupee(prev.carryForward)}. Gap: {rupee(cfDelta)}.</span>
                                </div>
                              )}
                              {nozzleIssues.map((nzI, nIdx) => (
                                <div key={nIdx} className="text-[10px] text-red-300 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Nozzle dial break on {nzI.nozzleId}: opening was {nzI.actualOpening}L instead of {nzI.expectedOpening}L closing. Gap: {nzI.delta.toFixed(2)}L.</span>
                                </div>
                              ))}
                              {settlementIssue && (
                                <div className="text-[10px] text-red-300 flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Cash till counted deviates from expected by {rupee(settlementIssue.variance)} but reported shortage is {rupee(settlementIssue.recordedShortage)}.</span>
                                </div>
                              )}
                              {lockViolation && (
                                <div className="text-[10px] text-rose-300 flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                  <span>Immutable Ledger Violation Blocked: attempt to write chronological seq {lockViolation.attemptedTxId} failed.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
