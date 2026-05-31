export interface NotificationTemplate {
  templateId: string;
  category: "WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT";
  whatsappTemplateName: string;
  telegramFormat: string;
  emailSubject: string;
  emailBodyHtml: string;
}

export class NotificationTemplateRegistry {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    this.templates.set("TEMP_WETSTOCK", {
      templateId: "TEMP_WETSTOCK",
      category: "WETSTOCK_VARIANCE",
      whatsappTemplateName: "pumpai_wetstock_variance_alert_v1",
      telegramFormat: "⚠️ <b>[PUMPAI WETSTOCK VARIANCE]</b>\n\n<b>Title:</b> {title}\n<b>Variance:</b> {message}\n<b>Severity:</b> {severity}\n<b>Timestamp:</b> {timestamp}\n\n<i>Actions: Please check Modbus tank dip logs immediately.</i>",
      emailSubject: "[CRITICAL ALERT] Wetstock Variance Detected - PumpAI",
      emailBodyHtml: "<h3>Wetstock Variance Alert Ingested</h3><p>System has flagged a wetstock level anomaly: </p><p><b>{message}</b></p><br><p>Audited by PumpAI ReplayEngine.</p>"
    });

    this.templates.set("TEMP_SECURITY", {
      templateId: "TEMP_SECURITY",
      category: "SECURITY_TAMPER",
      whatsappTemplateName: "pumpai_security_compromise_alert_v2",
      telegramFormat: "🚨 <b>[PUMPAI SECURITY TAMPER]</b>\n\n<b>Incident:</b> {title}\n<b>Message:</b> {message}\n<b>Severity:</b> {severity}\n\n<i>CRITICAL: Database lock bounds validation failed. Supervisor credentials override required.</i>",
      emailSubject: "[SECURITY COMPROMISE ALERT] Tamper Detected - PumpAI",
      emailBodyHtml: "<h3>Security Integrity Breached</h3><p>An authorized rollups hash signature or locked period write restriction was bypassed:</p><p><b>{message}</b></p><br><p>Immediate review advised.</p>"
    });

    this.templates.set("TEMP_PAYMENT", {
      templateId: "TEMP_PAYMENT",
      category: "PAYMENT_DISPUTE",
      whatsappTemplateName: "pumpai_payment_discrepancy_alert_v1",
      telegramFormat: "💳 <b>[PUMPAI CLEARING DISPUTE]</b>\n\n<b>Title:</b> {title}\n<b>Message:</b> {message}\n\n<i>Reconcile SBI banking clearing statement matching to clear error states.</i>",
      emailSubject: "[DISPUTE FILED] Payment Settlement Variance - PumpAI",
      emailBodyHtml: "<h3>Payment Settlement Dispute Logged</h3><p>PhonePe/Paytm settlement payout commissions discrepancy identified:</p><p><b>{message}</b></p>"
    });
  }

  public getTemplate(category: "WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT"): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.category === category);
  }

  /**
   * Compiles template parameters with actual alert message variables
   */
  public compileTelegramAlert(
    category: "WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT",
    params: { title: string; message: string; severity: string; timestamp: string }
  ): string {
    const template = this.getTemplate(category);
    if (!template) {
      return `⚠️ [ALERT] ${params.title} - ${params.message}`;
    }

    return template.telegramFormat
      .replace(/{title}/g, params.title)
      .replace(/{message}/g, params.message)
      .replace(/{severity}/g, params.severity)
      .replace(/{timestamp}/g, params.timestamp);
  }
}
