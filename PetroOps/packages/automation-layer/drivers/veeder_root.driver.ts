import { IPumpDriver, DispenserState, TankDipData } from '../driver.interface';

export class VeederRootDriver implements IPumpDriver {
  private connectionString = '';

  async initialize(connectionString: string): Promise<boolean> {
    this.connectionString = connectionString;
    console.log(`[VeederRootDriver] Initializing serial link to ATG console: ${connectionString}`);
    // Simulate successful serial/TCP handshake
    return true;
  }

  async getDispenserState(nozzleId: number): Promise<DispenserState> {
    // Veeder Root is an ATG and does not manage nozzles directly.
    // Return dummy status as compliant with driver interface.
    return {
      nozzleId,
      state: 'IDLE',
      totalizerLiters: 0.0,
      currentSaleLiters: 0.0,
      currentSaleAmount: 0.0
    };
  }

  async authorizeDispenser(nozzleId: number, limitLiters: number, pricePerLiter: number): Promise<boolean> {
    return false;
  }

  async terminateDispenser(nozzleId: number): Promise<boolean> {
    return false;
  }

  /**
   * Queries fuel volume levels, heights, temperatures, and water depths from physical probes.
   * Sends the standard Veeder-Root TLS serial query frame: <SOH>I20100<ETX>
   */
  async readAutomaticTankGauge(tankId: number): Promise<TankDipData> {
    console.log(`[VeederRootDriver] Sending query command I20100 to Tank #${tankId}`);
    
    // Simulate standard returning byte block
    // E.g. "I20100 25-05-2026 16:05:00 T 1:SPEED 97 VOLUME=14520L HEIGHT=1145mm WATER=8mm TEMP=24.8C"
    return {
      fuelHeightMm: 1145.2,
      waterHeightMm: 8.0,
      temperature: 24.8,
      litersCalculated: 14520.0
    };
  }
}
