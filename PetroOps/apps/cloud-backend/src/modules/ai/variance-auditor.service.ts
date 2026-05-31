import { Injectable } from '@nestjs/common';

export interface AnomalyAssessment {
  anomalyScore: number;
  classification: 'THEFT_SUSPECTED' | 'CRITICAL_LEAK' | 'STABLE';
  confidenceRating: number;
  message: string;
}

@Injectable()
export class VarianceAuditorService {
  /**
   * Evaluates volume losses, generating a confidence rating of theft/leak anomalies.
   */
  public evaluateTheftAnomalousScore(
    atgLossLiters: number,
    recordedSalesLiters: number,
    durationHours: number
  ): AnomalyAssessment {
    const variance = atgLossLiters - recordedSalesLiters;
    const lossPerHour = durationHours > 0 ? variance / durationHours : 0.0;

    let anomalyScore = 0.0;
    let classification: 'THEFT_SUSPECTED' | 'CRITICAL_LEAK' | 'STABLE' = 'STABLE';
    let confidenceRating = 0.98;
    let message = 'Station telemetry indices operating inside safe bounds.';

    // Any discrepancy greater than 10 liters initiates evaluation
    if (variance > 10.0) {
      // Scale anomaly score up to 1.0
      anomalyScore = Math.min(1.0, (variance - 10.0) / 100.0);

      if (lossPerHour > 20.0) {
        classification = 'THEFT_SUSPECTED';
        confidenceRating = 0.88;
        message = `Alert: High rate fuel loss detected (${lossPerHour.toFixed(1)} L/hr). Fuel theft suspected.`;
      } else {
        classification = 'CRITICAL_LEAK';
        confidenceRating = 0.91;
        message = `Warning: Chronic slow fuel volume leakage detected (${lossPerHour.toFixed(1)} L/hr). Wetstock inspection recommended.`;
      }
    }

    return {
      anomalyScore,
      classification,
      confidenceRating,
      message
    };
  }

  /**
   * Scans shift cash sheets, flagging shifts where cash expected vs manual cash collected
   * variance values exceed standard bounds.
   */
  public evaluateSuspiciousShift(
    cashExpected: number,
    cashCollected: number
  ): { isSuspicious: boolean; varianceScore: number; riskRating: 'HIGH' | 'MEDIUM' | 'NONE' } {
    const variance = Math.abs(cashExpected - cashCollected);
    
    let riskRating: 'HIGH' | 'MEDIUM' | 'NONE' = 'NONE';
    let isSuspicious = false;
    let varianceScore = 0.0;

    if (variance > 500.0) {
      isSuspicious = true;
      riskRating = 'HIGH';
      varianceScore = Math.min(1.0, variance / 5000.0);
    } else if (variance > 100.0) {
      isSuspicious = true;
      riskRating = 'MEDIUM';
      varianceScore = Math.min(1.0, variance / 5000.0);
    }

    return {
      isSuspicious,
      varianceScore,
      riskRating
    };
  }
}
