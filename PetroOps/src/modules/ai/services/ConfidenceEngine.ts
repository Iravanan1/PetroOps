import { db } from '../../../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { OCRLearningFeedbackService } from './OCRLearningFeedbackService';

export interface ConfidenceMetrics {
  ocrScore: number;
  aiScore: number;
  reconciliationScore: number;
  correctionPenalty: number;
  imageQualityScore?: number;
  handwritingDensity?: number;
}

export class ConfidenceEngine {
  /**
   * Evaluates whole-shift reliability using weighted indices across OCR, AI,
   * deterministic balance scores, visual image quality, handwriting density, and historic correction rates.
   */
  public static calculateOverallConfidence(
    shiftId: string,
    metrics: ConfidenceMetrics,
    branchId: string
  ): number {
    const ocrWeight = 0.25;
    const aiWeight = 0.35;
    const reconWeight = 0.40;

    // Compute weighted components
    let baseConfidence =
      metrics.ocrScore * ocrWeight +
      metrics.aiScore * aiWeight +
      metrics.reconciliationScore * reconWeight;

    // Visual quality penalty: deduct if quality is below the 80 threshold
    if (metrics.imageQualityScore !== undefined && metrics.imageQualityScore < 80) {
      const qDiff = 80 - metrics.imageQualityScore;
      baseConfidence -= qDiff * 0.5; // Up to 40% penalty for completely blurry images
    }

    // Handwriting penalty: deduct up to 15% confidence for heavy handwriting density
    if (metrics.handwritingDensity !== undefined && metrics.handwritingDensity > 0) {
      baseConfidence -= metrics.handwritingDensity * 0.15;
    }

    // Accumulate learning feedback field bias penalties
    let feedbackPenalty = 0;
    const fields = ['openingCash', 'actualCash', 'cardSales', 'upiSales', 'creditSales', 'creditRecovery', 'expenses'];
    fields.forEach(f => {
      const modifier = OCRLearningFeedbackService.getFieldBiasModifier(f); // negative value or zero
      feedbackPenalty += Math.abs(modifier) * 100; // convert 0.15 to 15 points
    });

    baseConfidence -= (metrics.correctionPenalty * 5) + feedbackPenalty;

    const finalConfidence = Math.max(0, Math.min(100, baseConfidence));

    // Log the calculation details in Firestore for long-term Observability audits
    this.logConfidenceRun(shiftId, metrics, finalConfidence, branchId).catch(err => {
      console.warn("[ConfidenceEngine] Firestore telemetry logging skipped in offline sandboxes.");
    });

    return Number(finalConfidence.toFixed(2));
  }

  private static async logConfidenceRun(
    shiftId: string,
    metrics: ConfidenceMetrics,
    score: number,
    branchId: string
  ): Promise<void> {
    const logData = {
      shiftId,
      branchId,
      ...metrics,
      finalScore: score,
      timestamp: new Date().toISOString()
    };
    
    try {
      await addDoc(collection(db, "ocrConfidenceLogs"), logData);
    } catch (e) {
      // Offline fallback
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`conf_log_${shiftId}`, JSON.stringify(logData));
      } catch (err) {
        // Safe catch for environment issues
      }
    }
  }
}
