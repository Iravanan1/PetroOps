"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const firebaseAdmin_js_1 = require("../utils/firebaseAdmin.js");
class AuditLogger {
    static async logAction(userId, action, details, pumpId, userEmail, ipAddress) {
        try {
            const entry = {
                userId,
                userEmail: userEmail || "unknown@pumpai.com",
                action,
                details,
                pumpId,
                timestamp: new Date().toISOString(),
                ipAddress: ipAddress || "127.0.0.1"
            };
            await firebaseAdmin_js_1.adminDb.collection("audits").add(entry);
            console.log(`[AuditLog] [${action}] Recorded successfully for user ${userId} under pump ${pumpId}`);
        }
        catch (err) {
            console.error("AuditLogger failed to persist audit trail inside database:", err);
        }
    }
}
exports.AuditLogger = AuditLogger;
