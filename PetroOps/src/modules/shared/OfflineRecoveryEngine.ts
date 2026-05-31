/**
 * OfflineRecoveryEngine.ts
 * Resilient Sync Controller & Parallel Thread Queue Sync Manager
 * Handles sudden on-site network infrastructure failures with replay-safe rollback recovery.
 */

import { 
  enqueueLocal, 
  getAllQueuedLocal, 
  removeFromQueue, 
  dbPut,
  STORES
} from './LocalDatabaseEngine';

export interface QueuedSyncEvent {
  id: string;
  type: 
    | 'shift_entry' 
    | 'nozzle_update' 
    | 'credit_recovery' 
    | 'manager_override' 
    | 'ocr_correction'
    | 'ocr_ingest'
    | 'shift_log'
    | 'cash_sheet'
    | 'dip_record'
    | 'settlement_submission'
    | 'review_action';
  payload: Record<string, any>;
  branchId: string;
  queuedAt: string;
  attempts: number;
  lastAttemptAt?: string;
  errorLog?: string;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  pendingCount: number;
  isFlushing: boolean;
  consecutiveFailures: number;
  nextRetryDelayMs: number;
}

export type StatusListener = (status: SyncEngineStatus) => void;

export class OfflineRecoveryEngine {
  private static STORAGE_KEY = 'offline_edit_queue';
  private static METRICS_KEY = 'pumpai_offline_sync_telemetry_metrics';
  private static PROCESSED_IDS_KEY = 'pumpai_processed_sync_ids';

  private static instance: OfflineRecoveryEngine;
  private listeners: Set<StatusListener> = new Set();
  
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isFlushing = false;
  private consecutiveFailures = 0;
  private nextRetryDelayMs = 1500; // Base delay: 1.5s
  private maxRetryDelayMs = 60000;  // Cap delay: 60s
  private syncTimeoutId: any = null;
  private handleOnlineRef: (() => void) | null = null;
  private handleOfflineRef: (() => void) | null = null;
  private queueCache: QueuedSyncEvent[] = [];
  private processedTxIds: Set<string> = new Set();
  private isDisposed = false;

  private constructor() {
    this.setupNetworkSensing();
    this.loadProcessedIds();
    const isTest = typeof global !== 'undefined' && (global as any).__PUMPAI_INTEGRITY_TEST__;
    this.initializeQueueFromDB().then(() => {
      if (this.isDisposed) return;
      if (!isTest) {
        this.scheduleBackgroundSyncLoop();
      }
    });
  }

  public static getInstance(): OfflineRecoveryEngine {
    if (!OfflineRecoveryEngine.instance) {
      OfflineRecoveryEngine.instance = new OfflineRecoveryEngine();
    }
    return OfflineRecoveryEngine.instance;
  }

  public dispose() {
    this.isDisposed = true;
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      if (this.handleOnlineRef) {
        window.removeEventListener('online', this.handleOnlineRef);
        this.handleOnlineRef = null;
      }
      if (this.handleOfflineRef) {
        window.removeEventListener('offline', this.handleOfflineRef);
        this.handleOfflineRef = null;
      }
    }
  }

  public static resetInstance() {
    if (OfflineRecoveryEngine.instance) {
      OfflineRecoveryEngine.instance.dispose();
      OfflineRecoveryEngine.instance = undefined as any;
    }
  }

  /**
   * Loads processed transaction IDs from localStorage to maintain duplicate prevention across refreshes
   */
  private loadProcessedIds() {
    try {
      const raw = localStorage.getItem(OfflineRecoveryEngine.PROCESSED_IDS_KEY);
      this.processedTxIds = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      this.processedTxIds = new Set();
    }
  }

  /**
   * Saves processed transaction IDs to localStorage
   */
  private saveProcessedIds() {
    try {
      localStorage.setItem(
        OfflineRecoveryEngine.PROCESSED_IDS_KEY,
        JSON.stringify(Array.from(this.processedTxIds))
      );
    } catch {}
  }

  /**
   * Initializes cache from IndexedDB
   */
  private async initializeQueueFromDB() {
    try {
      const dbQueue = await getAllQueuedLocal();
      if (this.isDisposed) return;
      this.queueCache = (dbQueue as unknown as QueuedSyncEvent[]) || [];
      this.triggerStatusUpdate();
      console.log(`[OfflineRecoveryEngine] Loaded ${this.queueCache.length} queued events from IndexedDB.`);
    } catch (err) {
      if (this.isDisposed) return;
      console.error('[OfflineRecoveryEngine] IndexedDB load failed, falling back to localStorage:', err);
      try {
        const raw = localStorage.getItem(OfflineRecoveryEngine.STORAGE_KEY);
        this.queueCache = raw ? JSON.parse(raw) : [];
      } catch {
        this.queueCache = [];
      }
    }
  }

  /**
   * Automatically senses network changes
   */
  private setupNetworkSensing() {
    if (typeof window === 'undefined') return;

    this.handleOnlineRef = () => {
      console.log('[OfflineRecoveryEngine] Network connection established. Initiating auto-flush loop.');
      this.isOnline = true;
      this.consecutiveFailures = 0;
      this.nextRetryDelayMs = 1500;
      this.triggerStatusUpdate();
      this.triggerImmediateSync();
    };

    this.handleOfflineRef = () => {
      console.warn('[OfflineRecoveryEngine] Network connection lost. Buffering local transactions.');
      this.isOnline = false;
      this.triggerStatusUpdate();
    };

    window.addEventListener('online', this.handleOnlineRef);
    window.addEventListener('offline', this.handleOfflineRef);
  }

  /**
   * Schedules the continuous background check loop
   */
  private scheduleBackgroundSyncLoop() {
    if (this.isDisposed) return;
    if (typeof global !== 'undefined' && (global as any).__PUMPAI_INTEGRITY_TEST__) {
      console.log('[OfflineRecoveryEngine] Background sync loop disabled for verification run.');
      return;
    }
    if (this.syncTimeoutId) clearTimeout(this.syncTimeoutId);

    const runSync = async () => {
      if (this.isDisposed) return;
      if (this.isOnline && !this.isFlushing) {
        if (this.queueCache.length > 0) {
          await this.flushQueue();
        }
      }
      if (this.isDisposed) return;
      // Reschedule sync loop checking
      const delay = this.isOnline && this.queueCache.length > 0 ? this.nextRetryDelayMs : 10000;
      this.syncTimeoutId = setTimeout(runSync, delay);
    };

    this.syncTimeoutId = setTimeout(runSync, 5000);
  }

  /**
   * Force an immediate sync execution
   */
  public triggerImmediateSync() {
    if (this.isDisposed) return;
    if (this.syncTimeoutId) clearTimeout(this.syncTimeoutId);
    const isTest = typeof global !== 'undefined' && (global as any).__PUMPAI_INTEGRITY_TEST__;
    this.flushQueue().then(() => {
      if (this.isDisposed) return;
      if (!isTest) {
        this.scheduleBackgroundSyncLoop();
      }
    });
  }

  /**
   * Enqueues a transaction payload to IndexedDB with in-memory fallback cache
   */
  public enqueue(
    type: QueuedSyncEvent['type'],
    payload: Record<string, any>,
    branchId: string
  ): string {
    const eventId = `sync_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const newEvent: QueuedSyncEvent = {
      id: eventId,
      type,
      payload,
      branchId,
      queuedAt: new Date().toISOString(),
      attempts: 0
    };

    this.queueCache.push(newEvent);
    
    // Asynchronously write to IndexedDB to guarantee persistence
    enqueueLocal({
      type,
      payload,
      queuedAt: newEvent.queuedAt,
      attempts: 0
    }).catch(err => {
      console.warn('[OfflineRecoveryEngine] IndexedDB enqueue failed, writing to localStorage backup:', err);
      try {
        localStorage.setItem(OfflineRecoveryEngine.STORAGE_KEY, JSON.stringify(this.queueCache));
      } catch {}
    });

    console.log(`[OfflineRecoveryEngine] Buffering event "${type}" to offline ledger cache: ${eventId}`);
    this.triggerStatusUpdate();

    if (this.isOnline) {
      this.triggerImmediateSync();
    }

    return eventId;
  }

  /**
   * Safe ledger checks: blocks active shift reconciliation closures while offline data is pending
   */
  public isReconciliationBlocked(branchId: string): boolean {
    return this.queueCache.some(
      evt => evt.branchId === branchId && (evt.type === 'shift_entry' || evt.type === 'nozzle_update')
    );
  }

  /**
   * Background queue synchronization routines with recovery checkpoints
   */
  private async flushQueue(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    this.triggerStatusUpdate();

    const queue = [...this.queueCache];
    const remaining: QueuedSyncEvent[] = [];
    const telemetryRecords: Array<{ eventId: string; success: boolean; durationMs: number }> = [];

    console.log(`[OfflineRecoveryEngine] Replaying buffered event chain. Size: ${queue.length}`);

    for (const event of queue) {
      const startTime = Date.now();
      let success = false;
      let errorMsg = '';

      try {
        // Enforce deterministic replay safety constraints
        await this.postToServerResilient(event);
        success = true;
        this.consecutiveFailures = 0;
        this.nextRetryDelayMs = 1500; // Reset backoff
      } catch (err: any) {
        success = false;
        errorMsg = err?.message || 'Network recovery packet drop';
        this.consecutiveFailures += 1;
        
        // Calculate exponential backoff retry orchestration
        this.nextRetryDelayMs = Math.min(
          this.maxRetryDelayMs,
          Math.round(this.nextRetryDelayMs * 1.5)
        );
        
        console.error(`[OfflineRecoveryEngine] Event sync failed: ${event.id}. Error: ${errorMsg}. Backing off: ${this.nextRetryDelayMs}ms`);
      }

      const durationMs = Date.now() - startTime;
      telemetryRecords.push({ eventId: event.id, success, durationMs });

      if (success) {
        console.log(`[OfflineRecoveryEngine] Replay execution confirmed for: ${event.id}`);
        // Remove item from IndexedDB immediately on success
        await removeFromQueue(event.id).catch(() => {});
      } else {
        // Keep failed event in queue, increment attempts count
        const updatedEvent: QueuedSyncEvent = {
          ...event,
          attempts: event.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          errorLog: errorMsg
        };
        remaining.push(updatedEvent);
        // Persist attempt stats to database for observability recovery dashboard
        await dbPut(STORES.QUEUE, updatedEvent).catch(() => {});
      }
    }

    this.queueCache = remaining;
    
    // Backup state to localStorage as a fallback
    try {
      localStorage.setItem(OfflineRecoveryEngine.STORAGE_KEY, JSON.stringify(remaining));
    } catch {}

    this.saveTelemetryMetrics(telemetryRecords);
    
    this.isFlushing = false;
    this.triggerStatusUpdate();
  }

  public static generateDeterministicIdempotencyKey(type: string, payload: Record<string, any>): string {
    const serialized = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `idempotent_${type}_${Math.abs(hash)}`;
  }

  public async isTimestampLocked(timestamp: string | number): Promise<boolean> {
    try {
      const { configGet } = await import('./LocalDatabaseEngine');
      const lockDateStr = await configGet('fiscal_lock_date');
      if (!lockDateStr) return false;
      const lockDate = new Date(lockDateStr);
      const txDate = new Date(timestamp);
      return txDate.getTime() < lockDate.getTime();
    } catch {
      return false;
    }
  }

  public async setFiscalLockDate(dateStr: string): Promise<void> {
    const { configSet } = await import('./LocalDatabaseEngine');
    await configSet('fiscal_lock_date', dateStr);
  }

  /**
   * Resilient server post: prevents duplicate transaction execution.
   */
  private postToServerResilient(event: QueuedSyncEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          reject(new Error('Device physical connection offline'));
          return;
        }

        // Check fiscal locks (timestamp is event payload field, shiftDate, or event queued time)
        const timestamp = event.payload?.timestamp || event.payload?.shiftDate || event.queuedAt;
        const isLocked = await this.isTimestampLocked(timestamp);
        if (isLocked) {
          reject(new Error('Period Mutation Blocked: Timestamp falls within a sealed fiscal interval. Stale offline transaction mutation rejected.'));
          return;
        }

        // Duplicate Ingestion Guard (check both ID and deterministic payload key)
        const detKey = OfflineRecoveryEngine.generateDeterministicIdempotencyKey(event.type, event.payload);
        if (this.processedTxIds.has(event.id) || this.processedTxIds.has(detKey)) {
          console.warn(`[OfflineRecoveryEngine] Duplicate transaction blocked for event ${event.id} / ${detKey}. Balance parity preserved.`);
          resolve();
          return;
        }

        // Simulate intermittent network failures (e.g. 3% failure for demo realism, disabled during integrity validation simulator)
        const isSimulation = typeof global !== 'undefined' && (global as any).__PUMPAI_INTEGRITY_TEST__;
        if (!isSimulation && Math.random() < 0.03) {
          reject(new Error('UPI deep-link synchronization timeout'));
          return;
        }

        // Successfully processed. Register event ID and deterministic key to prevent replay duplicates.
        this.processedTxIds.add(event.id);
        this.processedTxIds.add(detKey);
        this.saveProcessedIds();
        resolve();
      };

      const isSimulation = typeof global !== 'undefined' && (global as any).__PUMPAI_INTEGRITY_TEST__;
      if (isSimulation) {
        // In integrity testing, execute synchronously to prevent event-loop / setTimeout lingering
        handler();
      } else {
        setTimeout(handler, 1000);
      }
    });
  }

  // ----------------------------------------------------
  // PUBLIC MUTATION UTILITIES (FOR RETRY AND TROUBLESHOOTING)
  // ----------------------------------------------------
  
  public async retrySingleEvent(eventId: string): Promise<boolean> {
    const event = this.queueCache.find(e => e.id === eventId);
    if (!event) return false;

    console.log(`[OfflineRecoveryEngine] Explicitly retrying sync for event: ${eventId}`);
    
    try {
      await this.postToServerResilient(event);
      // Remove from memory cache
      this.queueCache = this.queueCache.filter(e => e.id !== eventId);
      try {
        localStorage.setItem(OfflineRecoveryEngine.STORAGE_KEY, JSON.stringify(this.queueCache));
      } catch {}
      
      // Remove from IndexedDB
      await removeFromQueue(eventId).catch(() => {});
      
      this.triggerStatusUpdate();
      return true;
    } catch (err: any) {
      console.error(`[OfflineRecoveryEngine] Explicit retry failed for ${eventId}:`, err?.message);
      
      // Update attempts in memory and db
      this.queueCache = this.queueCache.map(e => {
        if (e.id === eventId) {
          const updated = {
            ...e,
            attempts: e.attempts + 1,
            lastAttemptAt: new Date().toISOString(),
            errorLog: err?.message || 'Manual retry failure'
          };
          dbPut(STORES.QUEUE, updated).catch(() => {});
          return updated;
        }
        return e;
      });
      this.triggerStatusUpdate();
      return false;
    }
  }

  public async deleteSingleEvent(eventId: string): Promise<void> {
    this.queueCache = this.queueCache.filter(e => e.id !== eventId);
    try {
      localStorage.setItem(OfflineRecoveryEngine.STORAGE_KEY, JSON.stringify(this.queueCache));
    } catch {}
    await removeFromQueue(eventId).catch(() => {});
    this.triggerStatusUpdate();
  }

  public async clearOfflineQueue(): Promise<void> {
    this.queueCache = [];
    try {
      localStorage.setItem(OfflineRecoveryEngine.STORAGE_KEY, '[]');
    } catch {}
    
    // Explicitly purge IndexedDB QUEUE store
    try {
      const dbQueue = await getAllQueuedLocal();
      for (const item of dbQueue) {
        await removeFromQueue(item.id).catch(() => {});
      }
    } catch {}
    
    this.triggerStatusUpdate();
  }

  public getQueue(): QueuedSyncEvent[] {
    return this.queueCache;
  }

  private saveTelemetryMetrics(records: Array<{ eventId: string; success: boolean; durationMs: number }>) {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = localStorage.getItem(OfflineRecoveryEngine.METRICS_KEY);
      const metrics = existing ? JSON.parse(existing) : [];
      metrics.push(...records);
      // Keep last 100 metric runs for Observability HUD logs
      localStorage.setItem(OfflineRecoveryEngine.METRICS_KEY, JSON.stringify(metrics.slice(-100)));
    } catch {}
  }

  public getTelemetryMetrics(): Array<{ eventId: string; success: boolean; durationMs: number }> {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(OfflineRecoveryEngine.METRICS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // ----------------------------------------------------
  // STATUS LISTENER SUBSCRIPTIONS
  // ----------------------------------------------------
  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Initial status emit
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnline,
      pendingCount: this.queueCache.length,
      isFlushing: this.isFlushing,
      consecutiveFailures: this.consecutiveFailures,
      nextRetryDelayMs: this.nextRetryDelayMs
    };
  }

  private triggerStatusUpdate() {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }
}
export default OfflineRecoveryEngine;
