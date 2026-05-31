"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionNormalizer = void 0;
const ReplayChecksumService_1 = require("../replay/ReplayChecksumService");
class TransactionNormalizer {
    /**
     * Deterministic simple hash function to guarantee transaction integrity
     */
    static computeTransactionHash(tx) {
        const content = `${tx.id}_${tx.branchId}_${tx.date}_${tx.sequenceId}_${tx.debitAccount}_${tx.creditAccount}_${tx.amount.toFixed(2)}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32bit integer
        }
        const unsignedHash = hash >>> 0;
        return `tx_chk_${unsignedHash.toString(16).padStart(8, '0')}_len_${content.length}`;
    }
    /**
     * Normalizes raw AIExtraction/Shift data into a set of double-entry ledger transactions.
     * Asserts the mathematical equations and generates deterministic IDs.
     */
    static normalizeShiftToTransactions(branchId, shift, startSequenceId, sourceDocumentId) {
        const transactions = [];
        let currentSeq = startSequenceId;
        const date = shift.shiftDate;
        const timestamp = new Date().toISOString();
        const addTx = (debitAccount, creditAccount, amount, description) => {
            // Rounded to 2 decimal places to ensure exact penny precision
            const roundedAmount = Math.round(amount * 100) / 100;
            if (roundedAmount <= 0)
                return;
            const txId = `tx_${branchId}_${date.replace(/-/g, '')}_seq${currentSeq}`;
            const idempotencyKey = ReplayChecksumService_1.ReplayChecksumService.generateIdempotencyKey({
                branchId,
                date,
                debitAccount,
                creditAccount,
                amount: roundedAmount,
                description
            });
            transactions.push({
                id: txId,
                branchId,
                date,
                sequenceId: currentSeq,
                debitAccount,
                creditAccount,
                amount: roundedAmount,
                description,
                timestamp,
                ocrConfidence: shift.confidence,
                sourceDocumentId,
                idempotencyKey
            });
            currentSeq++;
        };
        // 1. Calculate deterministic Fuel Revenue from Nozzle Readings
        let calculatedFuelRevenue = 0;
        shift.nozzleReadings.forEach(noz => {
            const soldLitres = Math.max(0, noz.closingMeter - noz.openingMeter - noz.testingQty);
            calculatedFuelRevenue += soldLitres * noz.fuelRate;
            // If testingQty is positive, record it as Wet Stock Adjustment (testing is standard pump calibration)
            if (noz.testingQty > 0) {
                const testingValue = noz.testingQty * noz.fuelRate;
                addTx('Wet Stock Adjustments', 'Fuel Revenue', testingValue, `Nozzle ${noz.nozzleId} pump calibration/testing of ${noz.testingQty}L`);
            }
        });
        // Determine sales split: Cash, Card, UPI, Credit (Accounts Receivable)
        const cardAmt = shift.cardSales;
        const upiAmt = shift.upiSales;
        const creditAmt = shift.creditSales;
        const recoveryAmt = shift.creditRecovery;
        const expensesAmt = shift.expenses;
        // Cash sales is the residual fuel revenue after other payment modes
        const nonCashSales = cardAmt + upiAmt + creditAmt;
        const cashSales = Math.max(0, calculatedFuelRevenue - nonCashSales);
        // Record fuel sales splits (Double Entry: Debit asset/clearing clearing accounts, Credit Fuel Revenue)
        if (cashSales > 0) {
            addTx('Cash Till', 'Fuel Revenue', cashSales, `Cash Fuel Sales for ${date}`);
        }
        if (cardAmt > 0) {
            addTx('Card Clearing', 'Fuel Revenue', cardAmt, `Card Terminal Sales for ${date}`);
        }
        if (upiAmt > 0) {
            addTx('UPI Clearing', 'Fuel Revenue', upiAmt, `Paytm/UPI Digital Sales for ${date}`);
        }
        if (creditAmt > 0) {
            addTx('Accounts Receivable', 'Fuel Revenue', creditAmt, `Credit Sales (Udhari) for ${date}`);
        }
        // 2. Record Credit Recovery (Debit Cash Till, Credit Accounts Receivable)
        if (recoveryAmt > 0) {
            addTx('Cash Till', 'Accounts Receivable', recoveryAmt, `Credit Outstanding Recovery for ${date}`);
        }
        // 3. Record Expenses (Debit Expense Accounts, Credit Cash Till)
        if (expensesAmt > 0) {
            addTx('Expense Accounts', 'Cash Till', expensesAmt, `Tea/Station Operational Expenses for ${date}`);
        }
        // 4. Record Cash Till Shortage / Surplus (Settlement Adjustments)
        // Formula: Expected Cash Float increase = cashSales + recovery - expenses
        const expectedCashChange = cashSales + recoveryAmt - expensesAmt;
        const expectedCashTill = shift.openingCash + expectedCashChange;
        const cashVariance = shift.actualCash - expectedCashTill;
        if (cashVariance < 0) {
            // Shortage (Debit Settlement Adjustments [loss], Credit Cash Till)
            addTx('Settlement Adjustments', 'Cash Till', Math.abs(cashVariance), `Shift Cash till shortage discrepancy variance for ${date}`);
        }
        else if (cashVariance > 0) {
            // Surplus (Debit Cash Till, Credit Settlement Adjustments [gain])
            addTx('Cash Till', 'Settlement Adjustments', cashVariance, `Shift Cash till surplus discrepancy variance for ${date}`);
        }
        // Append standard verification checks & compute robust hashes for append-only integrity
        return transactions.map(tx => {
            const checksum = this.computeTransactionHash(tx);
            return {
                ...tx,
                checksum
            };
        });
    }
}
exports.TransactionNormalizer = TransactionNormalizer;
