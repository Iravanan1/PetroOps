import { GroundTruthLabel } from '../dataset/OCRDatasetManager';

export interface ValidationResult {
  overallAccuracy: number;
  fieldLevelAccuracy: Record<string, number>;
  lineLevelAccuracy: number;
  totalFields: number;
  matchedFields: number;
}

export class GroundTruthValidationEngine {
  public static validate(
    extractedFields: Record<string, string | number>,
    groundTruth: GroundTruthLabel[]
  ): ValidationResult {
    let matchedFields = 0;
    const fieldLevelAccuracy: Record<string, number> = {};
    
    groundTruth.forEach(truth => {
      const extracted = extractedFields[truth.field];
      const match = String(extracted).toLowerCase().trim() === String(truth.expectedValue).toLowerCase().trim();
      
      if (match) matchedFields++;
      fieldLevelAccuracy[truth.field] = match ? 100 : 0;
    });

    const totalFields = groundTruth.length;
    const overallAccuracy = totalFields === 0 ? 100 : (matchedFields / totalFields) * 100;

    return {
      overallAccuracy,
      fieldLevelAccuracy,
      lineLevelAccuracy: overallAccuracy, // simplified
      totalFields,
      matchedFields
    };
  }
}
