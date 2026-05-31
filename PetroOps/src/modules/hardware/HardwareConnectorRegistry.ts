/**
 * HardwareConnectorRegistry.ts
 * ──────────────────────────────
 * Dynamic physical hardware adapter coordinator registry.
 * Manages RS-232 serial loops, TCP/IP ports, and USB card readers.
 */

export interface HardwareAdapter {
  id: string;
  name: string;
  type: 'ATG' | 'FCC' | 'POS' | 'RFID' | 'PRINTER';
  connectionType: 'SERIAL' | 'TCP_IP' | 'USB';
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  poll(): Promise<any>;
}

export class HardwareConnectorRegistry {
  private static instance: HardwareConnectorRegistry;
  private adapters: Map<string, HardwareAdapter> = new Map();

  private constructor() {}

  public static getInstance(): HardwareConnectorRegistry {
    if (!HardwareConnectorRegistry.instance) {
      HardwareConnectorRegistry.instance = new HardwareConnectorRegistry();
    }
    return HardwareConnectorRegistry.instance;
  }

  public registerAdapter(adapter: HardwareAdapter): void {
    console.log(`[HardwareConnectorRegistry] Registering hardware adapter: ${adapter.name} (${adapter.type})`);
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): HardwareAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): HardwareAdapter[] {
    return Array.from(this.adapters.values());
  }

  public async connectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      try {
        console.log(`[HardwareConnectorRegistry] Booting connection for: ${adapter.name}`);
        await adapter.connect();
      } catch (err) {
        console.error(`[HardwareConnectorRegistry] Adapter ${adapter.id} connection failed:`, err);
      }
    }
  }

  public async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }
}

export default HardwareConnectorRegistry;
