/**
 * DesktopControlCenter.tsx
 * ─────────────────────────
 * Desktop management HUD for PumpAI offline-first station operations.
 *
 * Panels:
 *  1. System vitals (platform, memory, disk, uptime)
 *  2. Local database health (IndexedDB store counts)
 *  3. Backup manager (auto-backup status, recent backups, manual export/restore)
 *  4. Printer control (test 58mm / 80mm / A4)
 *  5. AI endpoint status (Ollama, LM Studio, Backend)
 *  6. Crash & startup logs viewer
 *  7. App lifecycle controls (relaunch, quit, update check)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Database, HardDrive, Cpu, Wifi, WifiOff, Printer,
  DownloadCloud, UploadCloud, RefreshCw, AlertCircle, CheckCircle2,
  Clock, RotateCcw, Terminal, Zap, Activity, Power, ChevronDown,
  ChevronUp, Package, Bot, Save, FolderOpen, Trash2, Server
} from 'lucide-react';
import { DesktopBridgeService, HardwareStatus, SystemInfo } from '../modules/shared/DesktopBridgeService';
import { dbHealthCheck }        from '../modules/shared/LocalDatabaseEngine';
import { LocalBackupManager, BackupEntry } from '../modules/shared/LocalBackupManager';
import { LocalAIOfflineProxy, AIEndpointStatus } from '../modules/shared/LocalAIOfflineProxy';
import { ThermalPrinterService } from '../modules/shared/ThermalPrinterService';

// ─── HELPERS ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-IN');

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
      ${ok ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
           : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, accent = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string;
}) {
  const colors: Record<string, string> = {
    blue:   'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    green:  'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    amber:  'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    slate:  'from-slate-500/20 to-slate-600/5 border-slate-500/30 text-slate-400',
  };

  return (
    <div className={`relative bg-gradient-to-br ${colors[accent]} border rounded-xl p-4 overflow-hidden`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-4 h-4 ${colors[accent].split(' ').pop()}`} />
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-100 leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: {
  icon: React.ElementType; title: string; badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">{title}</h2>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">{badge}</span>
      )}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-800/60 my-6" />;
}

// ─── SAMPLE PRINT DATA ────────────────────────────────────────────────────────────

const SAMPLE_SHIFT_DATA = {
  stationName:    'DEMO PETROL PUMP',
  shiftLabel:     'Morning Shift',
  shiftDate:      new Date().toLocaleDateString('en-IN'),
  operatorName:   'Test Operator',
  openingCash:    5000,
  expenses:       350,
  upiCollected:   12400,
  cardCollected:  3200,
  creditSales:    1500,
  creditRecovery: 800,
  totalCashCounted: 18650,
  cashShortage:   0,
  isLocked:       false,
  supervisorName: 'Manager',
  nozzles: [
    { label: 'N1', fuel: 'HSD', opening: 1200.50, closing: 1350.80, testing: 2.5, rate: 92.30 },
    { label: 'N2', fuel: 'MS',  opening: 850.20,  closing: 975.60,  testing: 1.0, rate: 104.50 },
  ]
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────────

export default function DesktopControlCenter() {
  const [hardware, setHardware]     = useState<HardwareStatus | null>(null);
  const [sysInfo, setSysInfo]       = useState<SystemInfo | null>(null);
  const [dbHealth, setDbHealth]     = useState<any>(null);
  const [backups, setBackups]       = useState<BackupEntry[]>([]);
  const [aiStatus, setAiStatus]     = useState<AIEndpointStatus[]>([]);
  const [crashLog, setCrashLog]     = useState('');
  const [startupLog, setStartupLog] = useState('');
  const [activeTab, setActiveTab]   = useState<'crash' | 'startup'>('startup');
  const [busy, setBusy]             = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedLog, setExpandedLog] = useState(false);
  const isElectron = DesktopBridgeService.isElectron();

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [hw, si, db] = await Promise.all([
        DesktopBridgeService.getHardwareStatus(),
        DesktopBridgeService.getSystemInfo(),
        dbHealthCheck()
      ]);
      setHardware(hw);
      setSysInfo(si);
      setDbHealth(db);
      setBackups(LocalBackupManager.getRegistry().slice(0, 20));
    } catch (err) {
      console.warn('[DesktopControlCenter] Load error:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!isElectron) return;
    const [c, s] = await Promise.all([
      DesktopBridgeService.getCrashLog(),
      DesktopBridgeService.getStartupLog()
    ]);
    setCrashLog(c);
    setStartupLog(s);
  }, [isElectron]);

  const probeAI = useCallback(async () => {
    const results = await LocalAIOfflineProxy.probeAllEndpoints();
    setAiStatus(results);
  }, []);

  useEffect(() => {
    loadData();
    probeAI();
    loadLogs();

    // Refresh hardware every 30s
    const tick = setInterval(loadData, 30_000);
    return () => clearInterval(tick);
  }, [loadData, probeAI, loadLogs]);

  // ── Backup actions ─────────────────────────────────────────────────────────────

  const handleManualBackup = async () => {
    setBusy('backup');
    const entry = await LocalBackupManager.runManualBackup();
    setBusy(null);
    if (entry) { showToast('Backup exported successfully'); setBackups(LocalBackupManager.getRegistry().slice(0, 20)); }
    else showToast('Backup cancelled or failed', false);
  };

  const handleAutoBackup = async () => {
    setBusy('autobackup');
    const entry = await LocalBackupManager.runAutoBackup();
    setBusy(null);
    if (entry) { showToast('Auto-backup completed'); setBackups(LocalBackupManager.getRegistry().slice(0, 20)); }
    else showToast('Auto-backup failed', false);
  };

  const handleRestore = async () => {
    setBusy('restore');
    const result = await LocalBackupManager.restoreFromFile();
    setBusy(null);
    if (result.success) showToast(`Restored ${fmt(result.recordsLoaded)} records`);
    else showToast(result.error || 'Restore failed', false);
  };

  // ── Print test ────────────────────────────────────────────────────────────────

  const handlePrintTest = (mode: 'thermal58' | 'thermal80' | 'a4') => {
    if (mode === 'a4') {
      ThermalPrinterService.printA4(SAMPLE_SHIFT_DATA, { paperWidth: 'A4', silent: false });
    } else {
      const width = mode === 'thermal58' ? 58 : 80;
      ThermalPrinterService.printThermal(SAMPLE_SHIFT_DATA, { paperWidth: width, silent: false });
    }
    showToast(`Print job sent (${mode === 'a4' ? 'A4' : mode === 'thermal58' ? '58mm' : '80mm'})`);
  };

  const handleExportPDF = async () => {
    setBusy('pdf');
    const ok = await ThermalPrinterService.exportA4PDF(SAMPLE_SHIFT_DATA);
    setBusy(null);
    showToast(ok ? 'PDF exported' : 'PDF export cancelled', ok);
  };

  // ── App lifecycle ──────────────────────────────────────────────────────────────

  const handleRelaunch = async () => {
    if (!window.confirm('Restart PumpAI desktop now?')) return;
    await DesktopBridgeService.relaunch();
  };

  const handleCheckUpdates = () => {
    DesktopBridgeService.checkForUpdates();
    showToast('Checking for updates…');
  };

  const handleClearLogs = async () => {
    await DesktopBridgeService.clearLogs();
    setCrashLog('');
    setStartupLog('');
    showToast('Logs cleared');
  };

  const handleOpenDataDir = async () => {
    if (sysInfo?.dataDir) await DesktopBridgeService.openPath(sysInfo.dataDir);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const uptime = hardware?.uptime != null
    ? `${Math.floor(hardware.uptime / 3600)}h ${Math.floor((hardware.uptime % 3600) / 60)}m`
    : '—';

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-200 p-6 pb-20 max-w-5xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium
          transition-all duration-300 animate-fade-in
          ${toast.ok
            ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200'
            : 'bg-red-900/90 border-red-500/40 text-red-200'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Desktop Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Offline resilience, backup safety, and hardware management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge ok={isElectron} label={isElectron ? 'Electron Desktop' : 'Browser Mode'} />
          {hardware?.backendRunning != null && (
            <StatusBadge ok={hardware.backendRunning} label={hardware.backendRunning ? 'Backend Running' : 'Backend Offline'} />
          )}
        </div>
      </div>

      {/* ── SECTION 1: System Vitals ──────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Monitor} title="System Vitals" badge={sysInfo?.version} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard icon={Cpu}       label="Platform" value={hardware?.platform || '—'} sub={hardware?.arch} accent="blue" />
          <MetricCard icon={Activity}  label="CPU" value={hardware ? `${hardware.cpuCores}c` : '—'} sub={hardware?.cpuModel?.slice(0, 28)} accent="purple" />
          <MetricCard icon={Database}  label="Memory" value={hardware ? `${hardware.usedMemPct}%` : '—'} sub={`${hardware?.freeMemGB}GB free`} accent={hardware && hardware.usedMemPct > 80 ? 'amber' : 'green'} />
          <MetricCard icon={HardDrive} label="Disk Free" value={hardware?.diskFreeGB != null ? `${hardware.diskFreeGB}MB` : '—'} sub="userData partition" accent="slate" />
          <MetricCard icon={Clock}     label="Uptime"   value={uptime} sub="since last restart" accent="blue" />
          <MetricCard icon={Server}    label="Node.js"  value={sysInfo?.nodeVersion || '—'} sub={`Electron ${sysInfo?.electronVersion || '—'}`} accent="slate" />
          <MetricCard icon={Package}   label="Hostname"  value={sysInfo?.hostname?.slice(0, 14) || '—'} sub="local machine" accent="purple" />
          <MetricCard icon={Database}  label="Data Directory" value="userData" sub="click to open" accent="blue" />
        </div>

        {isElectron && sysInfo?.dataDir && (
          <button
            onClick={handleOpenDataDir}
            className="mt-3 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10">
            <FolderOpen className="w-3.5 h-3.5" />
            Open data directory: <span className="font-mono truncate max-w-xs">{sysInfo.dataDir}</span>
          </button>
        )}
      </div>

      <Divider />

      {/* ── SECTION 2: Local Database Health ─────────────────────────────────── */}
      <div>
        <SectionHeader icon={Database} title="Local Database" badge="IndexedDB" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard icon={Activity}  label="Shifts"        value={dbHealth?.shiftCount ?? '—'}  sub="stored locally"    accent="green" />
          <MetricCard icon={Database}  label="Ledger Entries" value={dbHealth?.ledgerCount ?? '—'} sub="financial records" accent="blue" />
          <MetricCard icon={RefreshCw} label="Pending Queue"  value={dbHealth?.queueCount ?? '—'}  sub="awaiting sync"     accent={dbHealth?.queueCount > 0 ? 'amber' : 'green'} />
          <MetricCard icon={CheckCircle2} label="DB Health"  value={dbHealth?.healthy ? 'Healthy' : 'Error'} sub={dbHealth ? `${dbHealth.storeNames.length} stores` : ''} accent={dbHealth?.healthy ? 'green' : 'amber'} />
        </div>

        {dbHealth?.storeNames?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dbHealth.storeNames.map((s: string) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">{s}</span>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* ── SECTION 3: Backup Manager ─────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={HardDrive} title="Backup Manager" />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Export</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAutoBackup}
                disabled={busy === 'autobackup'}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition disabled:opacity-50">
                {busy === 'autobackup' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Run Auto-Backup Now
              </button>
              <button
                onClick={handleManualBackup}
                disabled={busy === 'backup'}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50">
                {busy === 'backup' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                {isElectron ? 'Export to File (Dialog)' : 'Download Backup File'}
              </button>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Restore</p>
            <button
              onClick={handleRestore}
              disabled={busy === 'restore'}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 w-full">
              {busy === 'restore' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isElectron ? 'Restore from File (Dialog)' : 'Restore from File'}
            </button>
            <p className="text-[11px] text-slate-500">
              Restores shifts, ledger, and snapshots from a .pabk backup file.
              Pending queue will NOT be restored to avoid double-posting.
            </p>
          </div>
        </div>

        {/* Backup registry */}
        {backups.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400 font-medium uppercase tracking-wider">
              Recent Backups ({backups.length})
            </div>
            <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
              {backups.map(b => (
                <div key={b.backupId} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-2">
                    <HardDrive className={`w-3.5 h-3.5 ${b.type === 'auto' ? 'text-blue-400' : 'text-emerald-400'}`} />
                    <span className="text-slate-300 font-mono">{b.backupId}</span>
                    <span className="text-slate-500">{b.type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>{Math.round(b.sizeBytes / 1024)}KB</span>
                    <span>{new Date(b.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <StatusBadge ok={b.source === 'electron'} label={b.source} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {backups.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-sm border border-slate-800 rounded-xl">
            No backup records yet. Run an auto-backup or manual export to start.
          </div>
        )}
      </div>

      <Divider />

      {/* ── SECTION 4: Printer Control ────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Printer} title="Printer Control" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Test Print</p>
            <div className="flex flex-col gap-2">
              {([
                { label: '80mm Thermal (Standard)',  mode: 'thermal80', color: 'blue' },
                { label: '58mm Thermal (Compact)',   mode: 'thermal58', color: 'purple' },
                { label: 'A4 Accountant Report',     mode: 'a4',        color: 'slate' },
              ] as const).map(({ label, mode, color }) => (
                <button
                  key={mode}
                  onClick={() => handlePrintTest(mode)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition text-left
                    bg-${color}-500/10 border-${color}-500/30 text-${color}-300 hover:bg-${color}-500/20`}>
                  <Printer className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">PDF Export</p>
            <button
              onClick={handleExportPDF}
              disabled={busy === 'pdf'}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50 w-full">
              {busy === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              Export Shift Report as PDF
            </button>
            <p className="text-[11px] text-slate-500">
              {isElectron
                ? 'Opens a save-file dialog to export an A4 PDF closing sheet.'
                : 'Triggers browser print dialog. Use "Save as PDF" option.'}
            </p>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── SECTION 5: AI Endpoint Status ─────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Bot} title="AI Endpoint Status" />
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {aiStatus.length === 0 && (
            <div className="col-span-3 text-center py-6 text-slate-500 text-sm border border-slate-800 rounded-xl">
              Probing AI endpoints…
            </div>
          )}
          {aiStatus.map(ep => (
            <div key={ep.type} className={`border rounded-xl p-4 space-y-2
              ${ep.available ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/40'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200 capitalize">{ep.type.replace('_', ' ')}</span>
                <StatusBadge ok={ep.available} label={ep.available ? 'Online' : 'Offline'} />
              </div>
              <p className="text-[10px] font-mono text-slate-500 truncate">{ep.url}</p>
              {ep.modelName && <p className="text-[11px] text-slate-400">Model: {ep.modelName}</p>}
              {ep.latencyMs && <p className="text-[11px] text-emerald-400">{ep.latencyMs}ms latency</p>}
            </div>
          ))}
        </div>
        <button
          onClick={probeAI}
          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition">
          <RefreshCw className="w-3.5 h-3.5" />
          Re-probe all endpoints
        </button>
      </div>

      <Divider />

      {/* ── SECTION 6: Logs Viewer ────────────────────────────────────────────── */}
      {isElectron && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={Terminal} title="System Logs" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedLog(v => !v)}
                className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-200 transition">
                {expandedLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expandedLog ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={loadLogs}
                className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 transition">
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              <button
                onClick={handleClearLogs}
                className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300 transition">
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {(['startup', 'crash'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize
                  ${activeTab === tab
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                {tab} log
              </button>
            ))}
          </div>
          <pre
            className={`bg-[#040608] border border-slate-800 rounded-xl p-4 text-[10px] font-mono text-slate-400 overflow-auto leading-relaxed whitespace-pre-wrap transition-all
              ${expandedLog ? 'max-h-[600px]' : 'max-h-48'}`}>
            {(activeTab === 'startup' ? startupLog : crashLog) || '(empty)'}
          </pre>
        </div>
      )}

      {isElectron && <Divider />}

      {/* ── SECTION 7: App Lifecycle ──────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Power} title="App Lifecycle" />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckUpdates}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition">
            <Zap className="w-4 h-4" />
            Check for Updates
          </button>
          {isElectron && (
            <>
              <button
                onClick={handleRelaunch}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition">
                <RotateCcw className="w-4 h-4" />
                Relaunch App
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Close PumpAI?')) await DesktopBridgeService.quit();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">
                <Power className="w-4 h-4" />
                Quit Application
              </button>
            </>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 transition">
            <RefreshCw className="w-4 h-4" />
            Refresh Panel
          </button>
        </div>

        {!isElectron && (
          <div className="mt-4 flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200/80 space-y-1">
              <p className="font-medium">Running in browser mode</p>
              <p>Some features (file system backup, native printing, app lifecycle, crash logs) require the Electron desktop app.</p>
              <p>Run <code className="font-mono bg-amber-900/40 px-1 py-0.5 rounded">npm run electron</code> to launch the desktop version.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
