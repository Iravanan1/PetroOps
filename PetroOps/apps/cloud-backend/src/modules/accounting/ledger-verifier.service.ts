import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';

export interface JournalEntry {
  sequenceNo: number;
  accountDebit: string;
  accountCredit: string;
  amount: number;
  prevHash: string;
}

@Injectable()
export class LedgerVerifierService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replays transaction entries sequentially from a verified genesis state,
   * validating SHA-256 running hashes to guarantee no retroactive changes occurred.
   */
  public verifyAndReplayLedger(
    tenantId: string,
    entries: JournalEntry[],
    clientAssertedHash?: string
  ): { isValid: boolean; verifiedRunningHash: string; failedIndex: number; tamperedSequenceIndices: number[] } {
    let currentHash = 'GENESIS_HASH_PETROOPS';
    const tamperedSequenceIndices: number[] = [];
    let isValid = true;
    let failedIndex = -1;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Calculate transaction payload signature
      const sha = crypto.createHash('sha256');
      sha.update(
        `${tenantId}:${entry.sequenceNo}:${entry.accountDebit}:${entry.accountCredit}:${entry.amount}:${currentHash}`
      );
      const computedHash = sha.digest('hex');

      if (entry.prevHash !== currentHash) {
        isValid = false;
        tamperedSequenceIndices.push(entry.sequenceNo);
        if (failedIndex === -1) {
          failedIndex = i;
        }
      }

      currentHash = computedHash;
    }

    if (clientAssertedHash && clientAssertedHash !== currentHash) {
      isValid = false;
    }

    return {
      isValid,
      verifiedRunningHash: currentHash,
      failedIndex,
      tamperedSequenceIndices,
    };
  }
}
