/**
 * OCRReviewOptimizationService.ts
 * 
 * Enhances manager review speed by mapping and prioritizing low-confidence fields,
 * suggesting handwriting replacements, and providing fast-validation override vectors.
 */

import { OperatorCorrectionPatterns } from './OperatorCorrectionPatterns';
import { SmartNozzleContinuityEngine, ContinuityViolation } from './SmartNozzleContinuityEngine';
import { NozzleReading } from '../../ai/validation/AIExtractionSchema';

export interface FieldFocusPriority {
  fieldKey: string;
  reason: string;
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedValue?: any;
}

export class OCRReviewOptimizationService {
  /**
   * Evaluates entire extraction states and generates a sequence of fields that require focused validation
   */
  public static computeReviewPriorities(
    operatorId: string,
    fieldConfidence: Record<string, number>,
    nozzles: NozzleReading[],
    previousNozzles?: NozzleReading[]
  ): FieldFocusPriority[] {
    const priorities: FieldFocusPriority[] = [];

    // 1. Analyze nozzle continuity violations (Highest priority)
    const nozzleReport = SmartNozzleContinuityEngine.evaluateNozzleContinuity(nozzles, previousNozzles);
    nozzleReport.violations.forEach(violation => {
      if (violation.severity === 'CRITICAL') {
        priorities.push({
          fieldKey: `nozzles.${violation.nozzleId}`,
          reason: `Meter continuity break: ${violation.message}`,
          priorityLevel: 'HIGH',
          suggestedValue: violation.suggestedCorrection
        });
      }
    });

    // 2. Map low-confidence fields
    Object.keys(fieldConfidence).forEach(fieldKey => {
      const conf = fieldConfidence[fieldKey];
      if (conf < 0.75) {
        // Look up if we have handwriting predictions for this operator
        const handwritingPredict = OperatorCorrectionPatterns.predictCorrection(operatorId, String(conf));
        
        priorities.push({
          fieldKey,
          reason: `Low OCR engine confidence (${Math.round(conf * 100)}%). Verification required.`,
          priorityLevel: conf < 0.5 ? 'HIGH' : 'MEDIUM',
          suggestedValue: handwritingPredict?.suggestion
        });
      }
    });

    // Sort: HIGH priority first, then MEDIUM, then LOW
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorities.sort((a, b) => order[a.priorityLevel] - order[b.priorityLevel]);
  }

  /**
   * Suggests quick-approval chips for speedy touch interaction on tablets
   */
  public static getQuickCorrectionChips(fieldKey: string, currentValue: string): string[] {
    const chips: string[] = [];

    if (fieldKey.includes('Name') || fieldKey.includes('operator')) {
      // Suggest generic shift names
      chips.push('Sanjay Kumar', 'Amit Singh', 'Ramesh Lal');
    } else if (fieldKey.includes('upi') || fieldKey.includes('card') || fieldKey.includes('sales')) {
      const numeric = parseFloat(currentValue.replace(/[^\d.-]/g, ''));
      if (!isNaN(numeric)) {
        chips.push(String(Math.round(numeric)), String(Math.round(numeric * 10) / 10));
      }
    }

    return chips;
  }
}
