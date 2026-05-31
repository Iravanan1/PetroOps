/**
 * LockValidationService.ts
 * 
 * Production-grade pre-lock double-entry balancing validations.
 * Asserts cash shortages limits, meter carries continuity, digital Paytm allocations,
 * and wetstock dip records before shift sealing.
 */

import { NozzleReading } from '../ai/validation/AIExtractionSchema';

export interface ValidationCheckpoint {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  severity: 'WARNING' | 'FATAL';
  actualValue?: string;
  expectedValue?: string;
}

export class LockValidationService {
  /**
   * Asserts all critical pre-lock constraints for double-entry balancing
   */
  public static runFullAudit(params: {
    nozzles: NozzleReading[];
    previousNozzles?: NozzleReading[];
    openingCash: number;
    actualCash: number;
    upiSales: number;
    cardSales: number;
    creditSales: number;
    creditRecovery: number;
    expenses: number;
    ocrReviewCompleted: boolean;
    wetstockVarianceRecorded: boolean;
  }): ValidationCheckpoint[] {
    const checkpoints: ValidationCheckpoint[] = [];

    // 1. Cash Variance Gate
    let calculatedFuelRevenue = 0;
    params.nozzles.forEach(noz => {
      const netLiters = Math.max(0, noz.closingMeter - noz.openingMeter - noz.testingQty);
      calculatedFuelRevenue += netLiters * noz.fuelRate;
    });

    const expectedCashSales = Math.max(0, calculatedFuelRevenue - params.upiSales - params.cardSales - params.creditSales);
    const expectedClosingCash = params.openingCash + expectedCashSales + params.creditRecovery - params.expenses;
    const cashVariance = params.actualCash - expectedClosingCash;

    const cashVarianceLimit = 500;
    const cashVariancePassed = Math.abs(cashVariance) <= cashVarianceLimit;

    checkpoints.push({
      id: 'gate_cash_variance',
      name: 'Cash Till Variance Match',
      passed: cashVariancePassed,
      severity: 'FATAL',
      message: cashVariancePassed
        ? `Cash variance (₹${cashVariance.toFixed(2)}) is within the allowed limit of ₹${cashVarianceLimit}.`
        : `Cash till variance mismatch (₹${cashVariance.toFixed(2)}) exceeds allowable ₹${cashVarianceLimit} threshold.`,
      actualValue: `₹${params.actualCash.toFixed(2)}`,
      expectedValue: `₹${expectedClosingCash.toFixed(2)}`
    });

    // 2. OCR Ingestion Incomplete Check
    checkpoints.push({
      id: 'gate_ocr_review',
      name: 'OCR Scans Review Status',
      passed: params.ocrReviewCompleted,
      severity: 'FATAL',
      message: params.ocrReviewCompleted
        ? 'OCR consensus matrix has been validated and finalized by manager.'
        : 'Shift scans cannot be approved while OCR manager reviews are pending.',
      actualValue: params.ocrReviewCompleted ? 'Reviewed' : 'Pending'
    });

    // 3. Wetstock Dips Recorded Check
    checkpoints.push({
      id: 'gate_wetstock_dips',
      name: 'Daily Wetstock Dip Recording',
      passed: params.wetstockVarianceRecorded,
      severity: 'WARNING',
      message: params.wetstockVarianceRecorded
        ? 'Daily physical tank stock dips recorded and calibrated successfully.'
        : 'Volumetric dip checks missing. Cannot isolate underground leak patterns.',
      actualValue: params.wetstockVarianceRecorded ? 'Logged' : 'Missing'
    });

    // 4. Nozzle Meter Continuity Gate
    if (params.previousNozzles && params.previousNozzles.length > 0) {
      let continuityPassed = true;
      let mismatchCount = 0;

      params.nozzles.forEach(noz => {
        const prev = params.previousNozzles?.find(p => p.nozzleId === noz.nozzleId);
        if (prev) {
          const delta = Math.abs(noz.openingMeter - prev.closingMeter);
          if (delta > 0.05) {
            continuityPassed = false;
            mismatchCount++;
          }
        }
      });

      checkpoints.push({
        id: 'gate_nozzle_continuity',
        name: 'Nozzle Carry-Forward Match',
        passed: continuityPassed,
        severity: 'FATAL',
        message: continuityPassed
          ? 'All active fuel meters maintain carry-forward alignment with historical shifts.'
          : `${mismatchCount} fuel nozzles broke continuity opening-to-closing meters.`,
        actualValue: continuityPassed ? 'Perfect Match' : `${mismatchCount} broken links`
      });
    } else {
      checkpoints.push({
        id: 'gate_nozzle_continuity',
        name: 'Nozzle Continuity Check',
        passed: true,
        severity: 'WARNING',
        message: 'No previous shift registers found. Baseline meter sequences initialized.',
        actualValue: 'Initialized'
      });
    }

    // 5. Cash Shortage Expanses Check (Expenses must not exceed physical cash till inflow)
    const expectedCashTill = params.openingCash + expectedCashSales + params.creditRecovery;
    const expenseCheckPassed = params.expenses <= expectedCashTill;

    checkpoints.push({
      id: 'gate_expenses_bound',
      name: 'Cash Expenses Bound Check',
      passed: expenseCheckPassed,
      severity: 'FATAL',
      message: expenseCheckPassed
        ? 'Shift expenses are within the available cash till inflows.'
        : 'Outflow expenses exceed available cash till balance.',
      actualValue: `₹${params.expenses.toFixed(2)}`,
      expectedValue: `Max allowed ₹${expectedCashTill.toFixed(2)}`
    });

    return checkpoints;
  }
}
