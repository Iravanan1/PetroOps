import { ZeroHallucinationEngine } from './ZeroHallucinationEngine';
import { StrictFieldExtraction } from './OCRConfidenceMatrix';

export interface ModelOutput {
  engineName: 'PaddleOCR' | 'EasyOCR' | 'Qwen2.5-VL' | 'Claude';
  extractedValue: number | string;
  confidence: number;
}

export class StrictConsensusEngine {
  
  public static evaluateConsensus<T>(outputs: ModelOutput[]): StrictFieldExtraction<T> {
    if (outputs.length === 0) {
      return ZeroHallucinationEngine.extractField(null as T, 0, 0, 'Consensus');
    }

    const valueCounts = new Map<string, number>();
    let maxCount = 0;
    let agreedValueStr = '';
    let avgConfidence = 0;

    outputs.forEach(out => {
      const valStr = String(out.extractedValue).toLowerCase().trim();
      const current = (valueCounts.get(valStr) || 0) + 1;
      valueCounts.set(valStr, current);
      avgConfidence += out.confidence;
      
      if (current > maxCount) {
        maxCount = current;
        agreedValueStr = valStr;
      }
    });

    avgConfidence = avgConfidence / outputs.length;
    const agreementPercent = (maxCount / outputs.length) * 100.0;

    // Type casting logic (simplified for this engine)
    let finalValue: any = agreedValueStr;
    const isNum = !isNaN(Number(agreedValueStr));
    if (isNum && agreedValueStr !== '') {
      finalValue = Number(agreedValueStr);
    }

    return ZeroHallucinationEngine.extractField<T>(finalValue as T, avgConfidence, agreementPercent, 'Consensus');
  }
}
