/**
 * CrashSafeTransactionService.ts
 * ─────────────────────────────
 * Implements Write-Ahead-Logging (WAL) for key-value and local draft storage
 * to guarantee atomic updates and recover from power losses or abrupt crashes.
 */

export interface WriteIntent {
  intentId: string;
  key: string;
  value: any;
  timestamp: string;
  status: 'PENDING' | 'COMMITTED';
}

export class CrashSafeTransactionService {
  private static readonly INTENT_PREFIX = 'pumpai_wal_intent_';

  /**
   * Begins a crash-safe transaction by logging intent first
   */
  public static executeAtomicWrite(key: string, value: any): boolean {
    if (typeof localStorage === 'undefined') return false;

    const intentId = `${this.INTENT_PREFIX}${Date.now()}`;
    const intent: WriteIntent = {
      intentId,
      key,
      value,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    try {
      // 1. Log intent first (Write-Ahead Log)
      localStorage.setItem(intentId, JSON.stringify(intent));

      // 2. Perform the actual write
      localStorage.setItem(key, JSON.stringify(value));

      // 3. Mark intent as committed and clean up
      localStorage.removeItem(intentId);
      return true;
    } catch (err) {
      console.error(`[CrashSafeTransactionService] Write failed on key ${key}:`, err);
      return false;
    }
  }

  /**
   * Scans startup registers and recovers incomplete/abruptly interrupted transactions
   */
  public static runStartupRecovery(): void {
    if (typeof localStorage === 'undefined') return;

    console.log('[CrashSafeTransactionService] Initiating Write-Ahead Log recovery scan...');
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(this.INTENT_PREFIX)) {
        try {
          const intentRaw = localStorage.getItem(key);
          if (!intentRaw) continue;

          const intent: WriteIntent = JSON.parse(intentRaw);
          console.warn(`[CrashSafeTransactionService] Interrupted transaction detected for key "${intent.key}". Replaying write...`);
          
          // Replay the write to heal the draft state
          localStorage.setItem(intent.key, JSON.stringify(intent.value));
          
          // Remove the stale WAL record
          localStorage.removeItem(key);
          console.log(`[CrashSafeTransactionService] Transaction healed successfully for key "${intent.key}".`);
        } catch (err) {
          console.error('[CrashSafeTransactionService] Recovery failed for log entry:', key, err);
        }
      }
    }
  }
}

export default CrashSafeTransactionService;
