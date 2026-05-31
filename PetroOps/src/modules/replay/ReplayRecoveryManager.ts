/**
 * ReplayRecoveryManager.ts
 * ─────────────────────────
 * Tracks and persists intermediate ledger checkpoint states, allowing rapid
 * recovery without full ledger replays from date zero.
 */

import { CoreReplayEngine, ReplayState } from './CoreReplayEngine';
import { LedgerTransaction } from '../accounting/TransactionNormalizer';

export interface RecoveryCheckpoint {
  branchId: string;
  sequenceId: number;
  rollingChecksum: string;
  balances: Record<string, number>;
  timestamp: string;
}

export class ReplayRecoveryManager {
  private static readonly STORAGE_KEY = 'pumpai_replay_checkpoints';

  /**
   * Persists an intermediate checkpoint safely
   */
  public static saveCheckpoint(
    branchId: string,
    sequenceId: number,
    rollingChecksum: string,
    balances: Record<string, number>
  ): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const checkpoints = this.getAllCheckpoints();
      const newCheckpoint: RecoveryCheckpoint = {
        branchId,
        sequenceId,
        rollingChecksum,
        balances,
        timestamp: new Date().toISOString()
      };

      // Upsert checkpoint
      const filtered = checkpoints.filter(c => !(c.branchId === branchId && c.sequenceId === sequenceId));
      filtered.push(newCheckpoint);

      // Keep only last 10 checkpoints to save space
      const capped = filtered.slice(-10);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(capped));
      console.log(`[ReplayRecoveryManager] Saved recovery checkpoint for sequence ${sequenceId}`);
    } catch (err) {
      console.error('[ReplayRecoveryManager] Failed to persist checkpoint:', err);
    }
  }

  /**
   * Recovers ledger from the latest valid intermediate checkpoint
   */
  public static recoverAndReplay(
    branchId: string,
    allTransactions: LedgerTransaction[]
  ): ReplayState {
    const checkpoints = this.getAllCheckpoints()
      .filter(c => c.branchId === branchId)
      .sort((a, b) => b.sequenceId - a.sequenceId);

    // Look for the latest checkpoint
    for (const checkpoint of checkpoints) {
      // Find transactions occurring after the checkpoint
      const remainingTxs = allTransactions.filter(tx => tx.sequenceId > checkpoint.sequenceId);
      
      // Run dry-run verification
      const state = CoreReplayEngine.replayLedger(
        branchId,
        remainingTxs,
        checkpoint.balances,
        checkpoint.rollingChecksum
      );

      if (state.isValid) {
        console.log(`[ReplayRecoveryManager] Safe recovery from sequence checkpoint ${checkpoint.sequenceId} verified successfully!`);
        return state;
      } else {
        console.warn(`[ReplayRecoveryManager] Checkpoint ${checkpoint.sequenceId} failed validation. Falling back to next checkpoint.`);
      }
    }

    // Default fallback: replay everything from date zero
    console.log('[ReplayRecoveryManager] No valid checkpoints found. Replaying ledger from scratch.');
    return CoreReplayEngine.replayLedger(branchId, allTransactions);
  }

  private static getAllCheckpoints(): RecoveryCheckpoint[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

export default ReplayRecoveryManager;
