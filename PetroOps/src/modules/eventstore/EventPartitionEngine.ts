/**
 * EventPartitionEngine.ts
 * Multi-tenant data router segmenting global event sequences into branch-isolated partitions.
 * Mitigates scalability degradation across large multi-station operations.
 */

import { LedgerEvent, EventStoreEngine } from "./EventStoreEngine";

export class EventPartitionEngine {
  private static STORAGE_KEY_PREFIX = "pumpai_partition_";

  /**
   * Helper returning local storage keys for specific partition nodes
   */
  private static getPartitionKey(tenantId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${tenantId}`;
  }

  /**
   * Appends an event directly to a tenant-specific isolated event partition log
   */
  public static appendPartitionedEvent<T = any>(
    tenantId: string,
    eventType: LedgerEvent["eventType"],
    payload: T,
    userSignature: string
  ): LedgerEvent<T> {
    // 1. Commit globally first for master tracking sequence
    const masterEvent = EventStoreEngine.appendEvent(eventType, { ...payload, tenantId }, userSignature);

    // 2. Commit to tenant isolated partition list
    const partitionKey = this.getPartitionKey(tenantId);
    let partitionList: LedgerEvent[] = [];

    try {
      const data = localStorage.getItem(partitionKey);
      partitionList = data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Failed to load isolated partition registry for tenant ${tenantId}`, e);
    }

    partitionList.push(masterEvent);
    localStorage.setItem(partitionKey, JSON.stringify(partitionList));

    return masterEvent;
  }

  /**
   * Loads isolated event entries belonging exclusively to a tenant partition
   */
  public static getPartitionedEvents(tenantId: string): LedgerEvent[] {
    const partitionKey = this.getPartitionKey(tenantId);
    try {
      const data = localStorage.getItem(partitionKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Failed to load partitioned data logs for tenant ${tenantId}`, e);
      return [];
    }
  }

  /**
   * Compiles diagnostic health metrics across all active tenant partition buckets
   */
  public static getPartitionDiagnostics(): Record<string, { sizeBytes: number; eventCount: number }> {
    const diagnostics: Record<string, { sizeBytes: number; eventCount: number }> = {};
    
    // Scan localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        const tenantId = key.substring(this.STORAGE_KEY_PREFIX.length);
        const rawContent = localStorage.getItem(key) || "";
        const parsedList = JSON.parse(rawContent) as any[];

        diagnostics[tenantId] = {
          sizeBytes: rawContent.length,
          eventCount: parsedList.length
        };
      }
    }

    return diagnostics;
  }
}
