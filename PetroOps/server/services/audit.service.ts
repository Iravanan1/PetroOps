import { adminDb } from '../utils/firebaseAdmin.js';

export interface AuditLogEntry {
  userId: string;
  userEmail?: string;
  action: string; 
  details: Record<string, any>;
  pumpId: string;
  timestamp: string;
  ipAddress?: string;
}

export class AuditLogger {
  public static async logAction(
    userId: string,
    action: string,
    details: Record<string, any>,
    pumpId: string,
    userEmail?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        userId,
        userEmail: userEmail || "unknown@pumpai.com",
        action,
        details,
        pumpId,
        timestamp: new Date().toISOString(),
        ipAddress: ipAddress || "127.0.0.1"
      };

      await adminDb.collection("audits").add(entry);
      console.log(`[AuditLog] [${action}] Recorded successfully for user ${userId} under pump ${pumpId}`);
    } catch (err) {
      console.error("AuditLogger failed to persist audit trail inside database:", err);
    }
  }
}
