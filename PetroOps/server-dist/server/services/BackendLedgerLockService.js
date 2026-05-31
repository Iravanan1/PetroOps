"use strict";
/**
 * BackendLedgerLockService.ts
 * Server-managed ledger lock monitor enforcing calendar closures across tenants.
 * Proactively intercepts modification requests targeting sealed periods.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendLedgerLockService = void 0;
class BackendLedgerLockService {
    // In-memory server cache of locked periods (synced from DB)
    static { this.lockCache = [
        {
            periodId: "FP-Delhi-2026-M04",
            tenantId: "TENANT-DELHI-99",
            startDate: 1776510000000,
            endDate: 1779100000000,
            isClosed: true,
            sealedBy: "AUDITOR-SYS-1",
            signature: "SIG-HMAC-SEALED-DELHI-2026"
        }
    ]; }
    /**
     * Registers a sealed calendar block for a tenant
     */
    static registerLock(lock) {
        const existingIndex = this.lockCache.findIndex((l) => l.periodId === lock.periodId && l.tenantId === lock.tenantId);
        if (existingIndex >= 0) {
            this.lockCache[existingIndex] = lock;
        }
        else {
            this.lockCache.push(lock);
        }
    }
    /**
     * Verifies if a given timestamp for a tenant is currently locked under active calendar bounds
     */
    static verifyTimestampLocked(tenantId, timestamp) {
        const lockMatch = this.lockCache.find((l) => l.tenantId === tenantId && l.isClosed && timestamp >= l.startDate && timestamp <= l.endDate);
        if (lockMatch) {
            return { isLocked: true, lockDetails: lockMatch };
        }
        return { isLocked: false };
    }
    /**
     * Returns all registered locked period structures
     */
    static getAllLocks() {
        return [...this.lockCache];
    }
    /**
     * Securely unlock a fiscal period via authorized credentials checks
     */
    static executeAuditorUnlock(tenantId, periodId, auditorCreds) {
        if (auditorCreds.overrideKey !== "AUDIT-SECURE-KEY-2026") {
            throw new Error("Reopen Denied: Unauthorized override key supplied.");
        }
        const lock = this.lockCache.find((l) => l.periodId === periodId && l.tenantId === tenantId);
        if (!lock) {
            throw new Error("Reopen Denied: Target period not found.");
        }
        lock.isClosed = false;
        return true;
    }
}
exports.BackendLedgerLockService = BackendLedgerLockService;
