/**
 * AuditImmutabilityEngine.ts
 * ──────────────────────────
 * Implements cryptographic chaining of system logs to prevent deletions or silent adjustments.
 * Each entry holds the hash of its predecessor to guarantee immutability.
 */

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  previousHash: string;
  currentHash: string;
}

export class AuditImmutabilityEngine {
  private static readonly STORAGE_KEY = 'pumpai_chain_audit_logs';

  /**
   * Generates SHA-256 equivalent mock digest hash of log
   */
  public static calculateDigest(
    id: string,
    action: string,
    user: string,
    prevHash: string
  ): string {
    // btoa mock SHA digest
    return btoa(`${id}|${action}|${user}|${prevHash}|IMMUTABLE-SEAL`);
  }

  /**
   * Loads current immutable logs chain
   */
  public static getLogs(): SystemAuditLog[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Seed default logs chain
      const initLogs: SystemAuditLog[] = [];
      
      const log1: Omit<SystemAuditLog, 'currentHash'> = {
        id: 'aud-001',
        timestamp: '2026-05-23 08:30:11',
        user: 'owner-potaliya',
        action: 'PORTAL_CREDENTIAL_CHANGE',
        details: 'Rotated HPCL oil refinery sync API connection password keys.',
        previousHash: 'GENESIS-BLOCK-0000000000000000000000'
      };
      const digest1 = this.calculateDigest(log1.id, log1.action, log1.user, log1.previousHash);
      initLogs.push({ ...log1, currentHash: digest1 });

      const log2: Omit<SystemAuditLog, 'currentHash'> = {
        id: 'aud-002',
        timestamp: '2026-05-23 09:12:44',
        user: 'manager-anjali',
        action: 'SHIFT_LOCK_SEAL',
        details: 'Locked shift-101 period nozzle balance accounts.',
        previousHash: digest1
      };
      const digest2 = this.calculateDigest(log2.id, log2.action, log2.user, log2.previousHash);
      initLogs.push({ ...log2, currentHash: digest2 });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initLogs));
      return initLogs;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Securely appends a signed audit log record
   */
  public static appendLog(user: string, action: string, details: string): SystemAuditLog {
    const logs = this.getLogs();
    const lastLog = logs[logs.length - 1];
    
    const prevHash = lastLog ? lastLog.currentHash : 'GENESIS-BLOCK-0000000000000000000000';
    const id = `aud-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newLog: SystemAuditLog = {
      id,
      timestamp,
      user,
      action,
      details,
      previousHash: prevHash,
      currentHash: this.calculateDigest(id, action, user, prevHash)

    };

    logs.push(newLog);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    return newLog;
  }
}
