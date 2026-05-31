import { SnapshotCompactionEngine } from './SnapshotCompactionEngine';
import { ReplayPruningEngine } from './ReplayPruningEngine';
import { LedgerArchiveService } from './LedgerArchiveService';
import { ReplayState } from '../CoreReplayEngine';

export class LongTermRetentionManager {
  
  /**
   * Executes the complete daily/monthly retention and storage optimization cycle.
   */
  public static executeMaintenanceCycle(
    branchId: string, 
    currentEventsCount: number,
    activeState: ReplayState
  ): void {
    console.log(`[RetentionManager] Beginning storage maintenance cycle for branch ${branchId}`);

    // 1. Snapshot generation
    const snapshotId = `snap_${Date.now()}`;
    SnapshotCompactionEngine.generateCompactedSnapshot(branchId, snapshotId, activeState, currentEventsCount);

    // 2. Local Pruning
    const prunedCount = ReplayPruningEngine.pruneSafely(branchId, snapshotId, currentEventsCount);

    // 3. Cold Archive if threshold met
    if (prunedCount > 5000) {
      LedgerArchiveService.packageArchive(branchId, "current_month", prunedCount);
    }

    console.log(`[RetentionManager] Maintenance cycle complete. Hot storage optimal.`);
  }
}
