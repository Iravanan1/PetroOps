/**
 * MobileSyncEngine.ts
 * Manages background synchronization loops and collision resolution protocols
 * for intermittent cellular network environments.
 */

export interface SyncPayload {
  syncId: string;
  timestamp: number;
  dataPayload: Record<string, any>;
  sequenceNumber: number;
  operationType: "CREATE_SHIFT" | "CLOSE_SHIFT" | "SUBMIT_NOZZLE_TOTALIZER" | "RECORD_EXPENSE";
}

export interface SyncStatus {
  lastSuccessfulSyncTimestamp: number;
  unsyncedQueueCount: number;
  networkState: "ONLINE" | "OFFLINE" | "POOR_CONNECTION";
}

export class MobileSyncEngine {
  /**
   * Evaluates synchronization status and processes delta synch loops
   */
  public static async executeSyncLoop(
    queue: SyncPayload[],
    serverSequence: number,
    onSuccess: (syncId: string) => Promise<void>,
    onCollision: (local: SyncPayload, serverSeq: number) => SyncPayload
  ): Promise<{ syncedCount: number; collisionsResolved: number }> {
    let syncedCount = 0;
    let collisionsResolved = 0;

    for (const item of queue) {
      try {
        // 1. Conflict checking: verify sequence number continuity
        if (item.sequenceNumber <= serverSequence) {
          // Collision: local operation has an obsolete sequence marker
          console.warn(`⚠️ Sync collision detected! Local item seq ${item.sequenceNumber} <= Server sequence ${serverSequence}`);
          const resolvedItem = onCollision(item, serverSequence);
          await onSuccess(resolvedItem.syncId);
          collisionsResolved++;
          syncedCount++;
        } else {
          // Success route
          await onSuccess(item.syncId);
          syncedCount++;
        }
      } catch (err) {
        console.error(`Failed to synchronize payload item: ${item.syncId}`, err);
        // Halt queue processing to preserve chronological sequence
        break;
      }
    }

    return {
      syncedCount,
      collisionsResolved
    };
  }

  /**
   * Standard conflict resolution strategy: last-write-wins (LWW) based on timestamp
   */
  public static resolveConflictLWW(
    localPayload: SyncPayload,
    serverPayload: { timestamp: number; dataPayload: Record<string, any> }
  ): SyncPayload {
    if (localPayload.timestamp >= serverPayload.timestamp) {
      // Keep local
      return localPayload;
    } else {
      // Revert local to match server values
      return {
        ...localPayload,
        dataPayload: serverPayload.dataPayload,
        timestamp: serverPayload.timestamp
      };
    }
  }
}
