export interface NozzleTelemetry {
  pumpId: string;
  nozzleId: string;
  status: 'IDLE' | 'FUELLING' | 'OFFLINE' | 'ERROR';
  currentVolume: number;
  currentAmount: number;
  totalizerVolume: number;
  lastUpdate: string;
}

export class OrpakBridgeService {
  private isConnected: boolean = false;
  private endpoint: string;

  constructor(endpoint: string = 'tcp://192.168.1.50:4000') {
    this.endpoint = endpoint;
  }

  public connect(): void {
    console.log(`[OrpakBridge] Connecting to Orpak SiteOmat controller at ${this.endpoint}...`);
    this.isConnected = true;
  }

  public disconnect(): void {
    console.log(`[OrpakBridge] Disconnecting from Orpak controller.`);
    this.isConnected = false;
  }

  public getStatus(): string {
    return this.isConnected ? 'ONLINE' : 'OFFLINE';
  }

  /**
   * Simulates polling a specific nozzle for live dispensation data.
   */
  public pollNozzle(pumpId: string, nozzleId: string): NozzleTelemetry | null {
    if (!this.isConnected) return null;
    
    // Simulate live telemetry
    return {
      pumpId,
      nozzleId,
      status: Math.random() > 0.8 ? 'FUELLING' : 'IDLE',
      currentVolume: Math.random() * 50, // liters
      currentAmount: Math.random() * 5000, // INR
      totalizerVolume: 1250000 + (Math.random() * 10),
      lastUpdate: new Date().toISOString()
    };
  }
}
