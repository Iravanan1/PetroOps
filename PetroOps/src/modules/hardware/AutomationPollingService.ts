/**
 * AutomationPollingService.ts
 * ─────────────────────────────
 * Automated background poll worker for active serial loops and LAN TCP sockets.
 */

import { HardwareConnectorRegistry } from './HardwareConnectorRegistry';
import { hardwareHealthMonitor } from './HardwareHealthMonitor';

export class AutomationPollingService {
  private static instance: AutomationPollingService;
  private intervalId: any = null;
  private isPolling = false;

  private constructor() {}

  public static getInstance(): AutomationPollingService {
    if (!AutomationPollingService.instance) {
      AutomationPollingService.instance = new AutomationPollingService();
    }
    return AutomationPollingService.instance;
  }

  public startPolling(intervalMs: number = 3000): void {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log(`[AutomationPollingService] Initializing background polling loop every ${intervalMs}ms...`);

    this.intervalId = setInterval(async () => {
      const registry = HardwareConnectorRegistry.getInstance();
      const adapters = registry.getAllAdapters();

      for (const adapter of adapters) {
        if (adapter.status === 'OFFLINE') {
          // Attempt automatic reconnection in the background
          console.log(`[AutomationPollingService] Attempting automatic reconnection for: ${adapter.name}`);
          adapter.connect().catch(() => {});
          continue;
        }

        try {
          const startTime = Date.now();
          const data = await adapter.poll();
          const latencyMs = Date.now() - startTime;

          // Push telemetry results directly to the central HardwareHealthMonitor
          hardwareHealthMonitor.recordPollResult(adapter.id, true, latencyMs);

          // Check if there are water alarms or leak warnings in tank telemetry
          if (data && data.status === 'WATER_ALARM') {
            console.warn(`[AutomationPollingService] WATER ALARM flagged on ATG adapter ${adapter.id}!`);
          }
        } catch (err: any) {
          console.error(`[AutomationPollingService] Poll failed on adapter ${adapter.id}:`, err);
          hardwareHealthMonitor.recordPollResult(adapter.id, false, 0);
          hardwareHealthMonitor.recordStatusChange(adapter.id, 'offline');
        }
      }
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log('[AutomationPollingService] Background polling loop stopped.');
  }
}

export default AutomationPollingService;
