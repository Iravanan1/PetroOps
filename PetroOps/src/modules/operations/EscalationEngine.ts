/**
 * EscalationEngine.ts
 * ───────────────────
 * Analyzes operational telemetry to generate alerts and route escalations.
 * Prevents alert spam by prioritizing critical business issues.
 */

export interface SystemAlarm {
  id: string;
  station: string;
  source: 'WETSTOCK' | 'OPERATIONS' | 'FINANCE' | 'SYNC';
  message: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  triggeredAt: string;
  isEscalated: boolean;
}

export class EscalationEngine {
  /**
   * Evaluates telemetry to generate operational alarms
   */
  public static analyzeTelemetry(params: {
    station: string;
    offlineHours: number;
    wetstockVariance: number;
    consecutiveShortages: number;
    settlementMismatchesCount: number;
  }): SystemAlarm[] {
    const alarms: SystemAlarm[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 1. Sync Timeout check
    if (params.offlineHours > 12) {
      alarms.push({
        id: `alm-syn-${Date.now().toString().slice(-3)}`,
        station: params.station,
        source: 'SYNC',
        message: `Station offline duration is ${params.offlineHours} hours (Max timed-sync tolerance: 4 hrs).`,
        priority: 'CRITICAL',
        triggeredAt: timestamp,
        isEscalated: true
      });
    } else if (params.offlineHours > 4) {
      alarms.push({
        id: `alm-syn-${Date.now().toString().slice(-3)}`,
        station: params.station,
        source: 'SYNC',
        message: `Station offline transit detected (${params.offlineHours} hours).`,
        priority: 'HIGH',
        triggeredAt: timestamp,
        isEscalated: false
      });
    }

    // 2. Wetstock Leak check
    if (Math.abs(params.wetstockVariance) > 0.8) {
      alarms.push({
        id: `alm-wet-${Date.now().toString().slice(-3)}`,
        station: params.station,
        source: 'WETSTOCK',
        message: `Physical stocks shrinkage variance is at ${params.wetstockVariance}% (evaporation threshold exceeded).`,
        priority: 'CRITICAL',
        triggeredAt: timestamp,
        isEscalated: true
      });
    }

    // 3. Repeated Attendant shortfalls check
    if (params.consecutiveShortages >= 3) {
      alarms.push({
        id: `alm-ops-${Date.now().toString().slice(-3)}`,
        station: params.station,
        source: 'OPERATIONS',
        message: `Attendant cashier logged consecutive cash shortages for ${params.consecutiveShortages} shifts.`,
        priority: 'HIGH',
        triggeredAt: timestamp,
        isEscalated: true
      });
    }

    // 4. Repeated Settlement mismatched deposits check
    if (params.settlementMismatchesCount >= 4) {
      alarms.push({
        id: `alm-fin-${Date.now().toString().slice(-3)}`,
        station: params.station,
        source: 'FINANCE',
        message: `UPI credit gateway deposits match ledger matches consecutive failures: ${params.settlementMismatchesCount}.`,
        priority: 'HIGH',
        triggeredAt: timestamp,
        isEscalated: true
      });
    }

    return alarms;
  }

  /**
   * Generates mock active alarms for control dashboard
   */
  public static getMockAlarms(): SystemAlarm[] {
    return [
      { id: 'alm-101', station: 'Pune Highway Potaliya', source: 'SYNC', message: 'Station offline duration is 18.5 hours (Max timed-sync tolerance: 4 hrs).', priority: 'CRITICAL', triggeredAt: '2026-05-23 04:12', isEscalated: true },
      { id: 'alm-102', station: 'Mumbai Terminal Branch', source: 'WETSTOCK', message: 'Physical stocks shrinkage variance is at -0.92% (evaporation threshold exceeded).', priority: 'CRITICAL', triggeredAt: '2026-05-23 06:45', isEscalated: true },
      { id: 'alm-103', station: 'Delhi Central Pump', source: 'OPERATIONS', message: 'Attendant cashier logged consecutive cash shortages for 3 shifts.', priority: 'HIGH', triggeredAt: '2026-05-23 08:30', isEscalated: false }
    ];
  }
}
