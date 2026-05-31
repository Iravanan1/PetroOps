import { ShiftRecord } from '../hooks/useReconciledShifts';
import { LedgerTransaction } from './AccountingServices';

export type ShiftLifecycleState = 'opened' | 'active' | 'under_review' | 'reconciled' | 'locked';

export interface ManualEntry {
  type: 'EXPENSE' | 'CREDIT_SALE' | 'CREDIT_RECOVERY' | 'UPI_SETTLEMENT' | 'NOZZLE_TESTING' | 'MANUAL_ADJUSTMENT';
  amount: number;
  description: string;
  operatorId: string;
}

export class OperationalWorkflowService {
  
  // 1. Shift Opening: Generates pristine shift record
  public static openShift(
    pumpId: string, 
    dateString: string, 
    label: string, 
    openingCash: number
  ): ShiftRecord {
    return {
      id: `shift_${Date.now()}`,
      pumpId,
      shiftDate: dateString,
      shiftLabel: label,
      status: 'NEEDS_REVIEW', // Under review initially
      openingCash,
      actualCash: 0,
      cardSales: 0,
      upiSales: 0,
      creditSales: 0,
      creditRecovery: 0,
      expenses: 0,
      cashShortage: 0,
      ocrConfidence: 100, // Manual creation
      aiConfidence: 100,
      readings: [
        { id: 1, fuel: 'HSD', opening: 1200.5, closing: 1200.5, testing: 0, rate: 92.30 },
        { id: 2, fuel: 'MS', opening: 850.2, closing: 850.2, testing: 0, rate: 104.50 }
      ],
      auditHistory: [{
        editor: "Station Manager",
        timestamp: new Date().toISOString(),
        previousValues: {
          note: "Initial shift opened manually via Operational Control Panel.",
          openingCash
        }
      }]
    };
  }

  // 2. Transaction Logger: Registers manual operational entries into immutable LedgerTransactions
  public static postOperationalEntry(
    shift: ShiftRecord, 
    entry: ManualEntry
  ): { updatedShift: ShiftRecord; ledgerTx: LedgerTransaction } {
    const timestamp = new Date().toISOString();
    const txId = `op_tx_${Date.now()}`;
    const previousState = JSON.parse(JSON.stringify(shift));

    const updatedShift = { ...shift };
    let debitAccount: any = 'Cash Till';
    let creditAccount: any = 'Fuel Revenue';

    switch (entry.type) {
      case 'EXPENSE':
        updatedShift.expenses += entry.amount;
        debitAccount = 'Expense Accounts';
        creditAccount = 'Cash Till';
        break;
      case 'CREDIT_SALE':
        updatedShift.creditSales += entry.amount;
        debitAccount = 'Accounts Receivable';
        creditAccount = 'Fuel Revenue';
        break;
      case 'CREDIT_RECOVERY':
        updatedShift.creditRecovery += entry.amount;
        debitAccount = 'Cash Till';
        creditAccount = 'Accounts Receivable';
        break;
      case 'UPI_SETTLEMENT':
        updatedShift.upiSales += entry.amount;
        debitAccount = 'UPI Clearing';
        creditAccount = 'Fuel Revenue';
        break;
      case 'NOZZLE_TESTING':
        // Nozzles volume adjust: testing calibration runs (no direct double-entry cash flow)
        if (updatedShift.readings && updatedShift.readings.length > 0) {
          updatedShift.readings[0].testing += entry.amount; // Add liters to testing log
        }
        debitAccount = 'Wet Stock Adjustments';
        creditAccount = 'Fuel Revenue';
        break;
      case 'MANUAL_ADJUSTMENT':
        updatedShift.cashShortage += entry.amount;
        debitAccount = 'Settlement Adjustments';
        creditAccount = 'Cash Till';
        break;
    }

    // Append to audit trails
    updatedShift.auditHistory?.push({
      editor: "Station Manager",
      timestamp,
      previousValues: {
        note: `Manual entry [${entry.type}] logged: ${entry.description}`,
        previousExpenses: previousState.expenses,
        previousCreditSales: previousState.creditSales,
        previousRecovery: previousState.creditRecovery
      }
    });

    const ledgerTx: LedgerTransaction = {
      transactionId: txId,
      shiftId: shift.id,
      timestamp,
      debitAccount,
      creditAccount,
      amount: entry.amount,
      operatorId: entry.operatorId,
      status: 'under_review'
    };

    return { updatedShift, ledgerTx };
  }

  // 3. Reconcile Expected cash based on opening levels, recoveries, and expense payouts
  public static reconcileCashDrawer(
    shift: ShiftRecord, 
    actualCashCount: number
  ): ShiftRecord {
    const expectedClosingCash = shift.openingCash + shift.creditRecovery - shift.expenses;
    const cashShortage = expectedClosingCash - actualCashCount;

    const updatedShift = {
      ...shift,
      actualCash: actualCashCount,
      cashShortage,
      status: 'APPROVED' as const
    };

    updatedShift.auditHistory?.push({
      editor: "Station Manager",
      timestamp: new Date().toISOString(),
      previousValues: {
        note: `Shift reconciled. Expected Cash: ₹${expectedClosingCash}, Actual Till Count: ₹${actualCashCount}, Shortage approved.`,
        previousCashShortage: shift.cashShortage
      }
    });

    return updatedShift;
  }
}
