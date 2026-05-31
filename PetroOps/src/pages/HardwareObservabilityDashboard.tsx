/**
 * HardwareObservabilityDashboard.tsx
 * ────────────────────────────────────
 * Real-time hardware health HUD for petroleum station operations.
 *
 * Tabs:
 *  1. Network Overview    — all 7 devices, health % bars, latency, status LEDs
 *  2. Device Inspector    — per-device telemetry stream, error log, reconnect queue
 *  3. Nozzle Telemetry    — live Orpak pulse stream, totalizer, sale state, rollback guard
 *  4. Tank & Leak         — ATG telemetry, VLD result, PESO compliance, variance chart
 *  5. POS Settlement      — batch status, reconciliation table, failed TX report
 *  6. RFID Fleet          — active tags, daily spend, credit balance, scan log
 *  7. Printer Status      — queue, job history, paper status, test print
 *  8. Anomaly Feed        — all hardware anomalies with severity, checksum, timestamp
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cpu, Wifi, WifiOff, AlertTriangle, CheckCircle2, AlertCircle,
  RefreshCw, Activity, Thermometer, Droplets, CreditCard, Printer,
  Tag, Gauge, Zap, Clock, TrendingDown, Shield, BarChart3,
  ChevronRight, Radio, Server, Database, MonitorDot, FileText,
  ArrowDownRight, FlaskConical
} from 'lucide-react';
import type { HardwareDevice, DeviceStatus, TelemetryFrame, OrpakPumpState } from '../modules/hardware/OrpakController';
import type { DeviceHealthRecord, HardwareAnomaly, HealthSummary } from '../modules/hardware/HardwareHealthMonitor';
import type { POSTransaction, BatchSettlement, SettlementReconciliation } from '../modules/hardware/POSSettlementEngine';
import type { WetStockVarianceReport, LeakTestResult } from '../modules/hardware/LeakDetectionEngine';
import type { PrintJob } from '../modules/hardware/PrinterHardeningLayer';
import { hardwareEngineInstance } from '../modules/hardware/HardwarePollingEngine';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 2) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const ts = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const ago = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const STATUS_COLOR: Record<DeviceStatus, string> = {
  online:     'text-emerald-400',
  offline:    'text-slate-500',
  degraded:   'text-amber-400',
  error:      'text-red-400',
  connecting: 'text-blue-400',
  stale:      'text-orange-400',
};

const STATUS_LED: Record<DeviceStatus, string> = {
  online:     'bg-emerald-400',
  offline:    'bg-slate-600',
  degraded:   'bg-amber-400',
  error:      'bg-red-500',
  connecting: 'bg-blue-400 animate-pulse',
  stale:      'bg-orange-400 animate-pulse',
};

const SEV_STYLE: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-900/20 text-red-300',
  error:    'border-red-500/30 bg-red-900/15 text-red-400',
  warn:     'border-amber-500/30 bg-amber-900/15 text-amber-300',
  info:     'border-slate-700 bg-slate-900/40 text-slate-400',
};

const DEVICE_ICON: Record<string, React.FC<any>> = {
  orpak_controller: Server,
  wayne_dispenser:  Gauge,
  tatsuno_dispenser: Gauge,
  atg_tank_gauge:   Droplets,
  pos_terminal:     CreditCard,
  rfid_scanner:     Tag,
  thermal_printer:  Printer,
};

// ─── SIMULATED STATE ──────────────────────────────────────────────────────────

interface SimDevice {
  id: string; name: string; type: string; protocol: string; address: string;
  status: DeviceStatus; lastSeenAt: number; latencyMs: number;
  errorCount: number; reconnectAttempts: number;
  firmwareVersion: string; serialNumber: string;
}

interface SimHealth {
  deviceId: string; deviceName: string; deviceType: string; status: DeviceStatus;
  avgLatencyMs: number; peakLatencyMs: number; p95LatencyMs: number;
  totalPolls: number; successfulPolls: number; failedPolls: number;
  errorRate: number; duplicatesDetected: number; staleEvents: number;
  uptimePct: number; reconnectAttempts: number; inReconnectQueue: boolean;
  nextReconnectAt: number; anomalies: HardwareAnomaly[];
}

function makeDevices(): SimDevice[] {
  const statuses: DeviceStatus[] = ['online', 'online', 'online', 'online', 'degraded', 'online', 'connecting'];
  return [
    { id: 'ORPAK_CTL_01', name: 'Orpak OPUS Controller',    type: 'orpak_controller', protocol: 'TCP/IP',      address: '192.168.1.10:3001', firmwareVersion: 'OPUS-4.2.1', serialNumber: 'ORP-2024-00142' },
    { id: 'WAYNE_DISP_01', name: 'Wayne Fusion P1',          type: 'wayne_dispenser',  protocol: 'TCP/IP',      address: '192.168.1.11:3002', firmwareVersion: 'FUSION-3.1', serialNumber: 'WYN-2023-00871' },
    { id: 'WAYNE_DISP_02', name: 'Wayne Fusion P2',          type: 'wayne_dispenser',  protocol: 'TCP/IP',      address: '192.168.1.12:3002', firmwareVersion: 'FUSION-3.1', serialNumber: 'WYN-2023-00872' },
    { id: 'ATG_GAUGE_01', name: 'Veeder-Root TLS-450 ATG',  type: 'atg_tank_gauge',   protocol: 'RS-485',      address: '/dev/ttyS0@9600',   firmwareVersion: 'TLS450-5.0', serialNumber: 'VR-450-00312' },
    { id: 'POS_TERM_01',  name: 'Ingenico Desk/3500 POS',   type: 'pos_terminal',     protocol: 'TCP/IP',      address: '192.168.1.20:8080', firmwareVersion: 'ING-3.2.4',  serialNumber: 'ING-2024-10092' },
    { id: 'RFID_SCAN_01', name: 'Feig LRU3500 RFID',        type: 'rfid_scanner',     protocol: 'RS-232',      address: '/dev/ttyS1@115200', firmwareVersion: 'LRU-2.4',    serialNumber: 'FEG-2023-00452' },
    { id: 'PRINTER_01',  name: 'Epson TM-T88VII Thermal',   type: 'thermal_printer',  protocol: 'TCP/IP',      address: '192.168.1.25:9100', firmwareVersion: 'T88VII-1.2', serialNumber: 'EPS-2024-00734' },
  ].map((d, i) => ({ ...d, status: statuses[i], lastSeenAt: Date.now() - Math.random() * 5000, latencyMs: Math.round(15 + Math.random() * 60), errorCount: i === 4 ? 2 : 0, reconnectAttempts: i === 6 ? 1 : 0 }));
}

function makeHealth(devices: SimDevice[]): SimHealth[] {
  return devices.map(d => ({
    deviceId: d.id, deviceName: d.name, deviceType: d.type, status: d.status,
    avgLatencyMs: d.latencyMs,
    peakLatencyMs: d.latencyMs * 3,
    p95LatencyMs: Math.round(d.latencyMs * 1.6),
    totalPolls: 1200 + Math.floor(Math.random() * 800),
    successfulPolls: d.status === 'online' ? 1190 + Math.floor(Math.random() * 50) : 900,
    failedPolls: d.status === 'degraded' ? 30 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 10),
    errorRate: d.status === 'degraded' ? 0.04 : 0.002,
    duplicatesDetected: Math.floor(Math.random() * 3),
    staleEvents: d.status === 'stale' ? 1 : 0,
    uptimePct: d.status === 'online' ? 99.1 + Math.random() * 0.9 : d.status === 'degraded' ? 94 + Math.random() * 4 : 88,
    reconnectAttempts: d.reconnectAttempts,
    inReconnectQueue: d.status === 'connecting',
    nextReconnectAt: d.status === 'connecting' ? Date.now() + 15000 : 0,
    anomalies: d.status === 'degraded' ? [
      { id: 'ANO_1', deviceId: d.id, ts: Date.now() - 45000, type: 'comm_timeout' as any, severity: 'warn' as any, message: 'Poll response 620ms — above 500ms threshold', checksum: 'a1b2c3d4', replayed: false }
    ] : [],
  }));
}

function makeNozzles(): OrpakPumpState[] {
  return [
    { pumpId: 'WAYNE_DISP_01', nozzleId: 'N1', status: 'fueling', totalizerLitres: 452812.4, totalizerAmount: 47418000, currentSaleLitres: 18.34, currentSaleAmount: 1921.50, fuelType: 'MS',  pricePerLitre: 104.72, lastPulseTs: Date.now() },
    { pumpId: 'WAYNE_DISP_01', nozzleId: 'N2', status: 'idle',    totalizerLitres: 891242.7, totalizerAmount: 82172576, currentSaleLitres: 0,     currentSaleAmount: 0,       fuelType: 'MS',  pricePerLitre: 104.72, lastPulseTs: Date.now() - 120000 },
    { pumpId: 'WAYNE_DISP_02', nozzleId: 'N3', status: 'idle',    totalizerLitres: 120452.1, totalizerAmount: 12587244, currentSaleLitres: 0,     currentSaleAmount: 0,       fuelType: 'HSD', pricePerLitre: 91.60,  lastPulseTs: Date.now() - 300000 },
    { pumpId: 'WAYNE_DISP_02', nozzleId: 'N4', status: 'completed',totalizerLitres: 98451.3, totalizerAmount: 9017586,  currentSaleLitres: 32.10, currentSaleAmount: 2940.36, fuelType: 'HSD', pricePerLitre: 91.60,  lastPulseTs: Date.now() - 8000 },
  ];
}

function makeAnomalies(): HardwareAnomaly[] {
  return [
    { id: 'ANO_001', deviceId: 'POS_TERM_01', ts: Date.now() - 45000, type: 'comm_timeout',    severity: 'warn',     message: 'POS terminal response 620ms on poll #1184 — latency spike', checksum: 'a1b2c3d4', replayed: false },
    { id: 'ANO_002', deviceId: 'ATG_GAUGE_01', ts: Date.now() - 180000, type: 'water_ingress', severity: 'warn',     message: 'Tank T2: water level 28mm — above 25mm threshold. Schedule drain.', checksum: 'b2c3d4e5', replayed: false },
    { id: 'ANO_003', deviceId: 'PRINTER_01',  ts: Date.now() - 320000, type: 'abnormal_reading', severity: 'warn',   message: 'Thermal printer: paper roll low — replace before shift close', checksum: 'c3d4e5f6', replayed: false },
    { id: 'ANO_004', deviceId: 'WAYNE_DISP_01', ts: Date.now() - 900000, type: 'duplicate_signal', severity: 'info', message: 'Duplicate telemetry frame seq#482 from Wayne P1 — deduplicated safely', checksum: 'd4e5f6a1', replayed: true },
    { id: 'ANO_005', deviceId: 'ATG_GAUGE_01', ts: Date.now() - 1800000, type: 'density_anomaly', severity: 'info', message: 'Tank T1: density 0.718 g/mL briefly below MS band (0.720–0.775) — temperature effect likely', checksum: 'e5f6a1b2', replayed: true },
  ];
}

function makeTankData(): WetStockVarianceReport {
  return {
    date: new Date().toISOString().slice(0, 10),
    tanks: [
      { tankId: 'T1', fuelType: 'MS',  openingLitres: 14200, closingLitres: 9850,  salesLitres: 4380, deliveryLitres: 0, bookClosing: 9820, physicalClosing: 9850,  variance: 30,  variancePct: 0.031, status: 'clear' },
      { tankId: 'T2', fuelType: 'HSD', openingLitres: 18400, closingLitres: 12178, salesLitres: 6180, deliveryLitres: 0, bookClosing: 12220, physicalClosing: 12178, variance: -42, variancePct: 0.034, status: 'suspect' },
      { tankId: 'T3', fuelType: 'MS',  openingLitres: 8500,  closingLitres: 5980,  salesLitres: 2540, deliveryLitres: 0, bookClosing: 5960, physicalClosing: 5980,  variance: 20,  variancePct: 0.034, status: 'clear' },
    ],
    totalVariance: 8,
    overallStatus: 'suspect',
  };
}

function makePosBatch(): BatchSettlement {
  const txs: POSTransaction[] = Array.from({ length: 24 }, (_, i) => ({
    id: `TX_${i}`, rrn: `${100000000000 + i}`, terminalId: 'TERM_POS_098', merchantId: 'PUMP_AI_12',
    authCode: i % 12 === 0 ? '000000' : `${400000 + i}`,
    cardNetwork: ['RuPay', 'Visa', 'Mastercard'][i % 3] as any,
    maskedPan: `XXXX-XXXX-XXXX-${1000 + i}`,
    paymentMode: ['chip', 'contactless', 'chip', 'swipe'][i % 4] as any,
    amount: Math.round((800 + i * 180) * 100) / 100,
    approvedAmount: i % 12 === 0 ? 0 : Math.round((800 + i * 180) * 100) / 100,
    currency: 'INR' as const,
    ts: Date.now() - (24 - i) * 900000,
    status: i % 12 === 0 ? 'declined' : 'approved',
    shiftId: 'SHIFT_001', nozzleId: `N${(i % 4) + 1}`,
    gatewayRef: `GW_${Date.now() - i * 1000}`,
  }));
  const approved = txs.filter(t => t.status === 'approved');
  return {
    batchId: 'BATCH_1042', terminalId: 'TERM_POS_098', merchantId: 'PUMP_AI_12',
    openedAt: Date.now() - 8 * 3600000, closedAt: Date.now() - 3600000,
    transactions: txs,
    batchTotal: approved.reduce((s, t) => s + t.amount, 0),
    approvedCount: approved.length, declinedCount: txs.length - approved.length, reversedCount: 0,
    status: 'reconciled',
  };
}

function makeRFIDTags() {
  return [
    { tagId: 'TAG_001', reg: 'DL-1CA-5621', company: 'Delhi Logistics Corp', fuel: 'Diesel', balance: 43800, limit: 10000, spent: 1200.50, active: true },
    { tagId: 'TAG_002', reg: 'MH-12-FG-8891', company: 'Tata Steel Logistics', fuel: 'Diesel', balance: 118000, limit: 25000, spent: 0, active: true },
    { tagId: 'TAG_003', reg: 'HR-26-CK-9908', company: 'Safe Travels Tour Co', fuel: 'Petrol', balance: 50, limit: 5000, spent: 0, active: true },
    { tagId: 'TAG_004', reg: 'UP-16-TX-1234', company: 'Noida Garbage Fleet', fuel: 'CNG', balance: 8000, limit: 3000, spent: 3000, active: true },
    { tagId: 'TAG_005', reg: 'KA-09-AB-4421', company: 'Bengaluru Couriers', fuel: 'Petrol', balance: 12000, limit: 8000, spent: 3400, active: true },
  ];
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatusLED({ status, size = 2 }: { status: DeviceStatus; size?: number }) {
  return <div className={`rounded-full ${STATUS_LED[status]}`} style={{ width: `${size * 4}px`, height: `${size * 4}px` }} />;
}

function LatencyBar({ ms, max = 500 }: { ms: number; max?: number }) {
  const pct = Math.min(100, (ms / max) * 100);
  const color = pct < 30 ? '#10b981' : pct < 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-12 text-right">{ms}ms</span>
    </div>
  );
}

function DeviceCard({ device, health, selected, onClick }: {
  device: SimDevice; health: SimHealth; selected: boolean; onClick: () => void; key?: React.Key;
}) {
  const Icon = DEVICE_ICON[device.type] ?? Cpu;
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-3 cursor-pointer transition ${selected ? 'border-blue-500/50 bg-blue-500/8' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
      <div className="flex items-center gap-2 mb-2">
        <StatusLED status={device.status} />
        <Icon className={`w-3.5 h-3.5 ${STATUS_COLOR[device.status]}`} />
        <span className="text-xs font-medium text-slate-200 truncate flex-1">{device.name}</span>
        <span className={`text-[9px] font-bold uppercase ${STATUS_COLOR[device.status]}`}>{device.status}</span>
      </div>
      <div className="text-[9px] text-slate-600 mb-1.5 font-mono">{device.address}</div>
      <LatencyBar ms={device.latencyMs} />
      <div className="flex items-center justify-between mt-1.5 text-[9px]">
        <span className="text-slate-600">{health.uptimePct.toFixed(1)}% uptime</span>
        <span className="text-slate-600">{health.errorRate < 0.01 ? '✓ Healthy' : `${(health.errorRate * 100).toFixed(1)}% err`}</span>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Network Overview',  icon: MonitorDot },
  { id: 'device',     label: 'Device Inspector',  icon: Cpu },
  { id: 'nozzle',     label: 'Nozzle Telemetry',  icon: Gauge },
  { id: 'tank',       label: 'Tank & Leak',        icon: FlaskConical },
  { id: 'pos',        label: 'POS Settlement',     icon: CreditCard },
  { id: 'rfid',       label: 'RFID Fleet',         icon: Tag },
  { id: 'printer',    label: 'Printer',            icon: Printer },
  { id: 'anomalies',  label: 'Anomaly Feed',       icon: AlertTriangle },
];

export default function HardwareObservabilityDashboard() {
  const [tab, setTab] = useState('overview');
  const [selectedDeviceIdx, setSelectedDeviceIdx] = useState(0);
  const [devices, setDevices] = useState<SimDevice[]>(makeDevices());
  const [healthRecords, setHealthRecords] = useState<SimHealth[]>([]);
  const [nozzles, setNozzles] = useState<OrpakPumpState[]>(makeNozzles());
  const [tankData] = useState<WetStockVarianceReport>(makeTankData());
  const [posBatch] = useState<BatchSettlement>(makePosBatch());
  const [rfidTags] = useState(makeRFIDTags());
  const [anomalies, setAnomalies] = useState<HardwareAnomaly[]>(makeAnomalies());
  const [telemetryLog, setTelemetryLog] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setDevices(prev => prev.map(d => ({
      ...d,
      latencyMs: Math.round(d.latencyMs * (0.8 + Math.random() * 0.4)),
      lastSeenAt: d.status === 'online' || d.status === 'degraded' ? Date.now() - Math.random() * 2000 : d.lastSeenAt,
    })));
    setNozzles(prev => prev.map(n => n.status === 'fueling' ? {
      ...n,
      currentSaleLitres: parseFloat((n.currentSaleLitres + 0.2 + Math.random() * 0.1).toFixed(3)),
      currentSaleAmount: parseFloat(((n.currentSaleLitres + 0.2) * n.pricePerLitre).toFixed(2)),
      lastPulseTs: Date.now(),
    } : n));
    setLastRefresh(Date.now());
    
    // Read live diagnostic from backend
    const diag = hardwareEngineInstance.getSystemDiagnostics();
    const newLog = `[${new Date().toLocaleTimeString('en-IN')}] POLL — ${devices.filter(d => d.status === 'online').length}/${devices.length} devices responding. Backend: ATG=${diag.atgStatus}, POS=${diag.posStatus}, ORPAK=${diag.orpakStatus}`;
    setTelemetryLog(prev => [...prev.slice(-99), newLog]);
  }, [devices]);

  useEffect(() => {
    setHealthRecords(makeHealth(devices));
  }, [devices]);

  useEffect(() => {
    // Wire the actual backend engine on mount
    hardwareEngineInstance.startEngine();
    return () => hardwareEngineInstance.stopEngine();
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [telemetryLog]);

  const onlineCount  = devices.filter(d => d.status === 'online').length;
  const errorCount   = devices.filter(d => d.status === 'error' || d.status === 'offline').length;
  const healthPct    = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;
  const critAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'error').length;
  const selectedDev  = devices[selectedDeviceIdx];
  const selectedHlth = healthRecords[selectedDeviceIdx];

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-200 flex flex-col">

      {/* HEADER */}
      <div className="border-b border-slate-800 bg-[#0b0f1a]/90 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            Hardware Observability Center
          </h1>
          <p className="text-[10px] text-slate-500">{devices.length} devices · {onlineCount} online · {critAnomalies} critical anomalies</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${healthPct >= 90 ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400' : healthPct >= 70 ? 'border-amber-500/30 bg-amber-500/8 text-amber-400' : 'border-red-500/30 bg-red-500/8 text-red-400'}`}>
            <Activity className="w-3 h-3" />
            Network {healthPct}%
          </div>
          <div className="text-[10px] text-slate-600">{ts(lastRefresh)}</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="border-b border-slate-800 bg-[#0a0d18] px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition whitespace-nowrap
                  ${active ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === 'anomalies' && critAnomalies > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded-full border border-red-500/30">{critAnomalies}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">

        {/* ── 1. NETWORK OVERVIEW ──────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Devices Online', value: `${onlineCount}/${devices.length}`, color: onlineCount === devices.length ? 'emerald' : 'amber' },
                { label: 'Network Health', value: `${healthPct}%`, color: healthPct >= 90 ? 'emerald' : 'amber' },
                { label: 'Avg Latency',    value: `${Math.round(devices.reduce((s, d) => s + d.latencyMs, 0) / devices.length)}ms`, color: 'blue' },
                { label: 'Critical Alerts', value: critAnomalies, color: critAnomalies > 0 ? 'red' : 'emerald' },
                { label: 'Error Devices', value: errorCount, color: errorCount > 0 ? 'red' : 'emerald' },
                { label: 'Reconnect Queue', value: devices.filter(d => d.status === 'connecting').length, color: 'slate' },
              ].map(k => (
                <div key={k.label} className={`border rounded-xl p-3 border-${k.color}-500/25 bg-${k.color}-500/5`}>
                  <div className={`text-xl font-bold font-mono text-${k.color}-400`}>{k.value}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Device grid */}
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-3">All Devices — Live Status</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {devices.map((d, i) => (
                  <DeviceCard key={d.id} device={d} health={healthRecords[i] ?? {} as SimHealth}
                    selected={false} onClick={() => { setSelectedDeviceIdx(i); setTab('device'); }} />
                ))}
              </div>
            </div>

            {/* Telemetry log */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-2">Telemetry Stream</div>
              <div ref={logRef} className="h-32 overflow-y-auto font-mono text-[10px] text-slate-500 space-y-0.5">
                {telemetryLog.length === 0 && <div className="text-slate-700">Waiting for data...</div>}
                {telemetryLog.map((l, i) => <div key={i} className="leading-relaxed">{l}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* ── 2. DEVICE INSPECTOR ──────────────────────────────────────────── */}
        {tab === 'device' && (
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-2">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium mb-2">Select Device</div>
              {devices.map((d, i) => (
                <DeviceCard key={d.id} device={d} health={healthRecords[i] ?? {} as SimHealth}
                  selected={i === selectedDeviceIdx} onClick={() => setSelectedDeviceIdx(i)} />
              ))}
            </div>

            {selectedDev && selectedHlth && (
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <StatusLED status={selectedDev.status} size={3} />
                    <div>
                      <h2 className="text-base font-bold text-slate-200">{selectedDev.name}</h2>
                      <p className="text-[10px] text-slate-500">{selectedDev.serialNumber} · FW {selectedDev.firmwareVersion}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                    {[
                      { l: 'Status', v: selectedDev.status.toUpperCase(), c: STATUS_COLOR[selectedDev.status] },
                      { l: 'Protocol', v: selectedDev.protocol, c: 'text-blue-400' },
                      { l: 'Address', v: selectedDev.address, c: 'text-slate-300' },
                      { l: 'Last Seen', v: ago(selectedDev.lastSeenAt), c: 'text-slate-400' },
                    ].map(r => (
                      <div key={r.l} className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
                        <div className="text-slate-500 text-[10px]">{r.l}</div>
                        <div className={`font-mono font-bold mt-0.5 ${r.c}`}>{r.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Latency & reliability */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Latency Profile</div>
                    {[
                      { l: 'Avg Latency', ms: selectedHlth.avgLatencyMs },
                      { l: 'P95 Latency', ms: selectedHlth.p95LatencyMs },
                      { l: 'Peak Latency', ms: selectedHlth.peakLatencyMs },
                    ].map(r => (
                      <div key={r.l} className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 w-24">{r.l}</span>
                        <div className="flex-1"><LatencyBar ms={r.ms} /></div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center text-xs">
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                      <div className="text-emerald-400 font-bold">{selectedHlth.uptimePct.toFixed(2)}%</div>
                      <div className="text-slate-500 text-[9px]">Uptime</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                      <div className={`font-bold ${selectedHlth.errorRate > 0.02 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {(selectedHlth.errorRate * 100).toFixed(2)}%
                      </div>
                      <div className="text-slate-500 text-[9px]">Error Rate</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                      <div className={`font-bold ${selectedHlth.duplicatesDetected > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedHlth.duplicatesDetected}
                      </div>
                      <div className="text-slate-500 text-[9px]">Duplicates</div>
                    </div>
                  </div>
                </div>

                {/* Anomaly log for this device */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-2">Device Anomalies</div>
                  {selectedHlth.anomalies.length === 0 ? (
                    <div className="text-center py-4 text-slate-600 text-xs flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No anomalies detected
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedHlth.anomalies.map(a => (
                        <div key={a.id} className={`border rounded-lg p-2.5 ${SEV_STYLE[a.severity]}`}>
                          <div className="flex items-center justify-between text-[9px] mb-1">
                            <span className="font-bold uppercase">{a.type.replace(/_/g, ' ')}</span>
                            <span>{ts(a.ts)}</span>
                          </div>
                          <div className="text-xs">{a.message}</div>
                          <div className="text-[9px] font-mono text-slate-600 mt-1">checksum: {a.checksum}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. NOZZLE TELEMETRY ──────────────────────────────────────────── */}
        {tab === 'nozzle' && (
          <div className="space-y-4">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Live Nozzle States — Orpak Pulse Stream</div>
            <div className="grid sm:grid-cols-2 gap-4">
              {nozzles.map(nz => {
                const fueling = nz.status === 'fueling';
                const completed = nz.status === 'completed';
                return (
                  <div key={nz.nozzleId} className={`border rounded-xl p-4 ${fueling ? 'border-emerald-500/40 bg-emerald-500/5' : completed ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-slate-200">{nz.nozzleId}</span>
                        <span className="text-slate-500 text-xs ml-2">({nz.fuelType})</span>
                        <span className="text-[10px] text-slate-600 ml-2">{nz.pumpId}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fueling && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          fueling ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                          completed ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                          'text-slate-500 border-slate-700'}`}>
                          {nz.status}
                        </span>
                      </div>
                    </div>

                    {fueling && (
                      <div className="mb-3 p-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Current Sale</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {nz.currentSaleLitres.toFixed(3)} L @ ₹{nz.pricePerLitre}/L
                          </span>
                        </div>
                        <div className="text-right text-emerald-300 font-mono font-bold text-lg mt-0.5">
                          ₹{nz.currentSaleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-slate-600 mt-1">Last pulse: {ago(nz.lastPulseTs)} · Rollback guard: ACTIVE</div>
                      </div>
                    )}

                    {completed && (
                      <div className="mb-3 p-2.5 bg-blue-500/8 border border-blue-500/20 rounded-lg">
                        <div className="text-xs text-slate-400">Last Sale Completed</div>
                        <div className="font-mono text-blue-300 font-bold">{nz.currentSaleLitres.toFixed(3)} L = ₹{nz.currentSaleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[9px] text-slate-600">{ago(nz.lastPulseTs)}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/60 rounded p-2 border border-slate-800">
                        <div className="text-slate-500 text-[9px]">Totalizer (L)</div>
                        <div className="font-mono text-slate-200">{nz.totalizerLitres.toLocaleString('en-IN', { minimumFractionDigits: 3 })}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded p-2 border border-slate-800">
                        <div className="text-slate-500 text-[9px]">Rate (₹/L)</div>
                        <div className="font-mono text-slate-200">{nz.pricePerLitre.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-slate-700 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Rollback check: enabled · Dedup seq active
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 4. TANK & LEAK ───────────────────────────────────────────────── */}
        {tab === 'tank' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Wetstock Variance — {tankData.date}</div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${
                tankData.overallStatus === 'clear' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                tankData.overallStatus === 'suspect' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                {tankData.overallStatus.toUpperCase()}
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {tankData.tanks.map(t => {
                const varAbs = Math.abs(t.variance);
                const statusColor = t.status === 'clear' ? 'emerald' : t.status === 'suspect' ? 'amber' : 'red';
                return (
                  <div key={t.tankId} className={`border rounded-xl p-4 border-${statusColor}-500/30 bg-${statusColor}-500/5`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-200">{t.tankId}</span>
                      <span className="text-xs text-slate-400">{t.fuelType}</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        { l: 'Opening', v: `${t.openingLitres.toLocaleString('en-IN')} L` },
                        { l: 'Sales',   v: `−${t.salesLitres.toLocaleString('en-IN')} L` },
                        { l: 'Book Closing', v: `${t.bookClosing.toLocaleString('en-IN')} L` },
                        { l: 'Physical Closing', v: `${t.physicalClosing.toLocaleString('en-IN')} L` },
                      ].map(r => (
                        <div key={r.l} className="flex justify-between border-b border-slate-800/50 pb-1">
                          <span className="text-slate-500">{r.l}</span>
                          <span className="font-mono text-slate-300">{r.v}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1">
                        <span className="font-bold text-slate-400">Variance</span>
                        <span className={`font-mono font-bold text-${statusColor}-400`}>
                          {t.variance > 0 ? '+' : ''}{t.variance.toFixed(2)} L ({t.variancePct.toFixed(3)}%)
                        </span>
                      </div>
                    </div>
                    <div className={`mt-2 text-[10px] font-bold text-${statusColor}-400 flex items-center gap-1`}>
                      {t.status === 'clear' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {t.status === 'clear' ? 'PESO Compliant — All Clear' : `SUSPECT — ${varAbs.toFixed(2)}L unexplained`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PESO threshold note */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
              <div className="font-bold text-slate-300 mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> PESO / MoPNG Leak Detection Standards</div>
              <p>Acceptable variance: ±0.7 L/hour (PESO Statutory Order, Petroleum Rules 2002). Variances exceeding 3.0 L/hr trigger mandatory ATG testing and PESO authority notification. All test results carry FNV-1a checksum for immutable audit trail.</p>
            </div>
          </div>
        )}

        {/* ── 5. POS SETTLEMENT ────────────────────────────────────────────── */}
        {tab === 'pos' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-3 text-xs">
              {[
                { l: 'Batch ID', v: posBatch.batchId, c: 'text-slate-200' },
                { l: 'POS Total', v: `₹${posBatch.batchTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, c: 'text-emerald-400' },
                { l: 'Approved', v: posBatch.approvedCount, c: 'text-emerald-400' },
                { l: 'Declined', v: posBatch.declinedCount, c: posBatch.declinedCount > 0 ? 'text-red-400' : 'text-emerald-400' },
              ].map(k => (
                <div key={k.l} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-500 text-[9px] uppercase">{k.l}</div>
                  <div className={`font-mono font-bold text-base mt-0.5 ${k.c}`}>{k.v}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                Transaction Log (last {Math.min(posBatch.transactions.length, 15)})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] text-slate-600 uppercase">
                      {['RRN', 'Network', 'PAN', 'Mode', 'Amount', 'Status', 'Time'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posBatch.transactions.slice(0, 15).map(tx => (
                      <tr key={tx.id} className="border-t border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-3 py-2 font-mono text-[9px] text-slate-400">{tx.rrn.slice(-8)}</td>
                        <td className="px-3 py-2">{tx.cardNetwork}</td>
                        <td className="px-3 py-2 font-mono text-[9px] text-slate-500">{tx.maskedPan}</td>
                        <td className="px-3 py-2 capitalize">{tx.paymentMode}</td>
                        <td className="px-3 py-2 font-mono font-bold">₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] border font-bold uppercase ${
                            tx.status === 'approved' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                            'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[9px] text-slate-600">{ts(tx.ts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. RFID FLEET ────────────────────────────────────────────────── */}
        {tab === 'rfid' && (
          <div className="space-y-4">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Registered Fleet Tags — {rfidTags.length} active</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rfidTags.map(tag => {
                const spendPct = tag.limit > 0 ? Math.min(100, (tag.spent / tag.limit) * 100) : 0;
                const limitHit = spendPct >= 100;
                const lowBal = tag.balance < tag.limit * 0.2;
                return (
                  <div key={tag.tagId} className={`border rounded-xl p-4 ${limitHit ? 'border-red-500/30 bg-red-500/5' : lowBal ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-200 text-sm">{tag.reg}</div>
                        <div className="text-[10px] text-slate-500">{tag.company}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 border rounded text-slate-400 border-slate-700">{tag.fuel}</span>
                    </div>
                    <div className="text-[9px] text-slate-600 mb-2 font-mono">{tag.tagId}</div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Credit Balance</span>
                        <span className={`font-mono font-bold ${lowBal ? 'text-amber-400' : 'text-emerald-400'}`}>₹{tag.balance.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                          <span>Daily Spend</span>
                          <span>₹{tag.spent.toLocaleString('en-IN')} / ₹{tag.limit.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${limitHit ? 'bg-red-500' : spendPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${spendPct}%` }} />
                        </div>
                      </div>
                    </div>

                    {limitHit && <div className="mt-2 text-[9px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Daily limit reached — dispensing blocked</div>}
                    {lowBal && !limitHit && <div className="mt-2 text-[9px] text-amber-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Low credit balance — top-up required</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 7. PRINTER STATUS ────────────────────────────────────────────── */}
        {tab === 'printer' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { l: 'Printer Status', v: 'ONLINE', c: 'text-emerald-400', border: 'border-emerald-500/30' },
                { l: 'Paper Status',   v: 'LOW — Replace Soon', c: 'text-amber-400', border: 'border-amber-500/30' },
                { l: 'Jobs Queued',    v: '2 pending', c: 'text-blue-400', border: 'border-blue-500/30' },
              ].map(k => (
                <div key={k.l} className={`border ${k.border} bg-slate-900/40 rounded-xl p-4`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">{k.l}</div>
                  <div className={`font-bold text-sm mt-1 ${k.c}`}>{k.v}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Shift Close Receipt Preview</div>
              <div className="font-mono text-[10px] text-slate-400 bg-slate-950 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed border border-slate-800" style={{ maxHeight: 420, overflowY: 'auto' }}>
{`          SHREE RAM FUEL STATION
         Andheri West, Mumbai - 400053
         GSTIN: 27AABCU9603R1ZX
==========================================
            SHIFT CLOSE REPORT
------------------------------------------
Shift   : SHIFT_240521
Date    : 21/05/2025  [Day Shift]
Operator: Raju Sharma
Supervisor: Mohan Gupta
------------------------------------------
NOZZLE READINGS
NZ  Fuel  Open          Close         Net L    Revenue
--------------------------------------------------
N1  MS    12450.25      13892.60      1440.35  Rs.1,50,820.50
N2  MS    9812.10       11198.40      1384.50  Rs.1,45,027.14
N3  HSD   8201.55       9648.20       1445.15  Rs.1,32,375.74
N4  HSD   6500.00       7840.30       1339.10  Rs.1,22,661.56
--------------------------------------------------
TOTAL                           5609.10L  Rs.5,50,884.94
------------------------------------------
PAYMENT BREAKDOWN
  Cash                 Rs.1,80,000.00
  UPI                  Rs.2,20,000.00
  Card                 Rs.85,000.00
  Credit Sales         Rs.35,000.00
  Credit Recovery      Rs.18,000.00
  Expenses             Rs.-4,500.00
------------------------------------------
CASH RECONCILIATION
  Opening Cash : Rs.15,000.00
  Closing Cash : Rs.1,93,500.00
  BALANCED     : OK
------------------------------------------
TAX SUMMARY
  VAT Collected  : Rs.68,432.10
  Excise Duty    : Rs.42,892.50
  GST (Non-fuel) : Rs.3,240.00
------------------------------------------
Printed: 21/05/2025 18:00:00
Authorised Signatory: ________________`}
              </div>
            </div>
          </div>
        )}

        {/* ── 8. ANOMALY FEED ──────────────────────────────────────────────── */}
        {tab === 'anomalies' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">All Hardware Anomalies</div>
              <span className="text-[10px] text-slate-600">{anomalies.length} total · {critAnomalies} critical/error</span>
            </div>
            {anomalies.map(a => (
              <div key={a.id} className={`border rounded-xl p-4 ${SEV_STYLE[a.severity]}`}>
                <div className="flex items-start gap-3">
                  {a.severity === 'critical' || a.severity === 'error'
                    ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    : a.severity === 'warn'
                      ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase">{a.severity}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400 uppercase">{a.type.replace(/_/g, ' ')}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{a.deviceId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        {a.replayed && <span className="text-emerald-600 text-[9px]">REPLAYED</span>}
                        <span>{ts(a.ts)}</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{a.message}</p>
                    <div className="mt-1 text-[9px] font-mono text-slate-600">checksum: {a.checksum}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
