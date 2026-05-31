export interface AuditLogEntry {
  id: string;
  seqNo: number;
  action: string;
  timestamp: number;
  payloadHash: string; // Hash of the action payload
  previousHash: string; // Hash of the previous log entry (Blockchain style)
}

export class AuditTamperDetector {
  private inMemoryChain: AuditLogEntry[] = [];
  private isLocked: boolean = false;

  /**
   * Initializes the tamper detector by loading the historical chain and verifying integrity.
   */
  public verifyChain(logs: AuditLogEntry[]): boolean {
    if (logs.length === 0) return true;

    // Sort by sequence number
    const sorted = [...logs].sort((a, b) => a.seqNo - b.seqNo);
    this.inMemoryChain = sorted;

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i - 1];

      // 1. Check for missing sequence numbers
      if (current.seqNo !== previous.seqNo + 1) {
        this.triggerLockdown(`Missing sequence number detected between ${previous.seqNo} and ${current.seqNo}`);
        return false;
      }

      // 2. Check hash linkage
      const expectedPrevHash = this.computeHash(previous);
      if (current.previousHash !== expectedPrevHash) {
        this.triggerLockdown(`Hash mismatch at seq ${current.seqNo}. Expected ${expectedPrevHash}, got ${current.previousHash}`);
        return false;
      }
    }

    console.log('[Security] Audit log chain verified successfully. No tampering detected.');
    return true;
  }

  private computeHash(entry: AuditLogEntry): string {
    // Basic deterministic representation for hashing
    const data = `${entry.id}|${entry.seqNo}|${entry.action}|${entry.timestamp}|${entry.payloadHash}`;
    // In production, use crypto.subtle.digest here. Using simple string manipulation for synchronous demo.
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit int
    }
    return `HASH_${Math.abs(hash).toString(16)}`;
  }

  public appendLog(action: string, payloadHash: string): AuditLogEntry {
    if (this.isLocked) {
      throw new Error('SYSTEM LOCKED due to tamper detection. Cannot append logs.');
    }

    const prev = this.inMemoryChain[this.inMemoryChain.length - 1];
    const seqNo = prev ? prev.seqNo + 1 : 1;
    const previousHash = prev ? this.computeHash(prev) : 'GENESIS';

    const newLog: AuditLogEntry = {
      id: `AUDIT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      seqNo,
      action,
      timestamp: Date.now(),
      payloadHash,
      previousHash
    };

    this.inMemoryChain.push(newLog);
    return newLog;
  }

  private triggerLockdown(reason: string): void {
    this.isLocked = true;
    console.error(`[Security] CRITICAL LOCKDOWN INITIATED. Reason: ${reason}`);
    // In a real app, this would dispatch an event to force the UI into a locked state
    // and prevent any further local writes until an admin clears it.
  }

  public getLockdownStatus(): boolean {
    return this.isLocked;
  }
}

export const auditTamperDetector = new AuditTamperDetector();
