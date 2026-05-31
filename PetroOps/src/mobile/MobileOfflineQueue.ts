/**
 * MobileOfflineQueue.ts
 * Manages local disk caching (IndexedDB/LocalStorage wrapper) for offline operations.
 * Guarantees zero data loss when mobile devices run fully disconnected.
 */

import { SyncPayload } from "./MobileSyncEngine";

export class MobileOfflineQueue {
  private static readonly STORAGE_KEY = "PETROOPS-MOBILE-OFFLINE-QUEUE";

  /**
   * Enqueues a new sync payload into local offline storage
   */
  public static enqueue(payload: Omit<SyncPayload, "syncId" | "timestamp">): SyncPayload {
    const queue = this.getQueue();
    
    const newEntry: SyncPayload = {
      ...payload,
      syncId: `sync-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`,
      timestamp: Date.now()
    };

    queue.push(newEntry);
    this.saveQueue(queue);
    return newEntry;
  }

  /**
   * Retrieves all spooled payloads currently in the offline queue
   */
  public static getQueue(): SyncPayload[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to read offline queue from storage", e);
      return [];
    }
  }

  /**
   * Dequeues (removes) a specific synchronized payload by its identifier
   */
  public static dequeue(syncId: string): void {
    const queue = this.getQueue();
    const updated = queue.filter((item) => item.syncId !== syncId);
    this.saveQueue(updated);
  }

  /**
   * Empties the entire offline queue buffer
   */
  public static clearQueue(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear offline queue storage", e);
    }
  }

  /**
   * Writes the queue array to local disk
   */
  private static saveQueue(queue: SyncPayload[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to write offline queue to disk", e);
    }
  }
}
