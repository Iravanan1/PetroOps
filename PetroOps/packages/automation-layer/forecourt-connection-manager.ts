import { IPumpDriver, DispenserState } from './driver.interface';

export class ForecourtConnectionManager {
  private activeDriver: IPumpDriver | null = null;
  private isPolling = false;
  private retryAttempts = 0;
  private maxRetries = 5;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly connectionString: string,
    private readonly driver: IPumpDriver
  ) {}

  /**
   * Initializes physical communication over TCP/IP or RS-485 serial loops.
   * Leverages recursive backoff retry procedures if connectivity drops.
   */
  public async establishForecourtLoop(): Promise<boolean> {
    try {
      console.log(`[Forecourt Manager] Connecting to loop via ${this.connectionString}...`);
      const connected = await this.driver.initialize(this.connectionString);
      
      if (connected) {
        this.activeDriver = this.driver;
        this.retryAttempts = 0;
        console.log(`[Forecourt Manager] Forecourt controller online.`);
        return true;
      }
      throw new Error('Forecourt hardware did not acknowledge initialization frames.');
    } catch (error: any) {
      this.retryAttempts++;
      const backoffSecs = Math.min(30, Math.pow(2, this.retryAttempts));
      
      console.warn(
        `[Forecourt Manager] Connection failed (Attempt ${this.retryAttempts}/${this.maxRetries}). ` +
        `Reconnecting in ${backoffSecs} seconds. Error: ${error.message}`
      );

      if (this.retryAttempts < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffSecs * 1000));
        return await this.establishForecourtLoop();
      }

      console.error('[Forecourt Manager] CRITICAL: Maximum connection retries exceeded. Station operating offline.');
      return false;
    }
  }

  /**
   * Initiates regular dispenser state queries.
   */
  public startTelemetryPolling(
    intervalMs = 1000,
    onData: (state: DispenserState) => void
  ): void {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = async () => {
      if (!this.isPolling) return;

      if (this.activeDriver) {
        try {
          // Query active dispenser nozzle
          const state = await this.activeDriver.getDispenserState(1);
          onData(state);
        } catch (e: any) {
          console.error(`[Forecourt Manager] Telemetry poll failed: ${e.message}. Restarting loop...`);
          this.activeDriver = null;
          await this.establishForecourtLoop();
        }
      }

      this.pollingTimer = setTimeout(poll, intervalMs);
    };

    poll();
  }

  /**
   * Terminates background telemetry loops safely.
   */
  public stopPolling(): void {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log('[Forecourt Manager] Telemetry polling halted.');
  }

  public getActiveDriver(): IPumpDriver | null {
    return this.activeDriver;
  }
}
