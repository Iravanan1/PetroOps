/**
 * OCRLearningEngine.ts
 * 
 * Master learning engine for Final_PumpAI OCR optimization.
 * Orchestrates manual correction registers, layout learning drift, handwriting profiling,
 * and feeds data into the offline correction memory.
 */

import { OCRCorrectionMemory, OCRCorrectionRecord } from './OCRCorrectionMemory';
import { OperatorCorrectionPatterns } from './OperatorCorrectionPatterns';
import { LayoutLearningRegistry } from './LayoutLearningRegistry';
import { OperatorCorrectionTrainer } from './OperatorCorrectionTrainer';
import { HandwritingGlossary } from './HandwritingGlossary';

export interface ManagerMutationSummary {
  fieldKey: string;
  oldValue: any;
  newValue: any;
  overrideReason?: string;
  latencyMs?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export class OCRLearningEngine {
  /**
   * Called upon supervisor shift approval to feed all corrections/mutations into
   * the self-improving operational learning loops.
   */
  public static receiveManagerCorrection(
    operatorId: string,
    stationId: string,
    fileName: string,
    mutations: ManagerMutationSummary[]
  ): void {
    if (!mutations || mutations.length === 0) {
      console.log('[OCRLearningEngine] No manual overrides detected for learning processing.');
      return;
    }

    mutations.forEach(mutation => {
      const originalValue = String(mutation.oldValue ?? '');
      const correctedValue = String(mutation.newValue ?? '');

      if (originalValue === correctedValue) return;

      // Programmatically extract category based on mutation.fieldKey patterns
      let category: 'CUSTOMER_NAME' | 'LEDGER_TERM' | 'NOZZLE_LABEL' | 'OPERATIONAL_TERM' = 'OPERATIONAL_TERM';
      const fkLower = mutation.fieldKey.toLowerCase();
      if (fkLower.includes('customer') || fkLower.includes('debtor') || fkLower.includes('name')) {
        category = 'CUSTOMER_NAME';
      } else if (fkLower.includes('nozzle') || fkLower.includes('meter') || fkLower.includes('reading') || fkLower.includes('sales')) {
        category = 'NOZZLE_LABEL';
      } else if (fkLower.includes('ledger') || fkLower.includes('credit') || fkLower.includes('term') || fkLower.includes('payment') || fkLower.includes('upi') || fkLower.includes('cash') || fkLower.includes('amount') || fkLower.includes('total')) {
        category = 'LEDGER_TERM';
      }

      // Programmatically extract language
      const hasHindi = /[\u0900-\u097F]/.test(originalValue) || /[\u0900-\u097F]/.test(correctedValue);
      const hasEnglish = /[a-zA-Z]/.test(originalValue) || /[a-zA-Z]/.test(correctedValue);
      const language: 'HINDI' | 'ENGLISH' | 'MIXED' = hasHindi && hasEnglish ? 'MIXED' : hasHindi ? 'HINDI' : 'ENGLISH';

      // Normalize template name
      const templateName = fileName.replace('.jpg', '').replace('.png', '').replace('scan_', '');
      let stationTemplate: 'HPCL' | 'BPCL' | 'IOCL' | 'Nayara' | 'Jio-bp' | 'custom' = 'custom';
      const upperTemp = templateName.toUpperCase();
      if (upperTemp.includes('HPCL')) stationTemplate = 'HPCL';
      else if (upperTemp.includes('BPCL')) stationTemplate = 'BPCL';
      else if (upperTemp.includes('IOCL')) stationTemplate = 'IOCL';
      else if (upperTemp.includes('NAYARA')) stationTemplate = 'Nayara';
      else if (upperTemp.includes('JIO-BP') || upperTemp.includes('JIOBP')) stationTemplate = 'Jio-bp';

      // 1. Train the correction which inserts/overwrites the entry in the glossary and logs to offline correction memory
      OperatorCorrectionTrainer.trainCorrection({
        operatorId,
        stationId,
        fieldKey: mutation.fieldKey,
        rawOCR: originalValue,
        correctedValue,
        normalizedMeaning: mutation.overrideReason || `Auto-learned from manager override for field ${mutation.fieldKey}`,
        category,
        language,
        stationTemplate,
        imageCrop: mutation.boundingBox,
        confidence: 75
      });

      // 2. Track spatial shift coordinate drifts (Layout Calibration)
      if (mutation.boundingBox) {
        // Calculate crop drift (simulated differential calculation)
        const dx = mutation.boundingBox.x * 0.05;
        const dy = mutation.boundingBox.y * 0.03;
        
        LayoutLearningRegistry.logLayoutCorrection(
          stationId,
          mutation.fieldKey,
          dx,
          dy,
          mutation.boundingBox
        );
      }
    });

    console.log(`[OCRLearningEngine] Successfully ingested ${mutations.length} mutations into self-learning pipeline.`);
  }

  /**
   * Evaluates a raw OCR value and applies learned operator handwriting corrections on the fly
   */
  public static optimizeIncomingValue(operatorId: string, fieldKey: string, rawOcr: string): string {
    // Check if operator has a specific handwriting prediction for this text
    const handwritingPrediction = OperatorCorrectionPatterns.predictCorrection(operatorId, rawOcr);
    if (handwritingPrediction) {
      console.log(`[OCRLearningEngine] Optimized '${rawOcr}' -> '${handwritingPrediction.suggestion}' via handwriting profile.`);
      return handwritingPrediction.suggestion;
    }

    // Check HandwritingGlossary for any template-matching entries or generic mappings!
    const glossaryMatch = HandwritingGlossary.findMatch(rawOcr, 'HPCL') || 
                          HandwritingGlossary.findMatch(rawOcr, 'BPCL') || 
                          HandwritingGlossary.findMatch(rawOcr, 'IOCL') || 
                          HandwritingGlossary.findMatch(rawOcr, 'custom');
    if (glossaryMatch) {
      console.log(`[OCRLearningEngine] Optimized '${rawOcr}' -> '${glossaryMatch.correctedValue}' via HandwritingGlossary match.`);
      return glossaryMatch.correctedValue;
    }

    return rawOcr;
  }
}
