/**
 * OperatorVelocityEngine.ts
 * Telemetry engine profiling attendant speed, correction frequencies,
 * and ledger updating latencies to quantify UI flow friction.
 */

export interface VelocityTelemetrySession {
  sessionId: string;
  operatorId: string;
  shiftId: string;
  startTime: number;
  endTime?: number;
  totalDurationSeconds?: number;
  manualCorrectionsCount: number;
  ledgerUpdateTimesMs: number[];
}

export interface VelocitySummaryMetrics {
  averageShiftDurationMinutes: number;
  totalCorrectionsLogged: number;
  averageLedgerLatencyMs: number;
  overallVelocityIndex: number; // 0 to 100 speed grade index
}

export class OperatorVelocityEngine {
  private static STORAGE_KEY = "PUMPAI_OPERATOR_VELOCITY_TELEMETRY";

  /**
   * Initializes or fetches historical velocity sessions
   */
  public static getAllSessions(): VelocityTelemetrySession[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getMockTelemetrySessions();
    } catch (e) {
      console.error("[VelocityEngine] Failed to parse sessions, fallback to mock", e);
      return this.getMockTelemetrySessions();
    }
  }

  /**
   * Saves sessions back to local storage
   */
  public static saveSessions(sessions: VelocityTelemetrySession[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("[VelocityEngine] LocalStorage save failure", e);
    }
  }

  /**
   * Records a new completed session
   */
  public static logCompletedSession(session: VelocityTelemetrySession): void {
    const sessions = this.getAllSessions();
    sessions.push(session);
    this.saveSessions(sessions);
  }

  /**
   * Computes aggregated efficiency indexes across sessions
   */
  public static calculateAggregatedMetrics(): VelocitySummaryMetrics {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) {
      return {
        averageShiftDurationMinutes: 0,
        totalCorrectionsLogged: 0,
        averageLedgerLatencyMs: 0,
        overallVelocityIndex: 100
      };
    }

    let totalDurationSeconds = 0;
    let totalCorrections = 0;
    let ledgerTimes: number[] = [];
    let completedCount = 0;

    sessions.forEach(s => {
      if (s.totalDurationSeconds) {
        totalDurationSeconds += s.totalDurationSeconds;
        completedCount++;
      }
      totalCorrections += s.manualCorrectionsCount;
      ledgerTimes = [...ledgerTimes, ...s.ledgerUpdateTimesMs];
    });

    const averageShiftDurationMinutes = completedCount > 0 
      ? Number(((totalDurationSeconds / completedCount) / 60).toFixed(2)) 
      : 12.5; // standard shift closure

    const averageLedgerLatencyMs = ledgerTimes.length > 0
      ? Number((ledgerTimes.reduce((a, b) => a + b, 0) / ledgerTimes.length).toFixed(1))
      : 120.4;

    // Velocity Index logic: Starts at 100, penalized by slow shift completions (> 15 mins) and excessive corrections (> 5)
    let overallVelocityIndex = 100;
    
    // Penalize duration (if > 15 minutes average, deduct points)
    if (averageShiftDurationMinutes > 15) {
      overallVelocityIndex -= Math.min(25, (averageShiftDurationMinutes - 15) * 2.5);
    } else {
      // Reward speed
      overallVelocityIndex += Math.min(10, (15 - averageShiftDurationMinutes) * 1.5);
    }

    // Penalize corrections (each correction average deducts 3 points)
    const averageCorrectionsPerSession = totalCorrections / sessions.length;
    overallVelocityIndex -= Math.min(30, averageCorrectionsPerSession * 3);

    // Penalize slow ledger update delay (> 300ms)
    if (averageLedgerLatencyMs > 300) {
      overallVelocityIndex -= Math.min(15, (averageLedgerLatencyMs - 300) * 0.05);
    }

    overallVelocityIndex = Math.max(10, Math.min(100, Math.round(overallVelocityIndex)));

    return {
      averageShiftDurationMinutes,
      totalCorrectionsLogged: totalCorrections,
      averageLedgerLatencyMs,
      overallVelocityIndex
    };
  }

  /**
   * Seed Mock telemetry data if storage is uninitialized
   */
  private static getMockTelemetrySessions(): VelocityTelemetrySession[] {
    return [
      {
        sessionId: "VS-901",
        operatorId: "ATTND-A",
        shiftId: "SHIFT-001",
        startTime: Date.now() - 3600000 * 3,
        endTime: Date.now() - 3600000 * 3 + 820000, // ~13.6 minutes
        totalDurationSeconds: 820,
        manualCorrectionsCount: 3,
        ledgerUpdateTimesMs: [45, 120, 80, 110]
      },
      {
        sessionId: "VS-902",
        operatorId: "ATTND-B",
        shiftId: "SHIFT-002",
        startTime: Date.now() - 3600000 * 2,
        endTime: Date.now() - 3600000 * 2 + 1040000, // ~17.3 minutes
        totalDurationSeconds: 1040,
        manualCorrectionsCount: 6,
        ledgerUpdateTimesMs: [140, 280, 190, 310]
      },
      {
        sessionId: "VS-903",
        operatorId: "ATTND-A",
        shiftId: "SHIFT-003",
        startTime: Date.now() - 3600000,
        endTime: Date.now() - 3600000 + 640000, // ~10.6 minutes
        totalDurationSeconds: 640,
        manualCorrectionsCount: 1,
        ledgerUpdateTimesMs: [35, 75, 42, 60]
      }
    ];
  }
}
