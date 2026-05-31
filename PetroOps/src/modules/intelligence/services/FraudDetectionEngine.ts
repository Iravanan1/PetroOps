/**
 * FraudDetectionEngine.ts
 * Rules-driven forensic intelligence service for identifying retail station anomalies.
 * Scans transactions for nozzle tampering, cash shortages, card swipe duplication, and bypasses.
 */

export interface FraudRiskAlert {
  id: string;
  category: "price_override" | "shortage_pattern" | "meter_rollback" | "double_swipe" | "credential_bypass";
  description: string;
  riskScore: number; // 0 to 100
  severity: "low" | "medium" | "high";
  timestamp: number;
  metadata: any;
}

export class FraudDetectionEngine {
  /**
   * Run transaction audit algorithms across active logs, returning risk alerts
   */
  public static evaluateFraudRisks(
    nozzleOpen: number,
    nozzleClose: number,
    officialPrice: number,
    appliedPrice: number,
    cashShortage: number, // negative is a cashier shortage
    cardTransactions: Array<{ id: string; amount: number; time: string }>,
    supervisorOverridesCount: number
  ): FraudRiskAlert[] {
    const alerts: FraudRiskAlert[] = [];

    // Rule 1: Unauthorized manual price override check
    if (appliedPrice !== officialPrice) {
      const difference = Math.abs(appliedPrice - officialPrice);
      if (difference > 0.05) { // minor price tolerance check
        alerts.push({
          id: `fraud_price_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          category: "price_override",
          description: `Price mismatch: Applied fuel price ₹${appliedPrice}/L deviates from official OMC price ₹${officialPrice}/L.`,
          riskScore: 75,
          severity: "high",
          timestamp: Date.now(),
          metadata: { officialPrice, appliedPrice, difference },
        });
      }
    }

    // Rule 2: Suspicious cashier shortages pattern
    if (cashShortage < -500.00) { // shortage exceeds 500 INR
      alerts.push({
        id: `fraud_shortage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: "shortage_pattern",
        description: `Severe Cashier Shortage: Shift closing balance ledger reports a shortage of ₹${Math.abs(cashShortage)}.`,
        riskScore: 60,
        severity: "medium",
        timestamp: Date.now(),
        metadata: { cashShortage },
      });
    }

    // Rule 3: Nozzle meter rollbacks (Mechanical counter tampering detection)
    if (nozzleClose < nozzleOpen) {
      alerts.push({
        id: `fraud_rollback_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: "meter_rollback",
        description: `CRITICAL anomaly: Nozzle closing reading ${nozzleClose} is less than starting meter ${nozzleOpen}. Indicates mechanical rollback or counter reset attempts.`,
        riskScore: 98,
        severity: "high",
        timestamp: Date.now(),
        metadata: { nozzleOpen, nozzleClose },
      });
    }

    // Rule 4: Double card swipe duplication check (swipes with exact match values)
    const amountMap: Record<number, { count: number; ids: string[] }> = {};
    cardTransactions.forEach(tx => {
      if (!amountMap[tx.amount]) {
        amountMap[tx.amount] = { count: 0, ids: [] };
      }
      amountMap[tx.amount].count += 1;
      amountMap[tx.amount].ids.push(tx.id);
    });

    Object.keys(amountMap).forEach(amtStr => {
      const amt = parseFloat(amtStr);
      const data = amountMap[amt];
      if (data.count >= 2) {
        alerts.push({
          id: `fraud_double_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          category: "double_swipe",
          description: `Potential double-billing swipe: Identified ${data.count} card transactions with matching amount ₹${amt} in active shift.`,
          riskScore: 45,
          severity: "low",
          timestamp: Date.now(),
          metadata: { amount: amt, transactionIds: data.ids },
        });
      }
    });

    // Rule 5: Password/credential supervisor overrides frequency limit check
    if (supervisorOverridesCount >= 6) {
      alerts.push({
        id: `fraud_bypass_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: "credential_bypass",
        description: `High authentication bypass rate: Supervisor credentials applied ${supervisorOverridesCount} times during shift. Indicates workflow friction or unauthorized password sharing.`,
        riskScore: 50,
        severity: "medium",
        timestamp: Date.now(),
        metadata: { supervisorOverridesCount },
      });
    }

    return alerts;
  }

  /**
   * Aggregate total risk indexes of station logs
   */
  public static calculateFrictionRiskIndex(alerts: FraudRiskAlert[]): number {
    if (alerts.length === 0) return 0;
    const maxScore = Math.max(...alerts.map(a => a.riskScore));
    return maxScore;
  }
}
