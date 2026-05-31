export interface CorrectionEvent {
  eventId: string;
  timestamp: string;
  branchId: string;
  operatorId: string;
  fieldKey: string;
  originalOCR: string;
  correctedValue: string;
  anomalyDetected: boolean;
  modelConfidenceAtTime: number;
}

export class CorrectionFeedbackEngine {
  private static eventLog: CorrectionEvent[] = [];

  public static recordCorrection(
    branchId: string,
    operatorId: string,
    fieldKey: string,
    originalOCR: string,
    correctedValue: string,
    confidence: number
  ): void {
    const isAnomaly = this.detectAnomaly(originalOCR, correctedValue);
    
    const event: CorrectionEvent = {
      eventId: `corr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      branchId,
      operatorId,
      fieldKey,
      originalOCR,
      correctedValue,
      anomalyDetected: isAnomaly,
      modelConfidenceAtTime: confidence
    };

    this.eventLog.push(event);
    console.log(`[CorrectionFeedback] Logged correction for ${fieldKey}. Anomaly: ${isAnomaly}`);
  }

  private static detectAnomaly(original: string, corrected: string): boolean {
    // Basic heuristic for drastic changes (e.g. OCR read '10' but user typed '1000')
    if (Math.abs(original.length - corrected.length) > 2) return true;
    return false;
  }

  public static getLogs(): CorrectionEvent[] {
    return this.eventLog;
  }
}
