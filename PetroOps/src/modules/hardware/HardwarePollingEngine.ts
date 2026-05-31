import { OrpakBridgeService, NozzleTelemetry } from './OrpakBridgeService';
import { TankGaugeConnector, TankTelemetry } from './TankGaugeConnector';
import { POSSettlementBridge, POSSettlement } from './POSSettlementBridge';

export interface HardwareStatusDiagnostic {
  orpakStatus: string;
  atgStatus: string;
  posStatus: string;
  lastPing: string;
  activeAlarms: string[];
}

export class HardwarePollingEngine {
  private orpak: OrpakBridgeService;
  private atg: TankGaugeConnector;
  private pos: POSSettlementBridge;
  private pollingIntervalId: any = null;

  constructor() {
    this.orpak = new OrpakBridgeService();
    this.atg = new TankGaugeConnector();
    this.pos = new POSSettlementBridge();
  }

  public startEngine(): void {
    console.log('[HardwarePolling] Booting hardware polling engine...');
    this.orpak.connect();
    this.atg.connect('192.168.1.100');
    this.pos.connect();

    this.pollingIntervalId = setInterval(() => {
      this.executePollingCycle();
    }, 5000); // Poll every 5s
  }

  public stopEngine(): void {
    console.log('[HardwarePolling] Shutting down hardware polling...');
    if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
    this.orpak.disconnect();
    this.atg.disconnect();
    this.pos.disconnect();
  }

  private executePollingCycle(): void {
    // In production, we'd emit these to a localized event bus or store them in state
    const nozzleData = this.orpak.pollNozzle('PUMP_1', 'NOZ_A');
    const tankData = this.atg.pollTank('TANK_1', 'MS_PETROL');
    const posData = this.pos.pollSettlement('TERM_01');
    
    // Check for alarms/disconnects
    if (tankData?.status === 'WATER_ALARM') {
      console.warn('[HardwareAlarm] WATER DETECTED IN TANK_1!');
    }
  }

  public getSystemDiagnostics(): HardwareStatusDiagnostic {
    const alarms: string[] = [];
    if (this.atg.getStatus() === 'OFFLINE') alarms.push('ATG_CONNECTION_LOST');
    if (this.orpak.getStatus() === 'OFFLINE') alarms.push('ORPAK_CONTROLLER_OFFLINE');

    return {
      orpakStatus: this.orpak.getStatus(),
      atgStatus: this.atg.getStatus(),
      posStatus: this.pos.getStatus(),
      lastPing: new Date().toISOString(),
      activeAlarms: alarms
    };
  }
}

export const hardwareEngineInstance = new HardwarePollingEngine();
