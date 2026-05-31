"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRLearningFeedbackService = void 0;
const firebase_1 = require("../../../utils/firebase");
const firestore_1 = require("firebase/firestore");
class OCRLearningFeedbackService {
    static { this.inMemoryHistory = []; }
    /**
     * Tracks manual edits to establish digit confusion bias (e.g. OCR mistaking 8 for 0)
     * to automatically adjust confidence scoring calculations dynamically.
     */
    static async logCorrectionFeedback(jobId, fieldName, original, corrected, confusionType = 'digit_confusion') {
        const feedback = {
            jobId,
            fieldName,
            originalOcrValue: original,
            managerCorrectedValue: corrected,
            confusionType,
            timestamp: new Date().toISOString()
        };
        try {
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "ocrFeedbackLoop"), feedback);
        }
        catch (e) {
            console.warn("[OCRLearningFeedback] Logged adjustments locally in offline feedback cache.");
        }
        if (typeof localStorage !== 'undefined') {
            try {
                const history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
                history.push(feedback);
                localStorage.setItem("ocr_feedback_history", JSON.stringify(history));
            }
            catch (err) {
                // Safe catch for environment issues
            }
        }
        this.inMemoryHistory.push(feedback);
    }
    /**
     * Inspects logs to see if a field has highly recurrent adjustments.
     */
    static getFieldBiasModifier(fieldName) {
        let history = [];
        if (typeof localStorage !== 'undefined') {
            try {
                history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
            }
            catch (err) {
                history = this.inMemoryHistory;
            }
        }
        else {
            history = this.inMemoryHistory;
        }
        const matching = history.filter(f => f.fieldName === fieldName);
        // Penalize the field confidence if it undergoes constant manager corrections
        if (matching.length > 5)
            return -0.15;
        if (matching.length > 2)
            return -0.05;
        return 0;
    }
    /**
     * Gets total number of historical corrections for a field.
     */
    static getFieldCorrectionCount(fieldName) {
        let history = [];
        if (typeof localStorage !== 'undefined') {
            try {
                history = JSON.parse(localStorage.getItem("ocr_feedback_history") || "[]");
            }
            catch (err) {
                history = this.inMemoryHistory;
            }
        }
        else {
            history = this.inMemoryHistory;
        }
        return history.filter(f => f.fieldName === fieldName).length;
    }
}
exports.OCRLearningFeedbackService = OCRLearningFeedbackService;
