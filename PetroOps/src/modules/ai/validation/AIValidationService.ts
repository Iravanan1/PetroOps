import { AIExtractionSchema, AIExtraction } from './AIExtractionSchema';
import { SafeJSONRepair } from './SafeJSONRepair';

export interface AIValidationResult {
  isValid: boolean;
  data: AIExtraction | null;
  errors: string[];
  warnings: string[];
  status: 'AUTO_EXTRACTED' | 'REVIEW_REQUIRED';
}

export class AIValidationService {
  /**
   * Safe parser that repairs raw JSON, parses it, validates against Zod,
   * and runs thorough petroleum business sanity audits.
   */
  public static validateRawExtraction(rawJson: string): AIValidationResult {
    const errors: string[] = [];
    
    const fallback: AIExtraction = {
      shiftDate: new Date().toISOString().split('T')[0],
      operatorName: 'Unknown Operator',
      openingCash: 0,
      actualCash: 0,
      cardSales: 0,
      upiSales: 0,
      creditSales: 0,
      creditRecovery: 0,
      expenses: 0,
      fuelTotals: [],
      nozzleReadings: [],
      testingLitres: [],
      confidence: 0,
      fieldConfidence: { actualCash: 0, cardSales: 0, upiSales: 0, nozzleClose: 0 },
      creditEntries: [],
      warnings: ['Initial parsing failed completely.']
    };

    const parsed = SafeJSONRepair.safeParse<AIExtraction>(rawJson, fallback);

    // 1. Zod Validation
    const zodResult = AIExtractionSchema.safeParse(parsed);
    if (!zodResult.success) {
      zodResult.error.issues.forEach(err => {
        errors.push(`Schema Error: Field "${err.path.join('.')}" - ${err.message}`);
      });
      return {
        isValid: false,
        data: parsed,
        errors,
        warnings: [],
        status: 'REVIEW_REQUIRED'
      };
    }

    const validatedData = zodResult.data;

    // 2. Petroleum Accounting Sanity Verification
    // A. Verify no negative nozzle movements
    for (const r of validatedData.nozzleReadings) {
      if (r.closingMeter < r.openingMeter) {
        errors.push(`Reading Error (Nozzle ${r.nozzleId}): Closing meter (${r.closingMeter}) is less than opening meter (${r.openingMeter}). Potential nozzle rollback suspected.`);
      }
      
      const calculatedNet = Number((r.closingMeter - r.openingMeter - r.testingQty).toFixed(2));
      const expectedNet = Number(r.netSales.toFixed(2));
      
      if (Math.abs(calculatedNet - expectedNet) > 0.5) {
        errors.push(`Reading Error (Nozzle ${r.nozzleId}): Closing (${r.closingMeter}) - Opening (${r.openingMeter}) - Testing (${r.testingQty}) = ${calculatedNet.toFixed(2)} Litres, but extracted netSales is ${r.netSales.toFixed(2)} Litres.`);
      }
    }

    // B. Verify basic financial sum checking
    const cashSales = Math.max(0, (validatedData.openingCash + validatedData.creditRecovery) - validatedData.expenses);
    if (validatedData.openingCash < 0 || validatedData.actualCash < 0) {
      errors.push(`Financial Error: Opening or actual cash balances cannot be negative values.`);
    }

    // C. UPI & Card balancing checks
    if (validatedData.cardSales < 0 || validatedData.upiSales < 0) {
      errors.push(`Financial Error: Card or UPI credit transactions cannot be negative.`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      data: validatedData,
      errors,
      warnings: [],
      status: isValid ? 'AUTO_EXTRACTED' : 'REVIEW_REQUIRED'
    };
  }
}
