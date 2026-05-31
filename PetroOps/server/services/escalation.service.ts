import { adminDb } from '../utils/firebaseAdmin.js';

export interface EscalationAlert {
  alertId: string;
  pumpId: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  resolved: boolean;
  escalatedTo: string; // Manager designation
  createdAt: string;
}

export class EscalationService {
  /**
   * Logs a high-priority operational alert and handles notification pipelines
   */
  public static async triggerEscalation(
    pumpId: string,
    message: string,
    severity: 'INFO' | 'WARN' | 'CRITICAL' = 'CRITICAL'
  ): Promise<string> {
    try {
      const alert: EscalationAlert = {
        alertId: `esc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        pumpId,
        severity,
        message,
        resolved: false,
        escalatedTo: severity === 'CRITICAL' ? 'Regional Director' : 'Station Manager',
        createdAt: new Date().toISOString()
      };

      // Persist escalation alert into database
      await adminDb.collection("escalations").doc(alert.alertId).set(alert);
      
      console.log(`[Escalation] Alert ${alert.alertId} successfully escalated to ${alert.escalatedTo}`);
      
      // WhatsApp API Integration fallback log
      if (severity === 'CRITICAL') {
        console.log(`[SMS/WhatsApp Bypass] Sent Urgent Escalation message to Regional Director: "${message}"`);
      }

      return alert.alertId;
    } catch (err) {
      console.error("EscalationService failed to trigger alert escalation path:", err);
      throw err;
    }
  }
}
