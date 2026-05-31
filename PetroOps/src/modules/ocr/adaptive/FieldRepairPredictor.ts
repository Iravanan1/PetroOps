import { HandwritingPatternMemory } from './HandwritingPatternMemory';

export interface RepairSuggestion {
  originalValue: string;
  suggestedValue: string;
  confidenceBoost: number;
  reason: string;
}

export class FieldRepairPredictor {
  
  public static predictRepair(
    operatorId: string, 
    fieldKey: string, 
    extractedValue: string, 
    mathTruthFailed: boolean
  ): RepairSuggestion | null {
    
    // Only attempt to predict a repair if math failed or it was flagged for review
    if (!mathTruthFailed) return null;

    const handwritingSuggestion = HandwritingPatternMemory.predictCorrection(operatorId, extractedValue);

    if (handwritingSuggestion && handwritingSuggestion !== extractedValue) {
      // We found a likely historical correction pattern.
      // WE DO NOT AUTO-WRITE THIS. We return it purely for the Review Dashboard.
      return {
        originalValue: extractedValue,
        suggestedValue: handwritingSuggestion,
        confidenceBoost: 15.0, // Arbitrary visual boost to indicate the system "knows" what this is
        reason: `Operator ${operatorId} frequently corrects '${extractedValue}' to '${handwritingSuggestion}' in the ${fieldKey} field.`
      };
    }

    return null;
  }
}
