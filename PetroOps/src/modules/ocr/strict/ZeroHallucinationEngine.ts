import { OCRConfidenceMatrix, StrictFieldExtraction } from './OCRConfidenceMatrix';
import { MathematicalTruthEngine } from './MathematicalTruthEngine';

export class ZeroHallucinationEngine {
  
  public static extractField<T>(
    rawValue: T, 
    confidence: number, 
    agreement: number, 
    source: 'PaddleOCR' | 'EasyOCR' | 'Qwen2.5-VL' | 'Claude' | 'Consensus' | 'Local'
  ): StrictFieldExtraction<T> {
    const isHallucinationRisk = OCRConfidenceMatrix.checkHallucinationRisk(confidence, agreement);

    let mathState: 'PENDING' | 'PASSED' | 'FAILED' = 'PENDING';
    
    // Quick number validation if applicable
    if (typeof rawValue === 'number') {
      if (!MathematicalTruthEngine.rejectNegativeMovement(rawValue)) {
        mathState = 'FAILED';
      } else {
        mathState = 'PASSED';
      }
    }

    if (isHallucinationRisk || mathState === 'FAILED') {
      return {
        value: null, // Zero assumed numbers. Nullify if low confidence
        confidence,
        sourceEngine: source,
        validationStatus: 'REVIEW_REQUIRED',
        consensusAgreementPercent: agreement,
        mathematicalVerificationState: mathState,
        hallucinationRisk: true
      };
    }

    return {
      value: rawValue,
      confidence,
      sourceEngine: source,
      validationStatus: 'AUTO_EXTRACTED',
      consensusAgreementPercent: agreement,
      mathematicalVerificationState: mathState,
      hallucinationRisk: false
    };
  }
}
