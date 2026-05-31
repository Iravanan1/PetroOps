import { LedgerTransaction, ReconciliationStatus } from './AccountingServices';
import { ShiftRecord } from '../hooks/useReconciledShifts';

// 1. Idempotency Service: Manages transaction-level UUID and replay protection hashes
export interface DeduplicatedTransaction extends LedgerTransaction {
  deduplicationHash: string;
  sourceReference: string;
}

export class IdempotencyService {
  private static registeredHashes = new Set<string>();

  public static generateHash(tx: LedgerTransaction): string {
    // Generate deterministic replay-proof hash based on critical values
    return `${tx.shiftId}_${tx.debitAccount}_${tx.creditAccount}_${tx.amount}_${tx.timestamp}`;
  }

  public static registerAndValidate(tx: LedgerTransaction, sourceReference = "Vite Client Ingestion"): DeduplicatedTransaction {
    const hash = this.generateHash(tx);
    
    if (this.registeredHashes.has(hash)) {
      throw new Error(`Idempotency Replay Violation: Duplicate transaction block detected for hash ${hash}`);
    }

    this.registeredHashes.add(hash);

    return {
      ...tx,
      deduplicationHash: hash,
      sourceReference
    };
  }

  public static clearRegistry() {
    this.registeredHashes.clear();
  }
}

// 2. Conflict Resolution Service: Manages version checks for offline optimistic commits
export interface VersionedShift extends ShiftRecord {
  version: number;
  lastUpdatedBy: string;
}

export class ConflictResolverService {
  public static reconcileOfflineSync(local: VersionedShift, server: VersionedShift): VersionedShift {
    // Concurrency Check: If local version is stale, trigger manual merge
    if (local.version < server.version) {
      console.warn(`Optimistic Concurrency Collision: Stale offline update for Shift ${local.id}. Merging server-side values.`);
      // Merge values safely: server values win, but append conflict note inside audit logs
      const mergedAudit = [...(server.auditHistory || [])];
      mergedAudit.push({
        editor: "SYSTEM_MERGE",
        timestamp: new Date().toISOString(),
        previousValues: {
          note: `Conflict collision: Local (v${local.version}) merged with Server (v${server.version})`,
          staleLocalCash: local.actualCash
        }
      });

      return {
        ...server,
        auditHistory: mergedAudit,
        version: server.version + 1
      };
    }

    // Server is behind or same version, safely advance version
    return {
      ...local,
      version: local.version + 1
    };
  }
}

// 3. Period Closing Service: Freezes summaries daily/monthly/yearly to block retroactive recalculations
export interface ClosedPeriod {
  periodKey: string; // e.g. "2026-05"
  closedAt: string;
  closedBy: string;
  totalRevenue: number;
}

export class PeriodClosingService {
  private static closedPeriods = new Set<string>();

  public static closePeriod(periodKey: string, closedBy: string, totalRevenue: number): ClosedPeriod {
    this.closedPeriods.add(periodKey);
    return {
      periodKey,
      closedAt: new Date().toISOString(),
      closedBy,
      totalRevenue
    };
  }

  public static assertPeriodOpen(dateString: string) {
    const dailyKey = dateString.substring(0, 10); // "YYYY-MM-DD"
    const monthlyKey = dateString.substring(0, 7); // "YYYY-MM"
    const yearlyKey = dateString.substring(0, 4);  // "YYYY"

    if (this.closedPeriods.has(dailyKey) || this.closedPeriods.has(monthlyKey) || this.closedPeriods.has(yearlyKey)) {
      throw new Error(`Retroactive Audit Corruption: The financial period including ${dateString} is CLOSED & LOCKED.`);
    }
  }

  public static clearClosedPeriods() {
    this.closedPeriods.clear();
  }
}

// 4. Disaster Recovery Service: Exports recovery JSON rollback points
export interface RecoveryCheckpoint {
  checkpointId: string;
  timestamp: string;
  shifts: ShiftRecord[];
}

export class DisasterRecoveryService {
  public static createCheckpoint(shifts: ShiftRecord[]): RecoveryCheckpoint {
    return {
      checkpointId: `chk_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      shifts: JSON.parse(JSON.stringify(shifts)) // Deep copy
    };
  }

  public static rollbackToCheckpoint(checkpoint: RecoveryCheckpoint): ShiftRecord[] {
    console.warn(`Disaster Recovery Action: Rolling back registers to checkpoint ${checkpoint.checkpointId}`);
    return checkpoint.shifts;
  }
}

// 5. Continuous Integrity Monitoring Engine
export interface IntegrityAlert {
  type: 'BALANCE_MISMATCH' | 'ORPHANED_TRANSACTION' | 'INVALID_LIFECYCLE' | 'AUDIT_CORRUPTION';
  description: string;
  severity: 'CRITICAL' | 'WARNING';
}

export class IntegrityMonitorService {
  public static runContinuousAudit(shifts: ShiftRecord[], txs: LedgerTransaction[]): IntegrityAlert[] {
    const alerts: IntegrityAlert[] = [];

    // Rule A: Balance Mismatch check (Ledger transactions balance should equal shift aggregations)
    shifts.forEach(s => {
      const shiftTxs = txs.filter(t => t.shiftId === s.id);
      const expectedNonCash = s.cardSales + s.upiSales + s.creditSales;
      
      const ledgerNonCash = shiftTxs
        .filter(t => t.debitAccount === 'Card Clearing' || t.debitAccount === 'UPI Clearing' || t.debitAccount === 'Accounts Receivable')
        .reduce((sum, t) => sum + t.amount, 0);

      if (expectedNonCash !== ledgerNonCash) {
        alerts.push({
          type: 'BALANCE_MISMATCH',
          description: `Shift ${s.shiftLabel} aggregates (INR ${expectedNonCash}) do not match double-entry ledger journals (INR ${ledgerNonCash}).`,
          severity: 'CRITICAL'
        });
      }

      // Rule B: Invalid lifecycle transitions (e.g. Locked shifts marked as NEEDS_REVIEW)
      if (s.status === 'LOCKED' && s.aiConfidence < 50) {
        alerts.push({
          type: 'INVALID_LIFECYCLE',
          description: `Shift ${s.shiftLabel} is marked as LOCKED but has critically low AI confidence telemetry.`,
          severity: 'WARNING'
        });
      }
    });

    return alerts;
  }
}
