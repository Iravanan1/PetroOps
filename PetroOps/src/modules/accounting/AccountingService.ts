import { db } from '../../utils/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { LedgerTransaction, TransactionNormalizer } from './TransactionNormalizer';
import { BranchReplayIsolationService } from '../replay/BranchReplayIsolationService';
import { CoreReplayEngine, ReplayState } from '../replay/CoreReplayEngine';

export class AccountingService {
  private static PERIOD_LOCK_KEY_PREFIX = 'pumpai_period_lock_';
  private static MANUAL_JOURNALS_KEY = 'pumpai_manual_journals';

  /**
   * Retrieves all transactions for a branch, combining Firestore (if available),
   * local shift-generated transactions, and manually posted journal entries.
   */
  public static async getAllTransactions(branchId: string): Promise<LedgerTransaction[]> {
    const transactionsMap = new Map<string, LedgerTransaction>();

    // 1. Load from Firestore via BranchReplayIsolationService
    try {
      const dbTxs = await BranchReplayIsolationService.getIsolatedTransactions(branchId);
      dbTxs.forEach((tx: any) => {
        // Map database fields to LedgerTransaction schema if needed
        const normalizedTx: LedgerTransaction = {
          id: tx.id || tx.transactionId || `tx_${branchId}_db_${tx.sequenceId || Date.now()}`,
          branchId: tx.branchId || branchId,
          date: tx.date || (tx.timestamp ? tx.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]),
          sequenceId: tx.sequenceId || 0,
          debitAccount: tx.debitAccount || 'Cash Till',
          creditAccount: tx.creditAccount || 'Fuel Revenue',
          amount: Number(tx.amount || 0),
          description: tx.description || 'Shift transaction',
          timestamp: tx.timestamp || new Date().toISOString(),
          ocrConfidence: tx.ocrConfidence,
          sourceDocumentId: tx.sourceDocumentId,
          checksum: tx.checksum || tx.replayChecksum || ''
        };
        // Re-compute checksum if missing to preserve integrity check
        if (!normalizedTx.checksum) {
          normalizedTx.checksum = TransactionNormalizer.computeTransactionHash(normalizedTx);
        }
        transactionsMap.set(normalizedTx.id, normalizedTx);
      });
    } catch (e) {
      console.warn('[AccountingService] Failed to load Firestore transactions, relying on local storage:', e);
    }

    // 2. Load shift transactions from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tx_')) {
            const data = localStorage.getItem(key);
            if (data) {
              const tx = JSON.parse(data) as LedgerTransaction;
              if (tx && tx.branchId === branchId) {
                transactionsMap.set(tx.id, tx);
              }
            }
          }
        }
      } catch (e) {
        console.error('[AccountingService] Error reading shift transactions from localStorage:', e);
      }

      // 3. Load manual journal entries from localStorage
      try {
        const manualData = localStorage.getItem(this.MANUAL_JOURNALS_KEY);
        if (manualData) {
          const manualTxs = JSON.parse(manualData) as LedgerTransaction[];
          manualTxs.forEach(tx => {
            if (tx && tx.branchId === branchId) {
              transactionsMap.set(tx.id, tx);
            }
          });
        }
      } catch (e) {
        console.error('[AccountingService] Error reading manual journal entries:', e);
      }
    }

    // Sort chronologically (date, then sequenceId, then timestamp)
    return Array.from(transactionsMap.values()).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const seqCompare = a.sequenceId - b.sequenceId;
      if (seqCompare !== 0) return seqCompare;
      return a.timestamp.localeCompare(b.timestamp);
    });
  }

  /**
   * Saves a manually generated journal entry or general transaction.
   * Asserts double-entry correctness and assigns next sequence ID.
   */
  private static cachedLockDate: Record<string, string> = {};
  private static isSyncing = false;

  private static async syncIndexedDBLockToCache(branchId: string): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const { configGet } = await import('../shared/LocalDatabaseEngine');
      const idbLock = await configGet('fiscal_lock_date');
      if (idbLock) {
        this.cachedLockDate[branchId] = idbLock;
        if (typeof localStorage !== 'undefined') {
          const current = localStorage.getItem(`${this.PERIOD_LOCK_KEY_PREFIX}${branchId}`);
          if (current !== idbLock) {
            localStorage.setItem(`${this.PERIOD_LOCK_KEY_PREFIX}${branchId}`, idbLock);
          }
        }
      }
    } catch (e) {
      // Ignore gracefully if database is not ready or during SSR
    } finally {
      this.isSyncing = false;
    }
  }

  public static async saveManualJournalEntry(
    branchId: string,
    entry: {
      date: string;
      debitAccount: string;
      creditAccount: string;
      amount: number;
      description: string;
    }
  ): Promise<LedgerTransaction> {
    // Enforce fiscal period lock date checks strictly
    if (this.isTransactionLocked(branchId, entry.date)) {
      throw new Error(`Period Mutation Blocked: The transaction date ${entry.date} falls within a locked fiscal period.`);
    }

    const allTxs = await this.getAllTransactions(branchId);
    const nextSeqId = allTxs.length > 0 ? Math.max(...allTxs.map(t => t.sequenceId)) + 1 : 1;

    const roundedAmount = Math.round(entry.amount * 100) / 100;
    if (roundedAmount <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }

    const txId = `tx_${branchId}_manual_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const partialTx: Omit<LedgerTransaction, 'checksum'> = {
      id: txId,
      branchId,
      date: entry.date,
      sequenceId: nextSeqId,
      debitAccount: entry.debitAccount,
      creditAccount: entry.creditAccount,
      amount: roundedAmount,
      description: entry.description,
      timestamp
    };

    const checksum = TransactionNormalizer.computeTransactionHash(partialTx);
    const completeTx: LedgerTransaction = {
      ...partialTx,
      checksum
    };

    // Save locally
    if (typeof localStorage !== 'undefined') {
      const manualData = localStorage.getItem(this.MANUAL_JOURNALS_KEY);
      const manualTxs = manualData ? JSON.parse(manualData) as LedgerTransaction[] : [];
      manualTxs.push(completeTx);
      localStorage.setItem(this.MANUAL_JOURNALS_KEY, JSON.stringify(manualTxs));
    }

    // Save to Firestore (attempt)
    try {
      await addDoc(collection(db, 'replayTransactions'), completeTx);
    } catch (e) {
      console.warn('[AccountingService] Offline-first manual transaction queued locally.');
    }

    return completeTx;
  }

  /**
   * Replays the entire isolated branch ledger and returns the balance state.
   */
  public static async replayIsolatedLedger(branchId: string): Promise<ReplayState> {
    const transactions = await this.getAllTransactions(branchId);
    return CoreReplayEngine.replayLedger(branchId, transactions);
  }

  /**
   * Enforces period lock dates.
   */
  public static getPeriodLockDate(branchId: string): string {
    const memLock = this.cachedLockDate[branchId];
    let localLock = '1970-01-01';
    
    if (typeof localStorage !== 'undefined') {
      localLock = localStorage.getItem(`${this.PERIOD_LOCK_KEY_PREFIX}${branchId}`) || '1970-01-01';
    }

    const finalLock = memLock && memLock > localLock ? memLock : localLock;

    // Trigger async sync from IndexedDB to stay perfectly aligned
    this.syncIndexedDBLockToCache(branchId);

    return finalLock;
  }

  public static setPeriodLockDate(branchId: string, date: string): void {
    this.cachedLockDate[branchId] = date;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${this.PERIOD_LOCK_KEY_PREFIX}${branchId}`, date);
    }

    // Set lock date in IndexedDB asynchronously via OfflineRecoveryEngine
    if (typeof window !== 'undefined') {
      import('../shared/OfflineRecoveryEngine').then(({ OfflineRecoveryEngine }) => {
        OfflineRecoveryEngine.getInstance().setFiscalLockDate(date).catch(err => {
          console.error('[AccountingService] Failed to set IndexedDB lock date:', err);
        });
      }).catch(err => {
        console.warn('[AccountingService] Failed to load OfflineRecoveryEngine:', err);
      });
    }
  }

  /**
   * Checks if a transaction is inside a locked period.
   */
  public static isTransactionLocked(branchId: string, txDate: string): boolean {
    const lockDate = this.getPeriodLockDate(branchId);
    return txDate <= lockDate;
  }
}
