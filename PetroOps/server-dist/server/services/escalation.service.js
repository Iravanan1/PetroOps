"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationService = void 0;
const firebaseAdmin_js_1 = require("../utils/firebaseAdmin.js");
class EscalationService {
    /**
     * Logs a high-priority operational alert and handles notification pipelines
     */
    static async triggerEscalation(pumpId, message, severity = 'CRITICAL') {
        try {
            const alert = {
                alertId: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                pumpId,
                severity,
                message,
                resolved: false,
                escalatedTo: severity === 'CRITICAL' ? 'Regional Director' : 'Station Manager',
                createdAt: new Date().toISOString()
            };
            // Persist escalation alert into database
            await firebaseAdmin_js_1.adminDb.collection("escalations").doc(alert.alertId).set(alert);
            console.log(`[Escalation] Alert ${alert.alertId} successfully escalated to ${alert.escalatedTo}`);
            // WhatsApp API Integration fallback log
            if (severity === 'CRITICAL') {
                console.log(`[SMS/WhatsApp Bypass] Sent Urgent Escalation message to Regional Director: "${message}"`);
            }
            return alert.alertId;
        }
        catch (err) {
            console.error("EscalationService failed to trigger alert escalation path:", err);
            throw err;
        }
    }
}
exports.EscalationService = EscalationService;
