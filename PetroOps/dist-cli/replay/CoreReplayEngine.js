"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreReplayEngine = void 0;
const TransactionNormalizer_1 = require("../accounting/TransactionNormalizer");
class CoreReplayEngine {
    /**
     * List of asset/expense account types that increase with Debit entries.
     */
    static DEBIT_INCREASE_ACCOUNTS = new Set([
        'Cash Till',
        'UPI Clearing',
        'Card Clearing',
        'Accounts Receivable',
        'Expense Accounts',
        'Wet Stock Adjustments',
        'Settlement Adjustments'
    ]);
    /**
     * List of revenue/liability account types that increase with Credit entries.
     */
    static CREDIT_INCREASE_ACCOUNTS = new Set([
        'Fuel Revenue'
    ]);
    /**
     * Deterministically reduces a chronological stream of transactions.
     * Asserts exact decimal balance integrity and computes a rolling tamper-evident checksum.
     */
    static replayLedger(branchId, transactions, initialBalances = {}, initialChecksum = `seed_${branchId}`) {
        const accountBalances = { ...initialBalances };
        const processedIds = new Set();
        const errors = [];
        let rollingChecksum = initialChecksum;
        let expectedSequence = -1;
        // 1. Sort transactions strictly chronologically (date, then sequenceId)
        const sortedTxs = [...transactions].sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0)
                return dateCompare;
            return a.sequenceId - b.sequenceId;
        });
        // Initialize all account balances to 0 if not present
        const allAccounts = new Set([
            ...this.DEBIT_INCREASE_ACCOUNTS,
            ...this.CREDIT_INCREASE_ACCOUNTS
        ]);
        allAccounts.forEach(acc => {
            if (accountBalances[acc] === undefined) {
                accountBalances[acc] = 0;
            }
        });
        sortedTxs.forEach((tx, idx) => {
            // 2. Validate branch scoping
            if (tx.branchId !== branchId) {
                errors.push(`[Branch Leak] Transaction ${tx.id} belongs to branch ${tx.branchId}, not isolated target ${branchId}.`);
                return;
            }
            // 3. Prevent duplicate transactions
            if (processedIds.has(tx.id)) {
                errors.push(`[Duplicate Ingestion] Transaction ID duplicate detected: ${tx.id}. Skipping to preserve balance.`);
                return;
            }
            processedIds.add(tx.id);
            // 4. Validate transaction sequence continuity
            if (expectedSequence !== -1 && tx.sequenceId !== expectedSequence) {
                errors.push(`[Sequence Gap] Chronological sequence break between yesterday and today at transaction ${tx.id}. Expected seq ${expectedSequence}, got ${tx.sequenceId}.`);
            }
            expectedSequence = tx.sequenceId + 1;
            // 5. Verify individual transaction tamper checksum
            const computedHash = TransactionNormalizer_1.TransactionNormalizer.computeTransactionHash(tx);
            if (tx.checksum !== computedHash) {
                errors.push(`[Tamper Warning] Transaction ${tx.id} checksum mismatch! Computed ${computedHash}, but ledger had ${tx.checksum}.`);
            }
            // 6. Deterministic Replay Reduction
            const debitAcc = tx.debitAccount;
            const creditAcc = tx.creditAccount;
            if (!allAccounts.has(debitAcc)) {
                errors.push(`[Invalid Account] Unknown debit account: "${debitAcc}" in transaction ${tx.id}.`);
            }
            if (!allAccounts.has(creditAcc)) {
                errors.push(`[Invalid Account] Unknown credit account: "${creditAcc}" in transaction ${tx.id}.`);
            }
            // Debit processing
            if (this.DEBIT_INCREASE_ACCOUNTS.has(debitAcc)) {
                accountBalances[debitAcc] = Math.round((accountBalances[debitAcc] + tx.amount) * 100) / 100;
            }
            else if (this.CREDIT_INCREASE_ACCOUNTS.has(debitAcc)) {
                accountBalances[debitAcc] = Math.round((accountBalances[debitAcc] - tx.amount) * 100) / 100;
            }
            // Credit processing
            if (this.CREDIT_INCREASE_ACCOUNTS.has(creditAcc)) {
                accountBalances[creditAcc] = Math.round((accountBalances[creditAcc] + tx.amount) * 100) / 100;
            }
            else if (this.DEBIT_INCREASE_ACCOUNTS.has(creditAcc)) {
                accountBalances[creditAcc] = Math.round((accountBalances[creditAcc] - tx.amount) * 100) / 100;
            }
            // 7. Update Rolling Checksum (combining rolling with current checksum securely)
            const rollContent = `${rollingChecksum}_${tx.checksum}`;
            let rHash = 0;
            for (let i = 0; i < rollContent.length; i++) {
                const char = rollContent.charCodeAt(i);
                rHash = (rHash << 5) - rHash + char;
                rHash |= 0;
            }
            rollingChecksum = `roll_${(rHash >>> 0).toString(16).padStart(8, '0')}`;
        });
        // 8. Final double-entry ledger verification (Sum of Debit accounts must balance perfectly with Credit accounts)
        let debitSum = 0;
        let creditSum = 0;
        this.DEBIT_INCREASE_ACCOUNTS.forEach(acc => {
            debitSum += accountBalances[acc] || 0;
        });
        this.CREDIT_INCREASE_ACCOUNTS.forEach(acc => {
            creditSum += accountBalances[acc] || 0;
        });
        const debitTotal = Math.round(debitSum * 100) / 100;
        const creditTotal = Math.round(creditSum * 100) / 100;
        const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;
        if (!isBalanced) {
            errors.push(`[Ledger Out of Balance] Double entry parity violation. Total debits: ₹${debitTotal}, Total credits: ₹${creditTotal}. Discrepancy: ₹${(debitTotal - creditTotal).toFixed(2)}.`);
        }
        return {
            accountBalances,
            rollingChecksum,
            isBalanced,
            isValid: errors.length === 0,
            errors,
            processedCount: sortedTxs.length
        };
    }
}
exports.CoreReplayEngine = CoreReplayEngine;
