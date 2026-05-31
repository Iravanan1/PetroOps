/**
 * OCRFailureDetector.ts
 * 
 * Production-grade structural anomaly and accounting mismatch detector.
 * Asserts strict double-entry ledger equations, nozzle meter continuity,
 * and flags physical/logical violations before they compromise the ledger.
 */

import { AIExtraction } from '../../ai/validation/AIExtractionSchema';

export interface AnomalyAlert {
  category: 'IMPOSSIBLE_TOTALS' | 'NEGATIVE_VALUES' | 'DUPLICATE_NUMBERS' | 'MISSING_CARRY_FORWARDS' | 'NOZZLE_ROLLBACK' | 'SETTLEMENT_MISMATCH';
  severity: 'WARNING' | 'CRITICAL';
  field: string;
  message: string;
  debugContext: Record<string, any>;
}

export class OCRFailureDetector {
  /**
   * Evaluates a provisional AIExtraction state against strict physical and mathematical constraints.
   * Compares with previous shift's readings if available to check carry-forward continuity.
   */
  public static detectFailures(current: AIExtraction, previous?: AIExtraction): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    // 1. Check for negative values
    const numericFields = [
      { name: 'openingCash', val: current.openingCash },
      { name: 'actualCash', val: current.actualCash },
      { name: 'cardSales', val: current.cardSales },
      { name: 'upiSales', val: current.upiSales },
      { name: 'creditSales', val: current.creditSales },
      { name: 'creditRecovery', val: current.creditRecovery },
      { name: 'expenses', val: current.expenses }
    ];

    numericFields.forEach(f => {
      if (f.val < 0) {
        alerts.push({
          category: 'NEGATIVE_VALUES',
          severity: 'CRITICAL',
          field: f.name,
          message: `Field '${f.name}' has invalid negative value: ₹${f.val.toFixed(2)}.`,
          debugContext: { value: f.val }
        });
      }
    });

    // Validate Nozzle negative readings
    current.nozzleReadings.forEach(noz => {
      if (noz.openingMeter < 0 || noz.closingMeter < 0 || noz.testingQty < 0 || noz.fuelRate <= 0) {
        alerts.push({
          category: 'NEGATIVE_VALUES',
          severity: 'CRITICAL',
          field: `nozzle_${noz.nozzleId}`,
          message: `Nozzle ${noz.nozzleId} contains negative opening/closing meter, negative testing quantity or invalid rate.`,
          debugContext: { nozzle: noz }
        });
      }
    });

    // 2. Check for duplicate nozzle IDs
    const nozzleIds = current.nozzleReadings.map(n => n.nozzleId);
    const uniqueNozzles = new Set(nozzleIds);
    if (uniqueNozzles.size !== nozzleIds.length) {
      alerts.push({
        category: 'DUPLICATE_NUMBERS',
        severity: 'CRITICAL',
        field: 'nozzleReadings',
        message: 'Duplicate nozzle IDs detected within the same shift register sheet.',
        debugContext: { nozzleIds }
      });
    }

    // 3. Nozzle rollback anomalies (Closing Meter < Opening Meter)
    current.nozzleReadings.forEach(noz => {
      if (noz.closingMeter < noz.openingMeter) {
        // Roll-overs are mathematically possible (e.g. odometer-style rollover at 99999.9)
        // Check if the difference is very close to a rollover limit, otherwise flag as critical rollback.
        const isPossibleRollover = noz.openingMeter > 9000 && noz.closingMeter < 1000;
        alerts.push({
          category: 'NOZZLE_ROLLBACK',
          severity: isPossibleRollover ? 'WARNING' : 'CRITICAL',
          field: `nozzle_${noz.nozzleId}`,
          message: isPossibleRollover
            ? `Nozzle ${noz.nozzleId} closing meter (${noz.closingMeter}) is lower than opening (${noz.openingMeter}). Rollover suspected.`
            : `Nozzle ${noz.nozzleId} closing meter (${noz.closingMeter}) is lower than opening (${noz.openingMeter}). Invalid rollback anomaly.`,
          debugContext: { openingMeter: noz.openingMeter, closingMeter: noz.closingMeter, rolloverSuspected: isPossibleRollover }
        });
      }
    });

    // 4. Missing carry-forwards (Continuity checking)
    if (previous) {
      current.nozzleReadings.forEach(noz => {
        const prevNoz = previous.nozzleReadings.find(p => p.nozzleId === noz.nozzleId);
        if (prevNoz) {
          // Check if current opening meter matches previous closing meter
          const delta = Math.abs(noz.openingMeter - prevNoz.closingMeter);
          if (delta > 0.05) { // 0.05 allowance for minor rounding in display
            alerts.push({
              category: 'MISSING_CARRY_FORWARDS',
              severity: 'CRITICAL',
              field: `nozzle_${noz.nozzleId}_opening`,
              message: `Nozzle ${noz.nozzleId} continuity broken: Opening meter (${noz.openingMeter}) does not match previous closing meter (${prevNoz.closingMeter}) by delta ${delta.toFixed(2)}.`,
              debugContext: { currentOpening: noz.openingMeter, previousClosing: prevNoz.closingMeter, delta }
            });
          }
        } else {
          alerts.push({
            category: 'MISSING_CARRY_FORWARDS',
            severity: 'WARNING',
            field: `nozzle_${noz.nozzleId}`,
            message: `Nozzle ${noz.nozzleId} did not exist in the previous shift. Baseline continuity missing.`,
            debugContext: { nozzleId: noz.nozzleId }
          });
        }
      });

      // Cash float continuity
      const cashFloatDelta = Math.abs(current.openingCash - previous.actualCash);
      if (cashFloatDelta > 0.01) {
        alerts.push({
          category: 'MISSING_CARRY_FORWARDS',
          severity: 'WARNING',
          field: 'openingCash',
          message: `Opening cash float (₹${current.openingCash.toLocaleString()}) does not match previous shift's actual physical cash balance (₹${previous.actualCash.toLocaleString()}).`,
          debugContext: { currentOpeningCash: current.openingCash, previousClosingCash: previous.actualCash, delta: cashFloatDelta }
        });
      }
    }

    // 5. Impossible Totals
    // Double Check: Digital Sales (UPI + Cards) must never exceed total fuel revenue
    let calculatedFuelRevenue = 0;
    current.nozzleReadings.forEach(noz => {
      const sold = Math.max(0, noz.closingMeter - noz.openingMeter - noz.testingQty);
      calculatedFuelRevenue += sold * noz.fuelRate;
    });

    const digitalSales = current.upiSales + current.cardSales;
    const creditSales = current.creditSales;
    const totalPaymentsBooked = digitalSales + creditSales;

    if (totalPaymentsBooked > calculatedFuelRevenue + 10) { // 10 INR allowance for minor rounding
      alerts.push({
        category: 'IMPOSSIBLE_TOTALS',
        severity: 'CRITICAL',
        field: 'upiSales',
        message: `Booked non-cash sales (UPI + Card + Credit = ₹${totalPaymentsBooked.toFixed(2)}) exceeds calculated shift fuel revenue (₹${calculatedFuelRevenue.toFixed(2)}).`,
        debugContext: { digitalSales, creditSales, calculatedFuelRevenue }
      });
    }

    // Cash expenses cannot exceed physical cash collections (Cash can't drop below zero)
    const expectedCashSales = Math.max(0, calculatedFuelRevenue - totalPaymentsBooked);
    const totalCashInflow = expectedCashSales + current.creditRecovery;
    if (current.expenses > current.openingCash + totalCashInflow) {
      alerts.push({
        category: 'IMPOSSIBLE_TOTALS',
        severity: 'CRITICAL',
        field: 'expenses',
        message: `Shift operational expenses (₹${current.expenses.toFixed(2)}) exceed total available cash cash till inflow (₹${(current.openingCash + totalCashInflow).toFixed(2)}).`,
        debugContext: { expenses: current.expenses, maxCashTill: current.openingCash + totalCashInflow }
      });
    }

    // 6. Settlement Mismatches (Double Entry imbalance)
    // Equation: Opening Cash + expectedCashChange = Expected Closing Cash
    // actualCash - Expected Closing Cash = cashShortage (or surplus)
    // If shortage exceeds standard threshold (e.g. ₹500), trigger high severity warning.
    const expectedCashChange = expectedCashSales + current.creditRecovery - current.expenses;
    const expectedClosingCash = current.openingCash + expectedCashChange;
    const cashVariance = current.actualCash - expectedClosingCash;

    if (Math.abs(cashVariance) > 500) {
      alerts.push({
        category: 'SETTLEMENT_MISMATCH',
        severity: 'WARNING',
        field: 'actualCash',
        message: cashVariance < 0
          ? `High cash till SHORTAGE detected: Shift shortage is ₹${Math.abs(cashVariance).toFixed(2)}.`
          : `High cash till SURPLUS detected: Shift surplus is ₹${cashVariance.toFixed(2)}.`,
          debugContext: { expectedClosingCash, actualClosingCash: current.actualCash, variance: cashVariance }
      });
    }

    return alerts;
  }
}
