import { ShiftRecord } from '../hooks/useReconciledShifts';

export type AccountName = 
  | 'Cash Till' 
  | 'Fuel Revenue' 
  | 'UPI Clearing' 
  | 'Card Clearing' 
  | 'Accounts Receivable' 
  | 'Expense Accounts' 
  | 'Wet Stock Adjustments' 
  | 'Settlement Adjustments';

export type ReconciliationStatus = 'pending' | 'under_review' | 'reconciled' | 'disputed' | 'locked';

export interface LedgerTransaction {
  transactionId: string;
  shiftId: string;
  timestamp: string;
  debitAccount: AccountName;
  creditAccount: AccountName;
  amount: number;
  operatorId: string;
  status: ReconciliationStatus;
  approvalMetadata?: {
    approvedBy: string;
    approvedAt: string;
  };
}

export interface DiscrepancyReport {
  shiftId: string;
  shiftDate: string;
  mismatches: {
    type: 'SETTLEMENT_MISMATCH' | 'NOZZLE_METRIC_GAP' | 'DUPLICATE_TRANSACTION' | 'SUSPICIOUS_OVERRIDE';
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

// 1. JournalService: Creates normalized double-entry journal entries from Shift Log Registers
export class JournalService {
  public static generateJournal(shift: ShiftRecord): LedgerTransaction[] {
    const txs: LedgerTransaction[] = [];
    const timestamp = shift.shiftDate ? new Date(shift.shiftDate).toISOString() : new Date().toISOString();
    const operatorId = "Operator-0294"; // Normalized
    const status = shift.status === 'APPROVED' ? 'reconciled' : 'under_review';

    // Transaction A: Cash sales (Debit: Cash Till, Credit: Fuel Revenue)
    const netRevenue = shift.actualCash + shift.cardSales + shift.upiSales + shift.creditSales;
    const cashSales = Math.max(0, netRevenue - shift.cardSales - shift.upiSales - shift.creditSales);
    if (cashSales > 0) {
      txs.push({
        transactionId: `${shift.id}_rev_cash`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Cash Till',
        creditAccount: 'Fuel Revenue',
        amount: cashSales,
        operatorId,
        status
      });
    }

    // Transaction B: UPI settlements (Debit: UPI Clearing, Credit: Fuel Revenue)
    if (shift.upiSales > 0) {
      txs.push({
        transactionId: `${shift.id}_rev_upi`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'UPI Clearing',
        creditAccount: 'Fuel Revenue',
        amount: shift.upiSales,
        operatorId,
        status
      });
    }

    // Transaction C: Card settlements (Debit: Card Clearing, Credit: Fuel Revenue)
    if (shift.cardSales > 0) {
      txs.push({
        transactionId: `${shift.id}_rev_card`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Card Clearing',
        creditAccount: 'Fuel Revenue',
        amount: shift.cardSales,
        operatorId,
        status
      });
    }

    // Transaction D: Credit extended / Udhari (Debit: Accounts Receivable, Credit: Fuel Revenue)
    if (shift.creditSales > 0) {
      txs.push({
        transactionId: `${shift.id}_rev_credit`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Accounts Receivable',
        creditAccount: 'Fuel Revenue',
        amount: shift.creditSales,
        operatorId,
        status
      });
    }

    // Transaction E: Credit recovery collections (Debit: Cash Till, Credit: Accounts Receivable)
    if (shift.creditRecovery > 0) {
      txs.push({
        transactionId: `${shift.id}_recovery`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Cash Till',
        creditAccount: 'Accounts Receivable',
        amount: shift.creditRecovery,
        operatorId,
        status
      });
    }

    // Transaction F: Cash Expenses paid out (Debit: Expense Accounts, Credit: Cash Till)
    if (shift.expenses > 0) {
      txs.push({
        transactionId: `${shift.id}_expense`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Expense Accounts',
        creditAccount: 'Cash Till',
        amount: shift.expenses,
        operatorId,
        status
      });
    }

    // Transaction G: Shortage / Overrides Adjustments (Debit: Settlement Adjustments, Credit: Cash Till)
    if (shift.cashShortage > 0) {
      txs.push({
        transactionId: `${shift.id}_shortage`,
        shiftId: shift.id,
        timestamp,
        debitAccount: 'Settlement Adjustments',
        creditAccount: 'Cash Till',
        amount: shift.cashShortage,
        operatorId,
        status
      });
    }

    return txs;
  }
}

// 2. LedgerService: Aggregates ledger details for T-Account balances
export class LedgerService {
  public static calculateBalance(account: AccountName, transactions: LedgerTransaction[]): number {
    let balance = 0;
    transactions.forEach(tx => {
      if (tx.status !== 'reconciled' && tx.status !== 'locked') return; // Audit approved values only!
      
      if (tx.debitAccount === account) {
        balance += tx.amount;
      }
      if (tx.creditAccount === account) {
        balance -= tx.amount;
      }
    });
    return balance;
  }
}

// 3. WetStockService: Audits physical density and dip leakage anomalies
export interface WetStockReport {
  expectedHsdClosing: number;
  hsdVariance: number;
  hsdStatus: 'NORMAL' | 'SUSPICIOUS' | 'LEAK_WARNING';
}

export class WetStockService {
  public static reconcileWetStock(shift: ShiftRecord): WetStockReport {
    // Expected HSD = Opening + Receipts - Sales (nozzle sold liters)
    let nozzleSales = 0;
    shift.readings?.forEach(r => {
      if (r.fuel === 'HSD') {
        nozzleSales += Math.max(0, r.closing - r.opening - r.testing);
      }
    });

    const opening = shift.tankHsdOpening || 0;
    const received = shift.tankHsdReceived || 0;
    const closing = shift.tankHsdClosing || 0;

    const expectedHsdClosing = opening + received - nozzleSales;
    const hsdVariance = closing - expectedHsdClosing;
    
    let hsdStatus: 'NORMAL' | 'SUSPICIOUS' | 'LEAK_WARNING' = 'NORMAL';
    if (Math.abs(hsdVariance) > 15) {
      hsdStatus = 'LEAK_WARNING';
    } else if (Math.abs(hsdVariance) > 5) {
      hsdStatus = 'SUSPICIOUS';
    }

    return { expectedHsdClosing, hsdVariance, hsdStatus };
  }
}

// 4. ReconciliationService: Detects settlement mismatches, meter gaps and duplicate logs
export class ReconciliationService {
  public static auditDiscrepancies(shift: ShiftRecord, previousShift?: ShiftRecord): DiscrepancyReport {
    const mismatches: DiscrepancyReport['mismatches'] = [];

    // Mismatch A: Low OCR extraction quality
    if (shift.ocrConfidence < 85) {
      mismatches.push({
        type: 'SETTLEMENT_MISMATCH',
        description: `Ingestion OCR confidence low (${shift.ocrConfidence}%). Requires manual override auditing.`,
        severity: 'HIGH'
      });
    }

    // Mismatch B: Meter gap check (roll-backs)
    shift.readings?.forEach(r => {
      if (r.closing < r.opening) {
        mismatches.push({
          type: 'NOZZLE_METRIC_GAP',
          description: `Nozzle #${r.id} closing meter (${r.closing}) is less than opening meter (${r.opening}).`,
          severity: 'HIGH'
        });
      }
    });

    // Mismatch C: Cash shortage exceed INR 2,000 threshold
    if (Math.abs(shift.cashShortage) > 2000) {
      mismatches.push({
        type: 'SUSPICIOUS_OVERRIDE',
        description: `Till shortage variance is critical (INR ${shift.cashShortage.toLocaleString()}).`,
        severity: 'HIGH'
      });
    }

    return {
      shiftId: shift.id,
      shiftDate: shift.shiftDate,
      mismatches
    };
  }
}
