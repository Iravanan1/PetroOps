import { SyncMutation, SyncPayload } from '@petroops/shared-contracts';

export interface LocalSyncConfig {
  stationId: string;
  clientId: string;
  serverUrl: string;
  getLocalQueue: () => Promise<SyncMutation[]>;
  clearLocalQueueIds: (ids: string[]) => Promise<void>;
  markAsConflicted: (id: string, error: string) => Promise<void>;
  getLastSyncTimestamp: () => Promise<string>;
  saveLastSyncTimestamp: (ts: string) => Promise<void>;
}

export class SyncEngineClient {
  constructor(private readonly config: LocalSyncConfig) {}

  /**
   * Synchronises local station database queues with the central PostgreSQL backend.
   * Dispatches local offline mutations, parses cloud responses, and handles conflict fallbacks.
   */
  public async syncWithCloud(): Promise<{ success: boolean; syncCount: number; conflictCount: number }> {
    try {
      const localQueue = await this.config.getLocalQueue();
      if (localQueue.length === 0) {
        return { success: true, syncCount: 0, conflictCount: 0 };
      }

      const lastSyncTimestamp = await this.config.getLastSyncTimestamp();

      const payload: SyncPayload = {
        stationId: this.config.stationId,
        clientId: this.config.clientId,
        lastSyncTimestamp,
        mutationsQueue: localQueue
      };

      // Perform HTTP request to central cloud sync endpoint
      const response = await fetch(`${this.config.serverUrl}/api/v1/sync/delta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Cloud synchronization failed. Status: ${response.status}`);
      }

      const result = await response.json();
      
      const processedIds: string[] = [];
      let conflictCount = 0;

      for (const item of result.processedMutations) {
        if (item.status === 'COMPLETED') {
          processedIds.push(item.id);
        } else if (item.status === 'CONFLICTED') {
          conflictCount++;
          await this.config.markAsConflicted(item.id, item.error || 'Unknown conflict');
        }
      }

      // Clear successfully synchronized rows from local SQLite queue
      if (processedIds.length > 0) {
        await this.config.clearLocalQueueIds(processedIds);
      }

      await this.config.saveLastSyncTimestamp(result.timestamp || new Date().toISOString());

      return {
        success: true,
        syncCount: processedIds.length,
        conflictCount
      };
    } catch (error) {
      console.error('[SyncEngineClient] Synchronization session aborted:', error);
      return { success: false, syncCount: 0, conflictCount: 0 };
    }
  }
}
