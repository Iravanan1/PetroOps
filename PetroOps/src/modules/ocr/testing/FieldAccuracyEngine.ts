/**
 * FieldAccuracyEngine.ts
 * Categorizes and aggregates accuracy scores across petrol pump operations domains.
 */

import { type FieldAccuracyReport } from "./OCRAccuracyBenchmarkEngine";

export interface DomainAccuracyMetrics {
  nozzleAccuracy: number;
  cashAccuracy: number;
  upiAccuracy: number;
  creditAccuracy: number;
  wetstockAccuracy: number;
  expenseAccuracy: number;
}

export class FieldAccuracyEngine {
  /**
   * Group reports by specific petroleum operating domains and compute aggregations
   */
  public static calculateDomainMetrics(reports: FieldAccuracyReport[]): DomainAccuracyMetrics {
    const nozzleScores: number[] = [];
    const cashScores: number[] = [];
    const upiScores: number[] = [];
    const creditScores: number[] = [];
    const wetstockScores: number[] = [];
    const expenseScores: number[] = [];

    reports.forEach(r => {
      const key = r.field.toLowerCase();

      if (key.includes("nozzle") || key.includes("meter") || key.includes("nz")) {
        nozzleScores.push(r.score);
      } else if (key.includes("cash") || key.includes("till") || key.includes("handover")) {
        cashScores.push(r.score);
      } else if (key.includes("upi") || key.includes("qr") || key.includes("deep")) {
        upiScores.push(r.score);
      } else if (key.includes("credit") || key.includes("ledger") || key.includes("account")) {
        creditScores.push(r.score);
      } else if (key.includes("wetstock") || key.includes("dip") || key.includes("volume") || key.includes("stock")) {
        wetstockScores.push(r.score);
      } else if (key.includes("expense") || key.includes("cost") || key.includes("disbursment")) {
        expenseScores.push(r.score);
      }
    });

    return {
      nozzleAccuracy: this.average(nozzleScores),
      cashAccuracy: this.average(cashScores),
      upiAccuracy: this.average(upiScores),
      creditAccuracy: this.average(creditScores),
      wetstockAccuracy: this.average(wetstockScores),
      expenseAccuracy: this.average(expenseScores)
    };
  }

  private static average(scores: number[]): number {
    if (scores.length === 0) return 100; // Default to perfect if domain wasn't present
    const sum = scores.reduce((a, b) => a + b, 0);
    return Number((sum / scores.length).toFixed(1));
  }
}
