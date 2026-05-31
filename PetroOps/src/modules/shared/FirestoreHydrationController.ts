/**
 * FirestoreHydrationController
 * ─────────────────────────────
 * Manages indexed local data hydration for multi-tenant branch locations.
 *
 * Responsibilities:
 *  1. Bootstraps branch-specific snapshot data into memory on login.
 *  2. Provides a React-friendly hook-like interface for shared state caching.
 *  3. Manages selective prefetch windows (last N days) without loading
 *     unbounded historical arrays into view-layer objects.
 *  4. Exposes invalidation triggers for post-mutation refreshes.
 */
import { CanonicalSnapshotEngine, CanonicalSnapshot } from '../snapshots/CanonicalSnapshotEngine';
import { FirestoreQueryService, invalidateCachePrefix } from './FirestoreQueryService';

export interface HydrationState {
  branchId: string;
  hydratedAt: string;
  dailySnapshots: CanonicalSnapshot[];
  currentMonthSnapshotId: string | null;
  currentYearSnapshotId: string | null;
  isReady: boolean;
  errors: string[];
}

type HydrationListener = (state: HydrationState) => void;

export class FirestoreHydrationController {
  private static branchStates = new Map<string, HydrationState>();
  private static listeners = new Map<string, HydrationListener[]>();

  /**
   * Hydrates a branch: loads the last `windowDays` daily snapshots into memory,
   * also fetches current month and year rollup snapshots.
   */
  public static async hydrateBranch(
    branchId: string,
    windowDays = 30
  ): Promise<HydrationState> {
    const errors: string[] = [];
    const dailySnapshots: CanonicalSnapshot[] = [];
    let currentMonthSnapshotId: string | null = null;
    let currentYearSnapshotId: string | null = null;

    // ── Generate date window ────────────────────────────────────────
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // ── Fetch daily snapshots (parallel, bounded) ───────────────────
    const results = await Promise.allSettled(
      dates.map(date => CanonicalSnapshotEngine.getSnapshot(branchId, date, 'daily'))
    );

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        dailySnapshots.push(res.value);
      } else if (res.status === 'rejected') {
        errors.push(`Failed to load snapshot for ${dates[idx]}: ${res.reason}`);
      }
    });

    // Sort chronologically
    dailySnapshots.sort((a, b) => a.date.localeCompare(b.date));

    // ── Fetch monthly & yearly rollup IDs ───────────────────────────
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const currentYear  = String(today.getFullYear());

    const monthSnap = await CanonicalSnapshotEngine.getSnapshot(branchId, currentMonth, 'monthly');
    if (monthSnap) currentMonthSnapshotId = monthSnap.id;

    const yearSnap = await CanonicalSnapshotEngine.getSnapshot(branchId, currentYear, 'yearly');
    if (yearSnap) currentYearSnapshotId = yearSnap.id;

    const state: HydrationState = {
      branchId,
      hydratedAt: new Date().toISOString(),
      dailySnapshots,
      currentMonthSnapshotId,
      currentYearSnapshotId,
      isReady: true,
      errors
    };

    this.branchStates.set(branchId, state);
    this.notify(branchId, state);
    return state;
  }

  /**
   * Returns the currently cached hydration state for a branch, or null.
   */
  public static getState(branchId: string): HydrationState | null {
    return this.branchStates.get(branchId) ?? null;
  }

  /**
   * Subscribe to hydration state changes for a branch.
   * Returns an unsubscribe function.
   */
  public static subscribe(
    branchId: string,
    listener: HydrationListener
  ): () => void {
    const existing = this.listeners.get(branchId) ?? [];
    existing.push(listener);
    this.listeners.set(branchId, existing);

    // Immediately emit current state if available
    const current = this.branchStates.get(branchId);
    if (current) listener(current);

    return () => {
      const updated = (this.listeners.get(branchId) ?? []).filter(l => l !== listener);
      this.listeners.set(branchId, updated);
    };
  }

  /**
   * Invalidates the cached state for a branch and re-hydrates.
   * Call after a snapshot mutation to push fresh data to all subscribers.
   */
  public static async invalidateAndRefresh(
    branchId: string,
    windowDays = 30
  ): Promise<void> {
    invalidateCachePrefix(`page_branchSnapshots_${branchId}`);
    this.branchStates.delete(branchId);
    await this.hydrateBranch(branchId, windowDays);
  }

  /**
   * Returns the most recent daily snapshot for a branch (yesterday's close
   * for carry-forward validation today).
   */
  public static getLatestSnapshot(branchId: string): CanonicalSnapshot | null {
    const state = this.branchStates.get(branchId);
    if (!state || state.dailySnapshots.length === 0) return null;
    return state.dailySnapshots[state.dailySnapshots.length - 1];
  }

  /**
   * Returns all snapshots within a date range for the branch.
   */
  public static getSnapshotsInRange(
    branchId: string,
    from: string,
    to: string
  ): CanonicalSnapshot[] {
    const state = this.branchStates.get(branchId);
    if (!state) return [];
    return state.dailySnapshots.filter(s => s.date >= from && s.date <= to);
  }

  private static notify(branchId: string, state: HydrationState): void {
    const listenersForBranch = this.listeners.get(branchId) ?? [];
    listenersForBranch.forEach(fn => {
      try { fn(state); } catch (e) {
        console.error('[FirestoreHydrationController] Listener error:', e);
      }
    });
  }
}
