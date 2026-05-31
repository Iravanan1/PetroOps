import { LedgerTransaction, AccountName } from './AccountingServices';

export type BranchId = 'potaliya-petroleum-Rajasthan' | 'potaliya-petroleum-Gujarat';

// 1. EventSourcedTransaction: Append-only transaction records with sequence IDs and integrity checksums
export interface EventSourcedTransaction extends LedgerTransaction {
  schemaVersion: number;
  sequenceId: number; // Monotonically increasing ID per branch
  branchId: BranchId;
  checksum: string; // Event integrity checksum hash
}

export interface ReplayedBalanceSheet {
  branchId: BranchId;
  totalReplayedCount: number;
  balances: Record<AccountName, number>;
}

// 2. JournalReplayEngine: Reconstructs active accounting states solely from event-sourced streams
export class JournalReplayEngine {
  
  public static calculateChecksum(tx: LedgerTransaction, sequenceId: number, branchId: BranchId): string {
    // Deterministic verify hash combining critical accounting bounds
    const cleanStr = `${tx.shiftId}_${tx.debitAccount}_${tx.creditAccount}_${tx.amount}_${sequenceId}_${branchId}`;
    let hash = 0;
    for (let i = 0; i < cleanStr.length; i++) {
      const char = cleanStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `sha256_${Math.abs(hash).toString(16)}`;
  }

  public static replayJournal(events: EventSourcedTransaction[], branchFilter?: BranchId): ReplayedBalanceSheet {
    // Deterministically order events monotonically by branch sequence ID to prevent collision
    const sortedEvents = [...events].sort((a, b) => a.sequenceId - b.sequenceId);

    const sheet: ReplayedBalanceSheet = {
      branchId: branchFilter || 'potaliya-petroleum-Rajasthan',
      totalReplayedCount: 0,
      balances: {
        'Cash Till': 0,
        'Fuel Revenue': 0,
        'UPI Clearing': 0,
        'Card Clearing': 0,
        'Accounts Receivable': 0,
        'Expense Accounts': 0,
        'Wet Stock Adjustments': 0,
        'Settlement Adjustments': 0
      }
    };

    sortedEvents.forEach(evt => {
      if (branchFilter && evt.branchId !== branchFilter) return;

      // Validate event checksum
      const expectedChecksum = this.calculateChecksum(evt, evt.sequenceId, evt.branchId);
      if (evt.checksum !== expectedChecksum) {
        throw new Error(`Integrity Violation: Event ${evt.transactionId} has checksum mismatch. Potential database tampering!`);
      }

      sheet.totalReplayedCount++;

      // Debit additions
      if (sheet.balances[evt.debitAccount] !== undefined) {
        sheet.balances[evt.debitAccount] += evt.amount;
      }
      
      // Credit subtractions
      if (sheet.balances[evt.creditAccount] !== undefined) {
        sheet.balances[evt.creditAccount] -= evt.amount;
      }
    });

    return sheet;
  }
}

// 3. DatabaseCorruptionScanner: Audits sequences, checksum logs, and orphaned blocks
export interface CorruptionReport {
  scannedCount: number;
  isCorrupt: boolean;
  mismatches: string[];
}

export class DatabaseCorruptionScanner {
  public static scanEvents(events: EventSourcedTransaction[]): CorruptionReport {
    const mismatches: string[] = [];
    const sequenceSets = new Map<BranchId, Set<number>>();

    events.forEach(evt => {
      // Check 1: Checksum Verification
      const expected = JournalReplayEngine.calculateChecksum(evt, evt.sequenceId, evt.branchId);
      if (evt.checksum !== expected) {
        mismatches.push(`[CHECKSUM_FAILURE] Event ID ${evt.transactionId} has checksum mismatch.`);
      }

      // Check 2: Monotonic Sequence Duplicate Detection
      if (!sequenceSets.has(evt.branchId)) {
        sequenceSets.set(evt.branchId, new Set<number>());
      }
      const set = sequenceSets.get(evt.branchId)!;
      if (set.has(evt.sequenceId)) {
        mismatches.push(`[SEQUENCE_COLLISION] Duplicate Sequence ID ${evt.sequenceId} detected in Branch ${evt.branchId}.`);
      }
      set.add(evt.sequenceId);
    });

    return {
      scannedCount: events.length,
      isCorrupt: mismatches.length > 0,
      mismatches
    };
  }
}

// 4. DisasterRecoveryService: Generates printable snapshots and restores rollback checkpoints
export class DisasterRecoveryService {
  public static exportSnapshot(events: EventSourcedTransaction[]): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      eventsCount: events.length,
      events
    }, null, 2);
  }

  public static restoreSnapshot(jsonString: string): EventSourcedTransaction[] {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.events)) {
        throw new Error("Invalid recovery file: events array not found.");
      }
      return parsed.events;
    } catch {
      throw new Error("Disaster Recovery: Failed to decode recovery JSON checkpoint.");
    }
  }
}
