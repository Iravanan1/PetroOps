/**
 * DashboardGuard.ts
 * ──────────────────
 * Phase 12: Global middleware enforcing the CRITICAL ARCHITECTURAL RULE:
 *
 *   "Every data card across all dashboards reads exclusively from
 *    immutable snapshots. Direct queries to raw unstructured databases
 *    are blocked at this layer."
 *
 * Usage:
 *   All dashboard data-fetching hooks MUST call DashboardGuard.resolveSnapshot()
 *   instead of querying Firestore collections directly.
 *
 *   Any attempt to fetch raw ledger transactions or OCR documents from a
 *   dashboard context is intercepted and throws a GuardViolationError.
 */
import { CanonicalSnapshot } from '../snapshots/CanonicalSnapshotEngine';
import { FirestoreHydrationController } from './FirestoreHydrationController';

// ─────────────────────────────────────────────────────────────────
// Violation Error
// ─────────────────────────────────────────────────────────────────
export class GuardViolationError extends Error {
  public readonly blockedCollection: string;
  public readonly context: string;

  constructor(collection: string, context: string) {
    super(
      `[DashboardGuard] ARCHITECTURAL VIOLATION: Dashboard context "${context}" ` +
      `attempted direct query of raw collection "${collection}". ` +
      `Dashboards must read exclusively from approved CanonicalSnapshots. ` +
      `Use DashboardGuard.resolveSnapshot() instead.`
    );
    this.blockedCollection = collection;
    this.context = context;
    this.name = 'GuardViolationError';
  }
}

// ─────────────────────────────────────────────────────────────────
// Blocked raw collections (dashboard contexts cannot query these)
// ─────────────────────────────────────────────────────────────────
const BLOCKED_RAW_COLLECTIONS = new Set([
  'replayTransactions',
  'ocrExtractions',
  'rawShiftDocuments',
  'pendingOCRJobs',
  'ocrQueue'
]);

// ─────────────────────────────────────────────────────────────────
// Approval State Machine
// ─────────────────────────────────────────────────────────────────
export type ApprovalStatus =
  | 'AUTO_EXTRACTED'
  | 'AI_REVIEW_REQUIRED'
  | 'MANAGER_VERIFIED'
  | 'AUDITOR_APPROVED'
  | 'LOCKED';

export interface ApprovedRecord {
  id: string;
  status: ApprovalStatus;
  lockedAt?: string;
  approvedBy?: string;
  auditNote?: string;
}

// ─────────────────────────────────────────────────────────────────
// Guard
// ─────────────────────────────────────────────────────────────────
export class DashboardGuard {
  private static _violationLog: Array<{ ts: string; collection: string; context: string }> = [];
  private static _guardActive = true;

  /**
   * Asserts that the calling context is NOT attempting to read
   * a blocked raw collection. Throws GuardViolationError if violated.
   *
   * @param collection   The Firestore collection being accessed
   * @param callerContext A string identifying the calling component/hook
   */
  public static assertNotRawCollection(
    collection: string,
    callerContext: string
  ): void {
    if (!this._guardActive) return;
    if (BLOCKED_RAW_COLLECTIONS.has(collection)) {
      const violation = {
        ts: new Date().toISOString(),
        collection,
        context: callerContext
      };
      this._violationLog.push(violation);
      console.error(
        `[DashboardGuard] 🚫 BLOCKED: "${callerContext}" → "${collection}"\n` +
        `  → Raw collection access is prohibited in dashboard context.\n` +
        `  → Use resolveSnapshot() to read approved canonical data.`
      );
      throw new GuardViolationError(collection, callerContext);
    }
  }

  /**
   * Safe snapshot resolver for dashboard consumption.
   * Returns the hydrated snapshot from the in-memory controller,
   * never querying raw transaction collections.
   */
  public static resolveSnapshot(
    branchId: string,
    date: string
  ): CanonicalSnapshot | null {
    const state = FirestoreHydrationController.getState(branchId);
    if (!state) return null;
    return state.dailySnapshots.find(s => s.date === date) ?? null;
  }

  /**
   * Safe monthly/yearly resolver using the hydration controller's
   * preloaded window — no raw DB scan.
   */
  public static resolveSnapshotsInRange(
    branchId: string,
    from: string,
    to: string
  ): CanonicalSnapshot[] {
    return FirestoreHydrationController.getSnapshotsInRange(branchId, from, to);
  }

  /**
   * Validates that an approval record has reached at least
   * MANAGER_VERIFIED before allowing dashboard display.
   * Provisional AUTO_EXTRACTED records are blocked.
   */
  public static assertApproved(
    record: ApprovedRecord,
    callerContext: string
  ): void {
    const provisionalStates: ApprovalStatus[] = ['AUTO_EXTRACTED', 'AI_REVIEW_REQUIRED'];
    if (provisionalStates.includes(record.status)) {
      throw new GuardViolationError(
        `record:${record.id}:status=${record.status}`,
        callerContext
      );
    }
  }

  /**
   * Validates that a locked accounting period cannot be modified.
   * Call before any mutation on a snapshot.
   */
  public static assertNotLocked(
    snapshot: CanonicalSnapshot,
    callerContext: string
  ): void {
    if (snapshot.isLocked) {
      throw new Error(
        `[DashboardGuard] WRITE BLOCKED: Snapshot "${snapshot.id}" is LOCKED. ` +
        `Accounting period ${snapshot.date} is read-only. Context: ${callerContext}`
      );
    }
  }

  /**
   * Temporarily disables the guard for server-side data migrations.
   * NEVER call this from frontend code.
   */
  public static _bypassForMigration(fn: () => void): void {
    this._guardActive = false;
    try { fn(); } finally { this._guardActive = true; }
  }

  /** Returns the violation log for audit review. */
  public static getViolationLog() {
    return [...this._violationLog];
  }

  /** Clears the violation log (e.g. between test runs). */
  public static clearViolationLog(): void {
    this._violationLog = [];
  }
}
