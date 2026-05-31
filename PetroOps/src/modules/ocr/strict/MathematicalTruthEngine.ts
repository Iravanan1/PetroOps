export interface ShiftLedger {
  openingCash: number;
  actualCash: number;
  expenses: number;
  creditSales: number;
  upiSales: number;
  cardSales: number;
  creditRecovery: number;
  nozzleNetSales: number; // total fuel volume * rate
}

export class MathematicalTruthEngine {
  
  public static verifyContinuity(openingMeter: number, closingMeter: number): boolean {
    if (closingMeter < openingMeter) return false;
    if (closingMeter - openingMeter > 50000) return false; // Impossible movement in one shift
    return true;
  }

  public static verifyShiftLedger(ledger: ShiftLedger): boolean {
    // Basic double-entry check for cash
    // expectedCash = openingCash + cashSales + creditRecovery - expenses
    // cashSales = nozzleNetSales - (creditSales + upiSales + cardSales)
    
    if (ledger.openingCash < 0 || ledger.actualCash < 0) return false;
    if (ledger.expenses < 0) return false;
    if (ledger.nozzleNetSales < 0) return false;
    
    const expectedCashSales = ledger.nozzleNetSales - (ledger.creditSales + ledger.upiSales + ledger.cardSales);
    if (expectedCashSales < -100) return false; // Tolerance for minor roundings, but not deep negative
    
    const expectedClosingCash = ledger.openingCash + expectedCashSales + ledger.creditRecovery - ledger.expenses;
    const variance = Math.abs(ledger.actualCash - expectedClosingCash);
    
    // If variance is insane, the math truth fails. Tolerance ₹2000 for realistic manual error, anything beyond is a hallucination
    if (variance > 2000) return false;
    
    return true;
  }

  public static rejectNegativeMovement(value: number): boolean {
    return value >= 0;
  }
}
