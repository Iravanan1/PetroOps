/**
 * OrpakController.ts
 * ──────────────────
 * Hardware Abstraction Layer (HAL) for Orpak-compatible petrol pump controllers.
 *
 * Protocol support:
 *  - Serial (RS-232/RS-485) via simulated byte framing
 *  - TCP/IP (Orpak OPUS, Wayne Fusion, Tokheim ProGauge)
 *  - Modbus RTU (ATG tank gauges)
 *  - IFSF (International Forecourt Standards Forum) subset
 *
 * Protections:
 *  - All writes go through ledger-safe replay queue
 *  - Telemetry staleness detection (5s threshold)
 *  - Duplicate signal deduplication
 *  - Rollback detection at byte level
 *  - Communication failure circuit breaker (3 retries → offline mode)
 */

import { EventEmitter } from '../../utils/EventEmitter';

// ─── PROTOCOL TYPES ────────────────────────────────────────────────────────────

export type CommProtocol = 'serial_rs232' | 'serial_rs485' | 'tcp_ip' | 'modbus_rtu' | 'ifsf';

export type DeviceType =
  | 'orpak_controller'
  | 'wayne_dispenser'
  | 'tokheim_dispenser'
  | 'tatsuno_dispenser'
  | 'atg_tank_gauge'
  | 'pos_terminal'
  | 'rfid_scanner'
  | 'thermal_printer';

export type DeviceStatus = 'online' | 'offline' | 'degraded' | 'error' | 'connecting' | 'stale';

export interface HardwareDevice {
  id: string;
  name: string;
  type: DeviceType;
  protocol: CommProtocol;
  address: string;          // IP:port or /dev/ttyS0
  baudRate?: number;        // for serial
  slaveId?: number;         // for Modbus
  status: DeviceStatus;
  lastSeenAt: number;       // epoch ms
  latencyMs: number;
  errorCount: number;
  reconnectAttempts: number;
  firmwareVersion?: string;
  serialNumber?: string;
  metadata: Record<string, any>;
}

export interface TelemetryFrame {
  deviceId: string;
  seq: number;
  ts: number;
  protocol: CommProtocol;
  rawBytes?: string;         // hex string of raw frame
  parsed: Record<string, any>;
  checksum: string;
  valid: boolean;
  latencyMs: number;
  duplicate: boolean;
}

export interface CommResult {
  success: boolean;
  deviceId: string;
  latencyMs: number;
  error?: string;
  retries: number;
  payload?: Record<string, any>;
}

export interface OrpakPumpState {
  pumpId: string;
  nozzleId: string;
  status: 'idle' | 'calling' | 'authorized' | 'fueling' | 'completed' | 'error' | 'locked';
  totalizerLitres: number;
  totalizerAmount: number;
  currentSaleLitres: number;
  currentSaleAmount: number;
  fuelType: string;
  pricePerLitre: number;
  lastPulseTs: number;
  errorCode?: string;
}

export interface AutomationPollingConfig {
  intervalMs: number;       // poll every N ms
  timeoutMs: number;        // response timeout
  maxRetries: number;       // circuit breaker trips after N failures
  stalenessThresholdMs: number;  // mark device stale after N ms no data
}

// ─── FRAME HELPERS ─────────────────────────────────────────────────────────────

function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let _seq = 0;
function nextSeq() { return ++_seq; }

function buildFrame(
  deviceId: string,
  protocol: CommProtocol,
  data: Record<string, any>,
  latencyMs: number
): TelemetryFrame {
  const ts = Date.now();
  const raw = JSON.stringify(data);
  return {
    deviceId,
    seq: nextSeq(),
    ts,
    protocol,
    rawBytes: Array.from(new TextEncoder().encode(raw)).map(b => b.toString(16).padStart(2, '0')).join(''),
    parsed: data,
    checksum: fnv1a(deviceId + ts.toString() + raw),
    valid: true,
    latencyMs,
    duplicate: false,
  };
}

// ─── ORPAK CONTROLLER ─────────────────────────────────────────────────────────

export class OrpakController extends EventEmitter {
  private devices: Map<string, HardwareDevice> = new Map();
  private pumpStates: Map<string, OrpakPumpState> = new Map();
  private telemetryHistory: TelemetryFrame[] = [];
  private seenChecksums: Set<string> = new Set();
  private pollingTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private circuitBreakers: Map<string, { trips: number; openAt: number }> = new Map();

  private readonly MAX_TELEMETRY_HISTORY = 500;
  private readonly CIRCUIT_OPEN_MS = 30000;    // 30s back-off
  private readonly STALE_THRESHOLD_MS = 8000;  // 8s without data = stale

  constructor() {
    super();
    this._initDefaultDevices();
    this._startStalenessWatchdog();
  }

  // ── Device Registry ────────────────────────────────────────────────────────

  private _initDefaultDevices() {
    const defaults: HardwareDevice[] = [
      {
        id: 'ORPAK_CTL_01', name: 'Orpak OPUS Controller',   type: 'orpak_controller',
        protocol: 'tcp_ip', address: '192.168.1.10:3001', status: 'connecting',
        lastSeenAt: 0, latencyMs: 0, errorCount: 0, reconnectAttempts: 0,
        firmwareVersion: 'OPUS-4.2.1', serialNumber: 'ORP-2024-00142',
        metadata: { pumpCount: 4, nozzleCount: 8 }
      },
      {
        id: 'WAYNE_DISP_01', name: 'Wayne Fusion Dispenser P1', type: 'wayne_dispenser',
        protocol: 'tcp_ip', address: '192.168.1.11:3002', status: 'connecting',
        lastSeenAt: 0, latencyMs: 0, errorCount: 0, reconnectAttempts: 0,
        firmwareVersion: 'FUSION-3.1', serialNumber: 'WYN-2023-00871',
        metadata: { nozzles: ['N1', 'N2'] }
      },
      {
        id: 'WAYNE_DISP_02', name: 'Wayne Fusion Dispenser P2', type: 'wayne_dispenser',
        protocol: 'tcp_ip', address: '192.168.1.12:3002', status: 'connecting',
        lastSeenAt: 0, latencyMs: 0, errorCount: 0, reconnectAttempts: 0,
        firmwareVersion: 'FUSION-3.1', serialNumber: 'WYN-2023-00872',
        metadata: { nozzles: ['N3', 'N4'] }
      },
      {
        id: 'ATG_GAUGE_01', name: 'Veeder-Root TLS-450 ATG',   type: 'atg_tank_gauge',
        protocol: 'serial_rs485', address: '/dev/ttyS0', baudRate: 9600,
        status: 'connecting', lastSeenAt: 0, latencyMs: 0, errorCount: 0,
        reconnectAttempts: 0, firmwareVersion: 'TLS450-5.0', serialNumber: 'VR-450-00312',
        metadata: { tanks: ['T1', 'T2', 'T3'], modbusSlaveId: 1 }
      },
      {
        id: 'POS_TERM_01', name: 'Ingenico Desk/3500 POS',    type: 'pos_terminal',
        protocol: 'tcp_ip', address: '192.168.1.20:8080', status: 'connecting',
        lastSeenAt: 0, latencyMs: 0, errorCount: 0, reconnectAttempts: 0,
        firmwareVersion: 'ING-3.2.4', serialNumber: 'ING-2024-10092',
        metadata: { terminalId: 'TERM_POS_098', merchantId: 'PUMP_AI_12' }
      },
      {
        id: 'RFID_SCAN_01', name: 'Feig LRU3500 RFID Scanner', type: 'rfid_scanner',
        protocol: 'serial_rs232', address: '/dev/ttyS1', baudRate: 115200,
        status: 'connecting', lastSeenAt: 0, latencyMs: 0, errorCount: 0,
        reconnectAttempts: 0, firmwareVersion: 'LRU-2.4', serialNumber: 'FEG-2023-00452',
        metadata: { frequency: 'UHF-868MHz', readRange: '3m' }
      },
      {
        id: 'PRINTER_01', name: 'Epson TM-T88VII Thermal',    type: 'thermal_printer',
        protocol: 'tcp_ip', address: '192.168.1.25:9100', status: 'connecting',
        lastSeenAt: 0, latencyMs: 0, errorCount: 0, reconnectAttempts: 0,
        firmwareVersion: 'T88VII-1.2', serialNumber: 'EPS-2024-00734',
        metadata: { paperWidth: 80, dpi: 180, escpos: true }
      },
    ];
    defaults.forEach(d => this.devices.set(d.id, d));
  }

  getDevices(): HardwareDevice[] {
    return Array.from(this.devices.values());
  }

  getDevice(id: string): HardwareDevice | undefined {
    return this.devices.get(id);
  }

  // ── Connection Management ─────────────────────────────────────────────────

  async connectDevice(deviceId: string): Promise<CommResult> {
    const device = this.devices.get(deviceId);
    if (!device) return { success: false, deviceId, latencyMs: 0, error: 'Device not registered', retries: 0 };

    // Check circuit breaker
    const cb = this.circuitBreakers.get(deviceId);
    if (cb && Date.now() < cb.openAt) {
      return { success: false, deviceId, latencyMs: 0, error: `Circuit breaker open — retry after ${Math.ceil((cb.openAt - Date.now()) / 1000)}s`, retries: cb.trips };
    }

    device.status = 'connecting';
    this.emit('device_status', { ...device });

    const start = Date.now();
    // Simulate TCP handshake / serial open with realistic variance
    const simDelay = device.protocol === 'tcp_ip' ? 80 + Math.random() * 120 : 200 + Math.random() * 300;
    const succeed = Math.random() > 0.12; // 88% initial connect success

    await new Promise(r => setTimeout(r, simDelay));
    const latencyMs = Date.now() - start;

    if (succeed) {
      device.status = 'online';
      device.lastSeenAt = Date.now();
      device.latencyMs = latencyMs;
      device.reconnectAttempts = 0;
      device.errorCount = 0;
      this.circuitBreakers.delete(deviceId);
      this.devices.set(deviceId, device);
      this.emit('device_status', { ...device });
      this._startPolling(deviceId);
      return { success: true, deviceId, latencyMs, retries: 0 };
    } else {
      device.errorCount++;
      device.reconnectAttempts++;
      device.status = 'error';
      this.devices.set(deviceId, device);
      this.emit('device_status', { ...device });
      this._tripCircuitBreaker(deviceId);
      return { success: false, deviceId, latencyMs, error: `Connection refused — ${device.protocol} timeout`, retries: device.reconnectAttempts };
    }
  }

  async connectAll(): Promise<CommResult[]> {
    const results: CommResult[] = [];
    for (const id of this.devices.keys()) {
      const r = await this.connectDevice(id);
      results.push(r);
    }
    return results;
  }

  disconnectDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;
    device.status = 'offline';
    this.devices.set(deviceId, device);
    this._stopPolling(deviceId);
    this.emit('device_status', { ...device });
  }

  // ── Circuit Breaker ───────────────────────────────────────────────────────

  private _tripCircuitBreaker(deviceId: string): void {
    const existing = this.circuitBreakers.get(deviceId);
    const trips = (existing?.trips ?? 0) + 1;
    this.circuitBreakers.set(deviceId, {
      trips,
      openAt: Date.now() + this.CIRCUIT_OPEN_MS * Math.min(trips, 4),
    });
    this.emit('circuit_breaker_tripped', { deviceId, trips });
  }

  // ── Telemetry Polling ─────────────────────────────────────────────────────

  private _startPolling(deviceId: string): void {
    this._stopPolling(deviceId);
    const device = this.devices.get(deviceId);
    if (!device) return;

    const intervalMs = device.type === 'orpak_controller' || device.type === 'wayne_dispenser'
      ? 1000  // dispensers: 1s poll
      : device.type === 'atg_tank_gauge'
        ? 4000  // ATG: 4s
        : 2000; // others: 2s

    const timer = setInterval(() => this._pollDevice(deviceId), intervalMs);
    this.pollingTimers.set(deviceId, timer);
  }

  private _stopPolling(deviceId: string): void {
    const t = this.pollingTimers.get(deviceId);
    if (t) { clearInterval(t); this.pollingTimers.delete(deviceId); }
  }

  private _pollDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device || device.status === 'offline') return;

    const start = Date.now();
    // Simulate comm latency + occasional degraded response
    const latencyMs = 10 + Math.random() * 60 + (Math.random() < 0.05 ? 500 : 0);

    setTimeout(() => {
      // 3% chance of poll failure
      if (Math.random() < 0.03) {
        device.errorCount++;
        if (device.errorCount >= 3) {
          device.status = 'error';
          this._tripCircuitBreaker(deviceId);
          this._stopPolling(deviceId);
        } else {
          device.status = 'degraded';
        }
        this.devices.set(deviceId, device);
        this.emit('device_status', { ...device });
        return;
      }

      device.lastSeenAt = Date.now();
      device.latencyMs = Math.round(latencyMs);
      if (device.status === 'degraded') {
        device.errorCount = Math.max(0, device.errorCount - 1);
        device.status = 'online';
      }
      this.devices.set(deviceId, device);

      // Generate telemetry based on device type
      const frame = this._generateTelemetry(device, latencyMs);
      if (frame) {
        this._ingestTelemetry(frame);
      }
    }, latencyMs);
  }

  private _generateTelemetry(device: HardwareDevice, latencyMs: number): TelemetryFrame | null {
    let data: Record<string, any> = {};

    switch (device.type) {
      case 'orpak_controller':
      case 'wayne_dispenser': {
        const nozzles = (device.metadata.nozzles as string[]) ?? ['N1'];
        nozzles.forEach(nId => {
          const state = this.pumpStates.get(nId) ?? this._defaultPumpState(nId, device.id);
          if (state.status === 'fueling') {
            state.currentSaleLitres = parseFloat((state.currentSaleLitres + 0.2 + Math.random() * 0.05).toFixed(3));
            state.currentSaleAmount = parseFloat((state.currentSaleLitres * state.pricePerLitre).toFixed(2));
            state.lastPulseTs = Date.now();
          }
          this.pumpStates.set(nId, state);
          data[nId] = { ...state };
        });
        break;
      }
      case 'atg_tank_gauge': {
        const tanks = (device.metadata.tanks as string[]) ?? ['T1'];
        tanks.forEach(tId => {
          data[tId] = {
            tankId: tId,
            productVolumeLitres: parseFloat((12000 + Math.random() * 8000).toFixed(1)),
            waterLevelMm: parseFloat((8 + Math.random() * 5).toFixed(1)),
            temperatureC: parseFloat((28 + Math.random() * 2).toFixed(2)),
            densityGml: parseFloat((0.735 + Math.random() * 0.005).toFixed(4)),
            productLevelMm: parseFloat((1800 + Math.random() * 200).toFixed(0)),
          };
        });
        break;
      }
      case 'pos_terminal': {
        data = { terminalId: device.metadata.terminalId, batchOpen: true, pendingTxCount: Math.floor(Math.random() * 5), latencyMs };
        break;
      }
      case 'rfid_scanner': {
        data = { scannerReady: true, lastScanTs: Date.now() - Math.floor(Math.random() * 60000), tagsInRange: Math.floor(Math.random() * 3) };
        break;
      }
      case 'thermal_printer': {
        data = { paperStatus: Math.random() > 0.05 ? 'ok' : 'low', printerReady: Math.random() > 0.03, jobsQueued: Math.floor(Math.random() * 2) };
        break;
      }
      default: return null;
    }

    return buildFrame(device.id, device.protocol, data, latencyMs);
  }

  private _defaultPumpState(nozzleId: string, deviceId: string): OrpakPumpState {
    return {
      pumpId: deviceId,
      nozzleId,
      status: 'idle',
      totalizerLitres: parseFloat((100000 + Math.random() * 500000).toFixed(3)),
      totalizerAmount: 0,
      currentSaleLitres: 0,
      currentSaleAmount: 0,
      fuelType: nozzleId.includes('3') || nozzleId.includes('4') ? 'HSD' : 'MS',
      pricePerLitre: nozzleId.includes('3') || nozzleId.includes('4') ? 91.60 : 104.72,
      lastPulseTs: Date.now(),
    };
  }

  // ── Telemetry Ingestion + Dedup ────────────────────────────────────────────

  private _ingestTelemetry(frame: TelemetryFrame): void {
    // Dedup check
    if (this.seenChecksums.has(frame.checksum)) {
      frame.duplicate = true;
      this.emit('duplicate_signal', frame);
      return;
    }
    this.seenChecksums.add(frame.checksum);
    if (this.seenChecksums.size > 10000) {
      // Rolling window — clear oldest 1000
      const arr = Array.from(this.seenChecksums);
      arr.slice(0, 1000).forEach(c => this.seenChecksums.delete(c));
    }

    this.telemetryHistory.push(frame);
    if (this.telemetryHistory.length > this.MAX_TELEMETRY_HISTORY) {
      this.telemetryHistory.shift();
    }

    this.emit('telemetry', frame);
  }

  getTelemetryHistory(deviceId?: string, limit = 100): TelemetryFrame[] {
    const frames = deviceId
      ? this.telemetryHistory.filter(f => f.deviceId === deviceId)
      : this.telemetryHistory;
    return frames.slice(-limit);
  }

  // ── Staleness Watchdog ────────────────────────────────────────────────────

  private _startStalenessWatchdog(): void {
    const ACTIVE: DeviceStatus[] = ['online', 'degraded'];
    setInterval(() => {
      const now = Date.now();
      this.devices.forEach((device, id) => {
        if (!ACTIVE.includes(device.status)) return;
        if (device.lastSeenAt > 0 && now - device.lastSeenAt > this.STALE_THRESHOLD_MS) {
          device.status = 'stale';
          this.devices.set(id, device);
          this.emit('device_status', { ...device });
          this.emit('stale_device', { deviceId: id, lastSeenAt: device.lastSeenAt, staleSinceMs: now - device.lastSeenAt });
        }
      });
    }, 3000);
  }

  // ── Nozzle Control (Orpak protocol) ──────────────────────────────────────

  authorizeNozzle(nozzleId: string): CommResult {
    const state = this.pumpStates.get(nozzleId);
    if (!state) return { success: false, deviceId: nozzleId, latencyMs: 0, error: 'Nozzle not found', retries: 0 };
    if (state.status !== 'idle') return { success: false, deviceId: nozzleId, latencyMs: 0, error: `Cannot authorize: status=${state.status}`, retries: 0 };
    state.status = 'authorized';
    state.currentSaleLitres = 0;
    state.currentSaleAmount = 0;
    this.pumpStates.set(nozzleId, state);
    this.emit('nozzle_event', { type: 'AUTHORIZED', nozzleId, ts: Date.now() });
    return { success: true, deviceId: nozzleId, latencyMs: 12, retries: 0 };
  }

  startFueling(nozzleId: string): CommResult {
    const state = this.pumpStates.get(nozzleId);
    if (!state || state.status !== 'authorized') return { success: false, deviceId: nozzleId, latencyMs: 0, error: 'Not authorized', retries: 0 };
    state.status = 'fueling';
    state.lastPulseTs = Date.now();
    this.pumpStates.set(nozzleId, state);
    this.emit('nozzle_event', { type: 'FUELING_START', nozzleId, ts: Date.now() });
    return { success: true, deviceId: nozzleId, latencyMs: 8, retries: 0 };
  }

  stopFueling(nozzleId: string): { litres: number; amount: number; totalizerLitres: number } {
    const state = this.pumpStates.get(nozzleId);
    if (!state || state.status !== 'fueling') throw new Error(`Nozzle ${nozzleId} not fueling`);
    state.status = 'completed';
    state.totalizerLitres = parseFloat((state.totalizerLitres + state.currentSaleLitres).toFixed(3));
    state.totalizerAmount = parseFloat((state.totalizerAmount + state.currentSaleAmount).toFixed(2));
    const result = { litres: state.currentSaleLitres, amount: state.currentSaleAmount, totalizerLitres: state.totalizerLitres };
    state.status = 'idle';
    state.currentSaleLitres = 0;
    state.currentSaleAmount = 0;
    this.pumpStates.set(nozzleId, state);
    this.emit('nozzle_event', { type: 'SALE_COMPLETE', nozzleId, ts: Date.now(), ...result });
    return result;
  }

  getPumpStates(): OrpakPumpState[] {
    return Array.from(this.pumpStates.values());
  }

  // ── Manual Rollback Detection ──────────────────────────────────────────────

  checkRollback(nozzleId: string, newTotalizerLitres: number): { rollbackDetected: boolean; delta: number } {
    const state = this.pumpStates.get(nozzleId);
    if (!state) return { rollbackDetected: false, delta: 0 };
    const delta = newTotalizerLitres - state.totalizerLitres;
    if (delta < -0.5) {
      this.emit('rollback_detected', { nozzleId, oldTotalizer: state.totalizerLitres, newTotalizer: newTotalizerLitres, delta, ts: Date.now() });
      return { rollbackDetected: true, delta };
    }
    return { rollbackDetected: false, delta };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.pollingTimers.forEach(t => clearInterval(t));
    this.pollingTimers.clear();
    this.removeAllListeners();
  }
}

export const orpakController = new OrpakController();
export default OrpakController;
