import { OfflineRecoveryEngine, QueuedSyncEvent } from '../../shared/OfflineRecoveryEngine';

export interface SyncItem {
  id: string;
  type: "ocr_ingest" | "shift_log" | "cash_sheet" | "dip_record";
  payload: any;
  timestamp: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "completed";
  idempotencyKey: string;
  errorMessage?: string;
}

export interface SyncTelemetry {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  completedItems: number;
  lastSyncTimestamp: number | null;
  networkOnline: boolean;
}

export class OfflineBranchSyncEngine {
  private static PROCESS_LOCK = "pumpai_sync_process_lock";

  public static generateIdempotencyKey(type: string, data: any): string {
    const serialized = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `idempotent_${type}_${Math.abs(hash)}_${Date.now()}`;
  }

  private static mapEventToSyncItem(evt: QueuedSyncEvent): SyncItem {
    let mappedType: SyncItem['type'] = 'shift_log';
    if (evt.type === 'ocr_correction') mappedType = 'ocr_ingest';
    else if (evt.type === 'nozzle_update') mappedType = 'dip_record';
    else if (evt.type === 'shift_entry') mappedType = 'shift_log';

    return {
      id: evt.id,
      type: mappedType,
      payload: evt.payload,
      timestamp: new Date(evt.queuedAt).getTime(),
      retryCount: evt.attempts,
      status: evt.attempts > 0 ? (evt.errorLog ? 'failed' : 'pending') : 'pending',
      idempotencyKey: evt.id,
      errorMessage: evt.errorLog
    };
  }

  public static enqueue(
    type: "ocr_ingest" | "shift_log" | "cash_sheet" | "dip_record",
    payload: any
  ): SyncItem {
    const engine = OfflineRecoveryEngine.getInstance();
    
    // Map type
    let mappedType: QueuedSyncEvent['type'] = 'shift_entry';
    if (type === 'ocr_ingest') mappedType = 'ocr_correction';
    else if (type === 'dip_record') mappedType = 'nozzle_update';

    // Extract branchId or default
    const branchId = payload?.branchId || 'delhi_site_1';

    const eventId = engine.enqueue(mappedType, payload, branchId);
    
    return {
      id: eventId,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: "pending",
      idempotencyKey: eventId,
    };
  }

  public static getQueue(): SyncItem[] {
    const engine = OfflineRecoveryEngine.getInstance();
    return engine.getQueue().map(evt => this.mapEventToSyncItem(evt));
  }

  public static getTelemetry(): SyncTelemetry {
    const engine = OfflineRecoveryEngine.getInstance();
    const queue = engine.getQueue();
    const pending = queue.length;
    const lastSyncTime = localStorage.getItem("pumpai_last_sync_time");

    return {
      totalItems: pending,
      pendingItems: pending,
      failedItems: queue.filter(q => q.attempts > 0).length,
      completedItems: 0,
      lastSyncTimestamp: lastSyncTime ? Number(lastSyncTime) : null,
      networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  public static async triggerSync(): Promise<void> {
    OfflineRecoveryEngine.getInstance().triggerImmediateSync();
  }

  public static purgeCompleted(): void {
    // Intentionally no-op: Unified engine purges successfully synced events automatically.
  }
}
