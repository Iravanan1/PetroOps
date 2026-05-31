/**
 * LiveWorkflowReplayEngine.ts
 * Stream replay controller validating chronological carry-forward continuity.
 */

export interface ReplayShiftRecord {
  shiftId: string;
  date: string;
  shiftNumber: number;
  attendantId: string;
  openingCash: number;
  closingCash: number;
  nozzleSalesVolume: number;
  revenueGenerated: number;
  totalExpenses: number;
}

export interface ReplayVerificationReport {
  shiftId: string;
  passed: boolean;
  expectedCarryForward: number;
  actualCarryForward: number;
  deviation: number;
  timestamp: string;
}

export class LiveWorkflowReplayEngine {
  /**
   * Replays a list of chronological shifts sequentially and validates carry-forward cash ledgers.
   */
  public static replayAndVerifyChain(shifts: ReplayShiftRecord[]): ReplayVerificationReport[] {
    const reports: ReplayVerificationReport[] = [];
    
    // Sort chronologically by date and shift number
    const sortedShifts = [...shifts].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.shiftNumber - b.shiftNumber;
    });

    for (let i = 0; i < sortedShifts.length; i++) {
      const current = sortedShifts[i];
      
      if (i === 0) {
        // Initial anchor shift is assumed valid
        reports.push({
          shiftId: current.shiftId,
          passed: true,
          expectedCarryForward: current.openingCash,
          actualCarryForward: current.openingCash,
          deviation: 0,
          timestamp: new Date().toISOString()
        });
        continue;
      }

      const previous = sortedShifts[i - 1];
      
      // The expected opening cash of the current shift must exactly equal the closing cash of the previous shift
      const expectedCarry = previous.closingCash;
      const actualCarry = current.openingCash;
      const deviation = actualCarry - expectedCarry;
      const passed = Math.abs(deviation) === 0;

      reports.push({
        shiftId: current.shiftId,
        passed,
        expectedCarryForward: expectedCarry,
        actualCarryForward: actualCarry,
        deviation: Number(deviation.toFixed(2)),
        timestamp: new Date().toISOString()
      });
      
      console.log(`[ReplayEngine] Replayed shift ${current.shiftId}. Continuity passed: ${passed}`);
    }

    return reports;
  }
}
