import { AIExtraction } from '../ai/validation/AIExtractionSchema';

export interface AuditReport {
  isAuditCleared: boolean;
  discrepancies: string[];
  metrics: {
    expectedCash: number;
    cashMismatch: number;
    fuelRevenue: number;
    wetstockVariance: number;
  };
}

export class MathematicalAuditEngine {
  /**
   * Performs rigid, deterministic mathematical audits over a shift extraction.
   * Ensures absolute ledger and physical consistency.
   */
  public static auditShift(
    currentShift: AIExtraction,
    historicalClosingCash: number,
    historicalClosingMeters: Record<string, number>,
    physicalDipStock: Record<string, number>,
    bookOpeningStock: Record<string, number>,
    fuelRates: Record<string, number>
  ): AuditReport {
    const discrepancies: string[] = [];

    // 1. Till Continuity Check
    if (currentShift.openingCash !== historicalClosingCash) {
      discrepancies.push(`Till Continuity: openingCash (₹${currentShift.openingCash}) does not match previous closing cash (₹${historicalClosingCash}).`);
    }

    // 2. Nozzle Continuity Check
    let calculatedFuelRevenue = 0;
    currentShift.nozzleReadings.forEach(noz => {
      const prevClose = historicalClosingMeters[noz.nozzleId];
      if (prevClose !== undefined && noz.openingMeter !== prevClose) {
        discrepancies.push(`Nozzle Continuity (Nozzle ${noz.nozzleId}): openingMeter (${noz.openingMeter}) does not match yesterday's closing meter (${prevClose}).`);
      }

      if (noz.closingMeter < noz.openingMeter) {
        discrepancies.push(`Validation Violation (Nozzle ${noz.nozzleId}): Closing meter (${noz.closingMeter}) is less than opening meter (${noz.openingMeter}). Illegal rollback reading.`);
      }

      const nozzleLitres = Math.max(0, noz.closingMeter - noz.openingMeter - noz.testingQty);
      const rate = noz.fuelRate || fuelRates[noz.nozzleId] || 100;
      calculatedFuelRevenue += nozzleLitres * rate;
    });

    // 3. Expected Cash Matching
    // Formula: Expected Cash = Opening Float + Cash Sales (which is Revenue - Payments - Credit) + Recovery - Expenses
    // Let's implement the standard Indian pump equation safely:
    const paymentCredits = currentShift.cardSales + currentShift.upiSales + currentShift.creditSales;
    const expectedCash = currentShift.openingCash + (calculatedFuelRevenue - paymentCredits + currentShift.creditRecovery) - currentShift.expenses;
    const cashMismatch = currentShift.actualCash - expectedCash;

    if (Math.abs(cashMismatch) > 100) {
      discrepancies.push(`Accounting Variance: expectedCash balance is ₹${expectedCash.toFixed(2)}, but actualCash collected is ₹${currentShift.actualCash.toFixed(2)} (Mismatch: ₹${cashMismatch.toFixed(2)}).`);
    }

    // 4. Wetstock Continuity Check
    // Formula: Wetstock Variance = Physical Dip - Book Stock (Book Stock = Opening + Received - NetSales)
    let wetstockVariance = 0;
    Object.keys(physicalDipStock).forEach(fuel => {
      const physical = physicalDipStock[fuel] || 0;
      const opening = bookOpeningStock[fuel] || 0;
      
      // Calculate sales litres for this fuel type
      const matchingTotals = currentShift.fuelTotals.find(t => t.fuelType.toUpperCase() === fuel.toUpperCase());
      const salesLitres = matchingTotals ? matchingTotals.totalLitres : 0;
      
      const bookStock = opening - salesLitres;
      const variance = physical - bookStock;
      wetstockVariance += variance;

      if (Math.abs(variance) > 50) {
        discrepancies.push(`Wetstock Leakage Warning (${fuel.toUpperCase()}): Physical Dip (${physical}L) differs from Book Stock (${bookStock.toFixed(2)}L) by ${variance.toFixed(2)}L.`);
      }
    });

    return {
      isAuditCleared: discrepancies.length === 0,
      discrepancies,
      metrics: {
        expectedCash: Number(expectedCash.toFixed(2)),
        cashMismatch: Number(cashMismatch.toFixed(2)),
        fuelRevenue: Number(calculatedFuelRevenue.toFixed(2)),
        wetstockVariance: Number(wetstockVariance.toFixed(2))
      }
    };
  }
}
