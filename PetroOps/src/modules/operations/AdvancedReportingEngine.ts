/**
 * AdvancedReportingEngine.ts
 * ──────────────────────────
 * Generates advanced business intelligence summaries, fuel shortages tolerance indicators,
 * credit recoveries customer exposing metrics, and digital gateway performance analytics.
 */

export interface ShortageReport {
  fuelType: 'MS' | 'HSD';
  openingStock: number;
  receivedStock: number;
  salesStock: number;
  closingStock: number;
  physicalStock: number;
  varianceAmount: number;
  variancePct: number;
  toleranceLimitPct: number;
  toleranceStatus: 'PASSED' | 'WARNING' | 'FAIL';
}

export interface CreditRecoveryReport {
  customerId: string;
  name: string;
  totalSales: number;
  totalRecovered: number;
  outstandingBalance: number;
  averageDaysToRecover: number;
  recoveryRatio: number;
}

export class AdvancedReportingEngine {
  /**
   * Calculates fuel stock variance shortage and leakage profiles
   */
  public static calculateShortages(params: {
    fuelType: 'MS' | 'HSD';
    opening: number;
    received: number;
    sales: number;
    physical: number;
  }): ShortageReport {
    // Expected stock = Opening + Received - Sales
    const expected = params.opening + params.received - params.sales;
    const variance = params.physical - expected; // Negative means shortage
    const variancePct = expected > 0 ? (variance / expected) * 100 : 0;
    
    // Standard industry evaporation/handling tolerance is 0.6%
    const toleranceLimit = -0.6;
    let status: ShortageReport['toleranceStatus'] = 'PASSED';
    if (variancePct < toleranceLimit) {
      status = 'FAIL';
    } else if (variancePct < 0) {
      status = 'WARNING';
    }

    return {
      fuelType: params.fuelType,
      openingStock: params.opening,
      receivedStock: params.received,
      salesStock: params.sales,
      closingStock: expected,
      physicalStock: params.physical,
      varianceAmount: parseFloat(variance.toFixed(2)),
      variancePct: parseFloat(variancePct.toFixed(2)),
      toleranceLimitPct: toleranceLimit,
      toleranceStatus: status
    };
  }

  /**
   * Generates mock baseline shortages reports list
   */
  public static getShortages(selectedMonth: string): ShortageReport[] {
    return [
      this.calculateShortages({ fuelType: 'MS', opening: 18000, received: 12000, sales: 14500, physical: 15410 }), // expected 15500, physical 15410 => -90L (shortage)
      this.calculateShortages({ fuelType: 'HSD', opening: 24000, received: 20000, sales: 18200, physical: 25750 }) // expected 25800, physical 25750 => -50L
    ];
  }

  /**
   * Generates mock customer credit recovery analysis
   */
  public static getCreditRecoveries(selectedMonth: string): CreditRecoveryReport[] {
    return [
      { customerId: 'c-001', name: 'Vilas Transports MH', totalSales: 188000, totalRecovered: 125000, outstandingBalance: 63000, averageDaysToRecover: 12, recoveryRatio: 66.4 },
      { customerId: 'c-002', name: 'Kalyani Logistics Ltd', totalSales: 345000, totalRecovered: 320000, outstandingBalance: 25000, averageDaysToRecover: 18, recoveryRatio: 92.7 },
      { customerId: 'c-003', name: 'Pune Municipal Transit Corp', totalSales: 850000, totalRecovered: 400000, outstandingBalance: 450000, averageDaysToRecover: 45, recoveryRatio: 47.0 }
    ];
  }
}
