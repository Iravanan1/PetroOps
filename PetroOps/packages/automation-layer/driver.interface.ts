export interface DispenserState {
  nozzleId: number;
  state: 'IDLE' | 'CALLING' | 'FUELING' | 'SUSPENDED' | 'OFFLINE';
  totalizerLiters: number;
  currentSaleLiters: number;
  currentSaleAmount: number;
}

export interface TankDipData {
  fuelHeightMm: number;
  waterHeightMm: number;
  temperature: number;
  litersCalculated: number;
}

export interface IPumpDriver {
  /**
   * Connects to the forecourt controller hardware serial loop or TCP/IP bridge.
   */
  initialize(connectionString: string): Promise<boolean>;

  /**
   * Queries real-time state flags and volumes for a nozzle index.
   */
  getDispenserState(nozzleId: number): Promise<DispenserState>;

  /**
   * Authorizes delivery on a specific nozzle with a quantity or amount limit.
   */
  authorizeDispenser(nozzleId: number, limitLiters: number, pricePerLiter: number): Promise<boolean>;

  /**
   * Terminates active fuel deliveries instantly in case of an emergency.
   */
  terminateDispenser(nozzleId: number): Promise<boolean>;

  /**
   * Queries telemetry heights and temperatures from Automatic Tank Gauges.
   */
  readAutomaticTankGauge(tankId: number): Promise<TankDipData>;
}
