export type OCRValidationStatus = 'AUTO_EXTRACTED' | 'REVIEW_REQUIRED' | 'MANAGER_VERIFIED' | 'AUDITOR_APPROVED' | 'LOCKED';

export interface StrictFieldExtraction<T> {
  value: T | null;
  confidence: number;
  sourceEngine: 'PaddleOCR' | 'EasyOCR' | 'Qwen2.5-VL' | 'Claude' | 'Consensus' | 'Local';
  validationStatus: OCRValidationStatus;
  consensusAgreementPercent: number;
  mathematicalVerificationState: 'PENDING' | 'PASSED' | 'FAILED';
  hallucinationRisk: boolean;
}

export class OCRConfidenceMatrix {
  public static readonly STRICT_THRESHOLD = 95.0; // 95% confidence required for auto-extraction
  public static readonly CONSENSUS_THRESHOLD = 75.0; // At least 3 out of 4 models agree
  
  public static checkHallucinationRisk(fieldConfidence: number, agreement: number): boolean {
    return fieldConfidence < this.STRICT_THRESHOLD || agreement < this.CONSENSUS_THRESHOLD;
  }
}
