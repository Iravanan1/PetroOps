import { db } from '../../../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface FeedbackLog {
  jobId: string;
  fieldName: string;
  originalOcrValue: string;
  managerCorrectedValue: string;
  confusionType: 'digit_confusion' | 'nozzle_mismatch' | 'name_misspelling' | 'other';
  timestamp: string;
}

export class OCRLearningFeedbackService {
  private static inMemoryHistory: FeedbackLog[] = [];

  /**
   * Tracks manual edits to establish digit confusion bias (e.g. OCR mistaking 8 for 0)
   * to automatically adjust confidence scoring calculations dynamically.
   */
  public static async logCorrectionFeedback(
    jobId: string,
    fieldName: string,
    original: string,
    corrected: string,
    confusionType: FeedbackLog['confusionType'] = 'digit_confusion'
  ): Promise<void> {
    const feedback: FeedbackLog = {
      jobId,
      fieldName,
      originalOcrValue: original,
      managerCorrectedValue: corrected,
      confusionType,
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "ocrFeedbackLoop"), feedback);
    } catch (e) {
      console.warn("[OCRLearningFeedback] Logged adjustments locally in offline feedback cache.");
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
        history.push(feedback);
        localStorage.setItem("ocr_feedback_history", JSON.stringify(history));
      } catch (err) {
        // Safe catch for environment issues
      }
    }
    this.inMemoryHistory.push(feedback);
  }

  /**
   * Inspects logs to see if a field has highly recurrent adjustments.
   */
  public static getFieldBiasModifier(fieldName: string): number {
    let history: FeedbackLog[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
      } catch (err) {
        history = this.inMemoryHistory;
      }
    } else {
      history = this.inMemoryHistory;
    }
    const matching = history.filter(f => f.fieldName === fieldName);
    
    // Penalize the field confidence if it undergoes constant manager corrections
    if (matching.length > 5) return -0.15;
    if (matching.length > 2) return -0.05;
    return 0;
  }

  /**
   * Gets total number of historical corrections for a field.
   */
  public static getFieldCorrectionCount(fieldName: string): number {
    let history: FeedbackLog[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
      } catch (err) {
        history = this.inMemoryHistory;
      }
    } else {
      history = this.inMemoryHistory;
    }
    return history.filter(f => f.fieldName === fieldName).length;
  }
}
