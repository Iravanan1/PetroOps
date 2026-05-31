"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceEngine = void 0;
const firebase_1 = require("../../../utils/firebase");
const firestore_1 = require("firebase/firestore");
const OCRLearningFeedbackService_1 = require("./OCRLearningFeedbackService");
class ConfidenceEngine {
    /**
     * Evaluates whole-shift reliability using weighted indices across OCR, AI,
     * deterministic balance scores, visual image quality, handwriting density, and historic correction rates.
     */
    static calculateOverallConfidence(shiftId, metrics, branchId) {
        const ocrWeight = 0.25;
        const aiWeight = 0.35;
        const reconWeight = 0.40;
        // Compute weighted components
        let baseConfidence = metrics.ocrScore * ocrWeight +
            metrics.aiScore * aiWeight +
            metrics.reconciliationScore * reconWeight;
        // Visual quality penalty: deduct if quality is below the 80 threshold
        if (metrics.imageQualityScore !== undefined && metrics.imageQualityScore < 80) {
            const qDiff = 80 - metrics.imageQualityScore;
            baseConfidence -= qDiff * 0.5; // Up to 40% penalty for completely blurry images
        }
        // Handwriting penalty: deduct up to 15% confidence for heavy handwriting density
        if (metrics.handwritingDensity !== undefined && metrics.handwritingDensity > 0) {
            baseConfidence -= metrics.handwritingDensity * 0.15;
        }
        // Accumulate learning feedback field bias penalties
        let feedbackPenalty = 0;
        const fields = ['openingCash', 'actualCash', 'cardSales', 'upiSales', 'creditSales', 'creditRecovery', 'expenses'];
        fields.forEach(f => {
            const modifier = OCRLearningFeedbackService_1.OCRLearningFeedbackService.getFieldBiasModifier(f); // negative value or zero
            feedbackPenalty += Math.abs(modifier) * 100; // convert 0.15 to 15 points
        });
        baseConfidence -= (metrics.correctionPenalty * 5) + feedbackPenalty;
        const finalConfidence = Math.max(0, Math.min(100, baseConfidence));
        // Log the calculation details in Firestore for long-term Observability audits
        this.logConfidenceRun(shiftId, metrics, finalConfidence, branchId).catch(err => {
            console.warn("[ConfidenceEngine] Firestore telemetry logging skipped in offline sandboxes.");
        });
        return Number(finalConfidence.toFixed(2));
    }
    static async logConfidenceRun(shiftId, metrics, score, branchId) {
        const logData = {
            shiftId,
            branchId,
            ...metrics,
            finalScore: score,
            timestamp: new Date().toISOString()
        };
        try {
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "ocrConfidenceLogs"), logData);
        }
        catch (e) {
            // Offline fallback
        }
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(`conf_log_${shiftId}`, JSON.stringify(logData));
            }
            catch (err) {
                // Safe catch for environment issues
            }
        }
    }
}
exports.ConfidenceEngine = ConfidenceEngine;
