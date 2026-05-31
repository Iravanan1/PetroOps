/**
 * OperationalAnomalyEngine.ts
 * ───────────────────────────
 * Analyzes active shifts, nozzle registries, and cash books to flag
 * operational leakages, fraud signals, and carry-forward continuity breaches.
 */

export interface OperationalAnomaly {
  id: string;
  category: 'CASH_SHORTAGE' | 'NOZZLE_CONTINUITY' | 'UPI_MISMATCH' | 'WETSTOCK_SHRINKAGE' | 'CREDIT_DELAY';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  title: string;
  description: string;
  probableCause: string;
  suggestedCorrection: string;
  timestamp: string;
}

export class OperationalAnomalyEngine {
  /**
   * Scans shift parameters to generate prioritized list of anomalies
   */
  public static detectAnomalies(params: {
    actualCash: number;
    openingCash: number;
    upiSales: number;
    actualUpiSales: number;
    nozzleContinuityGaps: boolean;
    wetstockVariance: number;
    overdueDays: number;
  }): OperationalAnomaly[] {
    const anomalies: OperationalAnomaly[] = [];

    // 1. Till Cash Shortage Check
    const cashDiscrepancy = params.openingCash - params.actualCash;
    if (cashDiscrepancy > 500) {
      anomalies.push({
        id: `an_cash_${Date.now()}`,
        category: 'CASH_SHORTAGE',
        severity: 'CRITICAL',
        title: 'Abnormal Cash Drawer Shortage',
        description: `Till cash counted has a gap of ₹${cashDiscrepancy.toLocaleString()} against opening float bounds.`,
        probableCause: 'Attendant miscalculation or unlogged operator expenses.',
        suggestedCorrection: 'Perform a detailed review of shift expense vouchers.',
        timestamp: new Date().toISOString()
      });
    }

    // 2. UPI Merchant Mismatch
    const upiGap = Math.abs(params.upiSales - params.actualUpiSales);
    if (upiGap > 100) {
      anomalies.push({
        id: `an_upi_${Date.now()}`,
        category: 'UPI_MISMATCH',
        severity: 'WARN',
        title: 'UPI Merchant Settlement Gap',
        description: `Manual UPI sales record has a discrepancy of ₹${upiGap.toLocaleString()} against actual portal transactions.`,
        probableCause: 'Customer QR scans pending bank settlements or missing manual logs.',
        suggestedCorrection: 'Re-verify merchant dashboard logs for duplicate entry references.',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Nozzle Continuity gaps
    if (params.nozzleContinuityGaps) {
      anomalies.push({
        id: `an_noz_${Date.now()}`,
        category: 'NOZZLE_CONTINUITY',
        severity: 'CRITICAL',
        title: 'Nozzle Closing Meter Continuity Gap',
        description: 'Opening nozzle meters on this shift do not align with previous shift closing baseline.',
        probableCause: 'Unlogged calibration runs or manual totalizer adjustments.',
        suggestedCorrection: 'Verify calibration cans logs and authorize a meter sync override.',
        timestamp: new Date().toISOString()
      });
    }

    // 4. Wetstock evaporations
    if (params.wetstockVariance < -100) {
      anomalies.push({
        id: `an_wet_${Date.now()}`,
        category: 'WETSTOCK_SHRINKAGE',
        severity: 'CRITICAL',
        title: 'Critical Wetstock Variance Detected',
        description: `Volumetric shrinkage of ${Math.abs(params.wetstockVariance)}L exceeds safety evaporation tolerances.`,
        probableCause: 'Possible pipe leakage, thermal tank contraction, or stock theft.',
        suggestedCorrection: 'Trigger a pressure check on tank delivery pipelines immediately.',
        timestamp: new Date().toISOString()
      });
    }

    return anomalies;
  }
}

export default OperationalAnomalyEngine;
