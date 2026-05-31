import { IPumpDriver, DispenserState, TankDipData } from '../driver.interface';

export class OrpakDriver implements IPumpDriver {
  private connectionString = '';

  async initialize(connectionString: string): Promise<boolean> {
    this.connectionString = connectionString;
    console.log(`[OrpakDriver] Initializing RS-485 loop connection to Orpak FCC: ${connectionString}`);
    // Simulate successful serial/TCP bridge handshake
    return true;
  }

  async getDispenserState(nozzleId: number): Promise<DispenserState> {
    // Queries nozzle state parameters
    return {
      nozzleId,
      state: 'IDLE',
      totalizerLiters: 125603.4,
      currentSaleLiters: 0.0,
      currentSaleAmount: 0.0
    };
  }

  async authorizeDispenser(nozzleId: number, limitLiters: number, pricePerLiter: number): Promise<boolean> {
    console.log(`[OrpakDriver] Authorizing delivery on Nozzle #${nozzleId} via Orpak serial protocol`);
    return true;
  }

  async terminateDispenser(nozzleId: number): Promise<boolean> {
    console.warn(`[OrpakDriver] Sending emergency halt frame to Nozzle #${nozzleId}`);
    return true;
  }

  async readAutomaticTankGauge(tankId: number): Promise<TankDipData> {
    return {
      fuelHeightMm: 1250.0,
      waterHeightMm: 12.0,
      temperature: 24.5,
      litersCalculated: 18200.0
    };
  }
}
