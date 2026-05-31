/**
 * PeriodMutationBlocker.ts
 * Automated lock detector that checks operations against localized sealed fiscal calendar bounds.
 * Restricts client actions targeting closed accounting periods.
 */

export interface FiscalPeriod {
  periodId: string; // e.g. "FP-2026-M05"
  startDate: number; // Start epoch timestamp
  endDate: number;   // End epoch timestamp
  isClosed: boolean;
  closedAt?: number;
  closedBy?: string;
  auditorSignature?: string; // Authorized auditor's signature for sealed assurance
}

export class PeriodMutationBlocker {
  private static STORAGE_KEY_PERIODS = "pumpai_locked_periods";

  // Default seeded closed periods for demonstration safety
  private static DEFAULT_PERIODS: FiscalPeriod[] = [
    {
      periodId: "FP-2026-M04",
      startDate: 1776510000000, // April 1, 2026
      endDate: 1779100000000,   // April 30, 2026
      isClosed: true,
      closedAt: 1779180000000,
      closedBy: "AUDITOR-99",
      auditorSignature: "SIG-C7D9E0A1B2C3D4E5F6A7B8C9D0E"
    }
  ];

  /**
   * Loads all historical fiscal periods configurations from local storage
   */
  public static getFiscalPeriods(): FiscalPeriod[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_PERIODS);
      if (!data) {
        localStorage.setItem(this.STORAGE_KEY_PERIODS, JSON.stringify(this.DEFAULT_PERIODS));
        return this.DEFAULT_PERIODS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load historical fiscal period bounds", e);
      return this.DEFAULT_PERIODS;
    }
  }

  /**
   * Checks if a specific epoch timestamp falls within any closed fiscal period
   */
  public static isTimestampLocked(timestamp: number): { isLocked: boolean; period?: FiscalPeriod } {
    const periods = this.getFiscalPeriods();
    
    const lockedPeriod = periods.find(
      (p) => p.isClosed && timestamp >= p.startDate && timestamp <= p.endDate
    );

    if (lockedPeriod) {
      return { isLocked: true, period: lockedPeriod };
    }

    return { isLocked: false };
  }

  /**
   * Lock a calendar period securely
   */
  public static lockPeriod(
    periodId: string,
    startDate: number,
    endDate: number,
    operatorId: string,
    signature?: string
  ): void {
    const periods = this.getFiscalPeriods();
    const existingIndex = periods.findIndex((p) => p.periodId === periodId);

    const newPeriod: FiscalPeriod = {
      periodId,
      startDate,
      endDate,
      isClosed: true,
      closedAt: Date.now(),
      closedBy: operatorId,
      auditorSignature: signature
    };

    if (existingIndex >= 0) {
      periods[existingIndex] = newPeriod;
    } else {
      periods.push(newPeriod);
    }

    localStorage.setItem(this.STORAGE_KEY_PERIODS, JSON.stringify(periods));
  }

  /**
   * Safe unlocking function representing double auditor authorization credentials check
   */
  public static unlockPeriodWithAuthorization(
    periodId: string,
    auditorCreds: { auditorId: string; securityKey: string }
  ): boolean {
    // Audit credentials validation
    if (!auditorCreds.auditorId || auditorCreds.securityKey !== "AUDIT-SECURE-KEY-2026") {
      throw new Error("Authorization Rejected: Invalid auditor credentials or invalid cryptographic key.");
    }

    const periods = this.getFiscalPeriods();
    const target = periods.find((p) => p.periodId === periodId);

    if (!target) {
      throw new Error(`Period identifier ${periodId} is not registered.`);
    }

    target.isClosed = false;
    localStorage.setItem(this.STORAGE_KEY_PERIODS, JSON.stringify(periods));
    return true;
  }
}
