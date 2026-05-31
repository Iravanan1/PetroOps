/**
 * RiskScoringService.ts
 * ──────────────────────
 * Compiles a mathematical risk score (0 to 100) for shifts, operators, and
 * station registers based on the density of active anomalies and cash shortfalls.
 */

import { OperationalAnomaly } from './OperationalAnomalyEngine';

export class RiskScoringService {
  /**
   * Computes a risk rating based on active anomalies and shortages
   * 0 = Perfect, 100 = Extremely High Risk
   */
  public static calculateRiskScore(anomalies: OperationalAnomaly[], cashShortage: number): {
    score: number;
    rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    auditPriority: 'STANDARD' | 'MONITOR' | 'IMMEDIATE_ACTION';
  } {
    let score = 0;

    // Weight anomalies by severity
    anomalies.forEach(a => {
      if (a.severity === 'CRITICAL') {
        score += 35;
      } else if (a.severity === 'WARN') {
        score += 15;
      } else {
        score += 5;
      }
    });

    // Shortage impact weighting
    if (cashShortage > 1000) {
      score += 40;
    } else if (cashShortage > 500) {
      score += 20;
    } else if (cashShortage > 100) {
      score += 10;
    }

    // Cap score at 100
    const finalScore = Math.min(100, score);

    let rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let auditPriority: 'STANDARD' | 'MONITOR' | 'IMMEDIATE_ACTION' = 'STANDARD';

    if (finalScore >= 75) {
      rating = 'CRITICAL';
      auditPriority = 'IMMEDIATE_ACTION';
    } else if (finalScore >= 45) {
      rating = 'HIGH';
      auditPriority = 'IMMEDIATE_ACTION';
    } else if (finalScore >= 20) {
      rating = 'MEDIUM';
      auditPriority = 'MONITOR';
    }

    return {
      score: finalScore,
      rating,
      auditPriority
    };
  }
}

export default RiskScoringService;
