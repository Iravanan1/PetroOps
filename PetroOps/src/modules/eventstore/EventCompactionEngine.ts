/**
 * EventCompactionEngine.ts
 * Background worker executing event sequence compaction rollups.
 * Merges stale historical time-series logs up to verified points to optimize storage.
 */

import { LedgerEvent, EventStoreEngine } from "./EventStoreEngine";
import { EventPartitionEngine } from "./EventPartitionEngine";

export interface CompactionLog {
  compactionId: string;
  tenantId: string;
  compactedUpToSequence: number;
  finalCompactBalance: number;
  eventsRemovedCount: number;
  timestamp: number;
  operatorId: string;
}

export class EventCompactionEngine {
  private static STORAGE_KEY_COMPACTIONS = "pumpai_event_compactions";

  /**
   * Loads historical event compaction logs
   */
  public static getCompactions(): CompactionLog[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_COMPACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load timeline compaction logs", e);
      return [];
    }
  }

  /**
   * Compacts tenant partitioned event history.
   * Merges all transaction events preceding target sequence into a single cumulative balance snapshot.
   */
  public static compactTenantEvents(
    tenantId: string,
    upToSequenceId: number,
    operatorId: string
  ): CompactionLog {
    const allEvents = EventPartitionEngine.getPartitionedEvents(tenantId);
    
    // Sort chronological
    const sorted = [...allEvents].sort((a, b) => a.sequenceId - b.sequenceId);
    
    // Separate events into compactable vs remaining
    const toCompact = sorted.filter((e) => e.sequenceId <= upToSequenceId);
    const remaining = sorted.filter((e) => e.sequenceId > upToSequenceId);

    if (toCompact.length === 0) {
      throw new Error(`Compaction Rejected: No events found up to sequenceId ${upToSequenceId}.`);
    }

    // 1. Calculate cumulative compacted outcomes
    let compactedBalance = 0;
    toCompact.forEach((evt) => {
      const payload = evt.payload;
      if (evt.eventType === "TRANSACTION_CREATED" || evt.eventType === "NOZZLE_TEST_COMMITTED") {
        if (payload.type === "DEBIT") {
          compactedBalance += payload.amount;
        } else {
          compactedBalance -= payload.amount;
        }
      } else if (evt.eventType === "TRANSACTION_VOIDED") {
        if (payload.type === "DEBIT") {
          compactedBalance -= payload.amount;
        } else {
          compactedBalance += payload.amount;
        }
      }
    });

    // 2. Build new compacted boundary starting event (Genesis seed)
    const compactionId = `CMP-${tenantId}-${Date.now()}`;
    const boundaryEvent: LedgerEvent = {
      eventId: `EVT-COMPACTED-${Date.now()}`,
      timestamp: Date.now(),
      eventType: "PERIOD_CLOSED", // Marks period as finalized & compacted
      payload: {
        description: `Compaction summary rollup up to seq #${upToSequenceId}`,
        compactedUpToSequence: upToSequenceId,
        amount: Number(Math.abs(compactedBalance).toFixed(2)),
        type: compactedBalance >= 0 ? "DEBIT" : "CREDIT",
        schemaVer: 2
      },
      userSignature: operatorId,
      sequenceId: upToSequenceId, // Anchor sequence point
      checksum: "COMPACTION-ROLLUP-VERIFIED"
    };

    // 3. Assemble new partition chain (compacted node + remaining events)
    const newPartitionList = [boundaryEvent, ...remaining];
    localStorage.setItem(
      `pumpai_partition_${tenantId}`,
      JSON.stringify(newPartitionList)
    );

    // 4. Commit compaction event log
    const logs = this.getCompactions();
    const newLog: CompactionLog = {
      compactionId,
      tenantId,
      compactedUpToSequence: upToSequenceId,
      finalCompactBalance: Number(compactedBalance.toFixed(2)),
      eventsRemovedCount: toCompact.length,
      timestamp: Date.now(),
      operatorId
    };

    logs.push(newLog);
    localStorage.setItem(this.STORAGE_KEY_COMPACTIONS, JSON.stringify(logs));

    return newLog;
  }
}
