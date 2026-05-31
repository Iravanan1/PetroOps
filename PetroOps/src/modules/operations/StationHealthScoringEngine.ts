/**
 * StationHealthScoringEngine.ts
 * ─────────────────────────────
 * Calculates explainable, non-blackbox health scores for petrol stations.
 * Covers: wetstock variance, digital reconciliation accuracy, cashier cash shortages, and credit collections speed.
 */

export interface HealthScoreBreakdown {
  component: string;
  score: number; // 0 - 100
  weightPct: number;
  explanation: string;
}

export interface StationHealthGrade {
  overallScore: number;
  overallGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CRITICAL';
  breakdowns: HealthScoreBreakdown[];
  riskIndicators: string[];
}

export class StationHealthScoringEngine {
  /**
   * Computes weighted scorecard for a station
   */
  public static evaluateStation(params: {
    upiMatchRate: number;      // e.g. 98 (%)
    cashShortageSum: number;   // e.g. 450 (INR)
    wetstockVariancePct: number; // e.g. -0.4 (%)
    averageDaysToRecoverCredit: number; // e.g. 15 (days)
    ocrValidationRate: number; // e.g. 95 (%)
  }): StationHealthGrade {
    const breakdowns: HealthScoreBreakdown[] = [];
    const riskIndicators: string[] = [];

    // 1. Digital Reconciliation Quality (30%)
    let upiScore = params.upiMatchRate;
    if (upiScore < 90) riskIndicators.push('High digital collection mismatch gap detected.');
    breakdowns.push({
      component: 'Digital Reconciliation',
      score: upiScore,
      weightPct: 30,
      explanation: `UPI Paytm/PhonePe settlement credit match rate is at ${params.upiMatchRate}%.`
    });

    // 2. Cash Shortage Discipline (25%)
    let cashScore = 100;
    if (params.cashShortageSum > 2000) {
      cashScore = 30;
      riskIndicators.push('Critical monthly shift cash shortages exceeding threshold.');
    } else if (params.cashShortageSum > 500) {
      cashScore = 70;
      riskIndicators.push('Mild shift cash shortfalls detected.');
    }
    breakdowns.push({
      component: 'Cashier Shortage Control',
      score: cashScore,
      weightPct: 25,
      explanation: `Total cumulative monthly shift shortage is ₹${params.cashShortageSum.toLocaleString()}.`
    });

    // 3. Wetstock Stock Reliability (20%)
    let wetstockScore = 100;
    const absVar = Math.abs(params.wetstockVariancePct);
    if (absVar > 0.6) {
      wetstockScore = 40;
      riskIndicators.push('Wetstock fuel evaporation/shortage exceeds standard 0.6% limit.');
    } else if (absVar > 0.3) {
      wetstockScore = 80;
    }
    breakdowns.push({
      component: 'Wetstock Variance Control',
      score: wetstockScore,
      weightPct: 20,
      explanation: `Physical fuel dip stock shrinkage variance is at ${params.wetstockVariancePct}%.`
    });

    // 4. Credit Collection Discipline (15%)
    let recoveryScore = 100;
    if (params.averageDaysToRecoverCredit > 30) {
      recoveryScore = 40;
      riskIndicators.push('Customer credit recovery cycle exceeds safe 30 days limit.');
    } else if (params.averageDaysToRecoverCredit > 15) {
      recoveryScore = 75;
    }
    breakdowns.push({
      component: 'Customer Dues Recovery',
      score: recoveryScore,
      weightPct: 15,
      explanation: `Average customer outstanding dues recovery cycle is ${params.averageDaysToRecoverCredit} days.`
    });

    // 5. OCR Confidence Accuracy (10%)
    let ocrScore = params.ocrValidationRate;
    if (ocrScore < 85) riskIndicators.push('High manual correction overrides on nozzle meter OCR ingestion.');
    breakdowns.push({
      component: 'OCR Meter Continuity',
      score: ocrScore,
      weightPct: 10,
      explanation: `Ingested shift meter nozzle OCR confidence is at ${params.ocrValidationRate}%.`
    });

    // Calculate overall weighted score
    const overall = breakdowns.reduce((sum, item) => sum + (item.score * item.weightPct / 100), 0);
    const overallScore = parseFloat(overall.toFixed(0));

    let overallGrade: StationHealthGrade['overallGrade'] = 'EXCELLENT';
    if (overallScore < 60) overallGrade = 'CRITICAL';
    else if (overallScore < 80) overallGrade = 'FAIR';
    else if (overallScore < 92) overallGrade = 'GOOD';

    return {
      overallScore,
      overallGrade,
      breakdowns,
      riskIndicators
    };
  }
}
