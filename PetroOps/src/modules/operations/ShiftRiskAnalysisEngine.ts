/**
 * ShiftRiskAnalysisEngine.ts
 * ───────────────────────────
 * Evaluates shift parameters (till parities, digital splits, OCR uncertainty indexes,
 * manual override frequencies) to score shifts by audit priority levels.
 */

export interface ShiftRiskReport {
  shiftId: string;
  riskScore: number; // 0 to 100
  auditPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendation: string;
}

export class ShiftRiskAnalysisEngine {
  /**
   * Evaluates shift registers to compute audit risk indicators
   */
  public static analyzeShiftRisk(params: {
    shiftId: string;
    cashShortage: number;
    upiMismatch: number;
    manualOverridesCount: number;
    ocrConfidence: number;
  }): ShiftRiskReport {
    let score = 0;
    const factors: string[] = [];

    // Shortages check
    if (params.cashShortage > 500) {
      score += 35;
      factors.push(`Unresolved cash shortage: ₹${params.cashShortage.toLocaleString()}`);
    } else if (params.cashShortage > 100) {
      score += 15;
      factors.push(`Minor cash shortage: ₹${params.cashShortage.toLocaleString()}`);
    }

    // UPI mismatch check
    if (params.upiMismatch > 200) {
      score += 25;
      factors.push(`Merchant settlement mismatch: ₹${params.upiMismatch.toLocaleString()}`);
    }

    // Overrides check
    if (params.manualOverridesCount > 3) {
      score += 20;
      factors.push(`${params.manualOverridesCount} manual register overrides`);
    }

    // OCR check
    if (params.ocrConfidence < 75) {
      score += 20;
      factors.push(`Low VLM OCR extraction confidence (${params.ocrConfidence}%)`);
    }

    const finalScore = Math.min(100, score);
    
    let auditPriority: ShiftRiskReport['auditPriority'] = 'LOW';
    let recommendation = 'Standard shift seal approved.';

    if (finalScore >= 75) {
      auditPriority = 'CRITICAL';
      recommendation = 'IMMEDIATE AUDIT REQUIRED: Block auto-sealing and run an independent pump reading verification.';
    } else if (finalScore >= 45) {
      auditPriority = 'HIGH';
      recommendation = 'HIGH PRIORITY: Supervisor manual review of card/UPI slip invoices recommended before approval.';
    } else if (finalScore >= 20) {
      auditPriority = 'MEDIUM';
      recommendation = 'ROUTINE REVIEW: Verify attendant cash count ledger sheets.';
    }

    return {
      shiftId: params.shiftId,
      riskScore: finalScore,
      auditPriority,
      factors,
      recommendation
    };
  }
}

export default ShiftRiskAnalysisEngine;
