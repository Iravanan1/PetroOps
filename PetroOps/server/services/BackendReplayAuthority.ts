/**
 * BackendReplayAuthority.ts
 * Secure backend service that reconstructs financial ledger states in-memory.
 * Replays transaction journals from genesis to verify absolute state balance.
 */

import { ChainedTransaction } from "../../src/modules/security/services/ImmutableLedgerGuard";

export interface ReplayStateResult {
  tenantId: string;
  calculatedBalance: number;
  finalHash: string;
  totalTransactionsProcessed: number;
  verifiedSequenceMatch: boolean;
  tamperedSequenceIndices: number[];
}

export class BackendReplayAuthority {
  /**
   * Replays append-only transaction event streams from genesis (balance = 0)
   * validates rolling hashes and verifies balance integrity.
   */
  public static replayTenantLedger(
    tenantId: string,
    transactions: ChainedTransaction[],
    clientAssertedBalance?: number,
    clientAssertedHash?: string
  ): ReplayStateResult {
    // Sort transactions chronologically
    const sortedTx = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    let calculatedBalance = 0;
    let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const tamperedSequenceIndices: number[] = [];

    sortedTx.forEach((tx, idx) => {
      // 1. Verify rolling hash alignment
      if (tx.previousHash !== expectedPrevHash) {
        tamperedSequenceIndices.push(idx);
      }

      const calculatedNodeHash = this.recalculateServerHash(expectedPrevHash, tx, tx.sequenceNumber);
      if (calculatedNodeHash !== tx.currentHash) {
        tamperedSequenceIndices.push(idx);
      }

      // 2. Perform absolute accounting reduction
      if (tx.type === "DEBIT") {
        calculatedBalance += tx.amount;
      } else {
        calculatedBalance -= tx.amount;
      }

      expectedPrevHash = tx.currentHash;
    });

    // Cross-examine client assertions
    let verifiedSequenceMatch = true;

    if (clientAssertedBalance !== undefined && Math.abs(calculatedBalance - clientAssertedBalance) > 0.001) {
      verifiedSequenceMatch = false;
    }

    if (clientAssertedHash !== undefined && expectedPrevHash !== clientAssertedHash) {
      verifiedSequenceMatch = false;
    }

    if (tamperedSequenceIndices.length > 0) {
      verifiedSequenceMatch = false;
    }

    return {
      tenantId,
      calculatedBalance: Number(calculatedBalance.toFixed(2)),
      finalHash: expectedPrevHash,
      totalTransactionsProcessed: sortedTx.length,
      verifiedSequenceMatch,
      tamperedSequenceIndices
    };
  }

  /**
   * Deterministic server-side FNV-1a rolling hash recalculator
   */
  private static recalculateServerHash(
    previousHash: string,
    payload: Omit<ChainedTransaction, "previousHash" | "currentHash">,
    sequenceNumber: number
  ): string {
    const payloadString = [
      previousHash,
      payload.tenantId,
      payload.amount.toFixed(4),
      payload.type,
      payload.accountHead,
      payload.timestamp.toString(),
      payload.periodLocked ? "LOCKED" : "UNLOCKED",
      sequenceNumber.toString()
    ].join("|");

    let h1 = 0x811c9dc5;
    let h2 = 0xc9dc5118;

    for (let i = 0; i < payloadString.length; i++) {
      const charCode = payloadString.charCodeAt(i);
      h1 = Math.imul(h1 ^ charCode, 0x01000193);
      h2 = Math.imul(h2 ^ charCode, 0x01000193);
    }

    const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
    const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
    
    const salt = "PUMPAI-LEDGER-SALT-HEX-KEY-2026-ENCRYPTED";
    let hexResult = "";
    const combined = part1 + part2 + salt;
    
    for (let j = 0; j < 4; j++) {
      let segmentHash = 0x7f4b321a;
      for (let k = 0; k < combined.length; k++) {
        segmentHash = Math.imul(segmentHash ^ combined.charCodeAt(k), 0x01005118);
      }
      hexResult += (segmentHash >>> 0).toString(16).padStart(8, "0");
    }
    
    return hexResult.toLowerCase().substring(0, 64);
  }
}
