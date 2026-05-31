"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIClassificationEngine = void 0;
const firebase_1 = require("../../../utils/firebase");
const firestore_1 = require("firebase/firestore");
class AIClassificationEngine {
    /**
     * AI classification pipeline mapping discrepancy reports and mathematical
     * inconsistencies into standard auditing alarm states.
     */
    static async classifyShiftAnomalies(shiftId, auditReport, ocrConfidence, duplicateFound) {
        const categories = [];
        // 1. OCR Confidence check
        if (ocrConfidence < 85) {
            categories.push('OCR_LOW_CONFIDENCE');
        }
        // 2. Duplicate Checks
        if (duplicateFound) {
            categories.push('DUPLICATE_ENTRY');
        }
        // 3. Cash Variance Check
        if (Math.abs(auditReport.metrics.cashMismatch) > 100) {
            categories.push('CASH_VARIANCE');
        }
        // 4. Wetstock leak checks
        if (Math.abs(auditReport.metrics.wetstockVariance) > 50) {
            categories.push('WETSTOCK_VARIANCE');
        }
        // 5. Audit discrepancies parsing
        auditReport.discrepancies.forEach(err => {
            if (err.includes("rollback") || err.includes("Closing meter")) {
                if (!categories.includes('NOZZLE_ROLLBACK')) {
                    categories.push('NOZZLE_ROLLBACK');
                }
            }
            if (err.includes("Continuity") || err.includes("previous")) {
                if (!categories.includes('CARRY_FORWARD_MISMATCH')) {
                    categories.push('CARRY_FORWARD_MISMATCH');
                }
            }
            if (err.includes("UPI") || err.includes("Card") || err.includes("Variance")) {
                if (!categories.includes('SETTLEMENT_MISMATCH')) {
                    categories.push('SETTLEMENT_MISMATCH');
                }
            }
        });
        let severity = 'INFO';
        if (categories.includes('NOZZLE_ROLLBACK') || categories.includes('CARRY_FORWARD_MISMATCH')) {
            severity = 'CRITICAL';
        }
        else if (categories.length > 0) {
            severity = 'WARNING';
        }
        const record = {
            shiftId,
            categories,
            severity,
            timestamp: new Date().toISOString()
        };
        // Log the anomaly classification in Firestore
        try {
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "aiClassificationLogs"), record);
        }
        catch (e) {
            console.warn("[AIClassificationEngine] Offline bypass - logged anomalies locally.");
        }
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(`anomaly_class_${shiftId}`, JSON.stringify(record));
            }
            catch (err) { }
        }
        return record;
    }
}
exports.AIClassificationEngine = AIClassificationEngine;
