/**
 * TamperDetectionService.ts
 * ─────────────────────────
 * Core compliance validator. Actively audits the system logs chain
 * to detect any deleted lines, unauthorized edits, or balance mutations.
 */

import { AuditImmutabilityEngine, SystemAuditLog } from './AuditImmutabilityEngine';

export interface ChainVerificationResult {
  passed: boolean;
  brokenIndex?: number;
  errorDetails?: string;
}

export class TamperDetectionService {
  /**
   * Replays and validates the logs chain continuity
   */
  public static verifyLogsIntegrity(): ChainVerificationResult {
    const logs = AuditImmutabilityEngine.getLogs();
    
    if (logs.length === 0) {
      return { passed: true };
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // 1. Recalculate digest
      const computed = AuditImmutabilityEngine.calculateDigest(
        log.id,
        log.action,
        log.user,
        log.previousHash
      );

      if (computed !== log.currentHash) {
        return {
          passed: false,
          brokenIndex: i,
          errorDetails: `Cryptographic mismatch at index ${i}: stored currentHash does not match calculated digest. Tampering detected!`
        };
      }

      // 2. Check previous hash continuity (except genesis first block)
      if (i > 0) {
        const prevLog = logs[i - 1];
        if (log.previousHash !== prevLog.currentHash) {
          return {
            passed: false,
            brokenIndex: i,
            errorDetails: `Chain broken at index ${i}: previousHash does not map to parent currentHash! Deleted log detected!`
          };
        }
      }
    }

    return { passed: true };
  }
}
