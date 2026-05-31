export interface TankTelemetry {
  tankId: string;
  fuelType: string;
  dipLevelMm: number;
  grossVolumeLiters: number;
  waterLevelMm: number;
  density: number;
  temperature: number;
  status: 'NORMAL' | 'LOW_STOCK' | 'WATER_ALARM' | 'LEAK_SUSPECTED' | 'OFFLINE';
  lastPolled: string;
}

export class TankGaugeConnector {
  private isConnected: boolean = false;
  private protocol: string;

  constructor(protocol: string = 'TLS-450') {
    this.protocol = protocol;
  }

  public connect(ipAddress: string): void {
    console.log(`[TankGaugeConnector] Connecting to ATG (${this.protocol}) at ${ipAddress}...`);
    this.isConnected = true;
  }

  public disconnect(): void {
    console.log(`[TankGaugeConnector] Disconnected from ATG.`);
    this.isConnected = false;
  }

  public getStatus(): string {
    return this.isConnected ? 'ONLINE' : 'OFFLINE';
  }

  /**
   * Polls the Automatic Tank Gauge for live physical wetstock data.
   */
  public pollTank(tankId: string, fuelType: string): TankTelemetry | null {
    if (!this.isConnected) return null;

    // Simulate reading via serial/TCP string
    const simulatedStatus = Math.random() > 0.95 ? 'WATER_ALARM' : 'NORMAL';

    return {
      tankId,
      fuelType,
      dipLevelMm: 1250.4 + (Math.random() * 5),
      grossVolumeLiters: 15400 + (Math.random() * 20),
      waterLevelMm: simulatedStatus === 'WATER_ALARM' ? 45.2 : 0.0,
      density: 740.5 + (Math.random() * 1.5), // kg/m3
      temperature: 28.4 + (Math.random() * 2), // Celsius
      status: simulatedStatus,
      lastPolled: new Date().toISOString()
    };
  }
}
