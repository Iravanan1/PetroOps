export interface DeliveryReceipt {
  receiptId: string;
  notificationId: string;
  channel: "WHATSAPP" | "TELEGRAM" | "EMAIL";
  destinationAddress: string; // Phone number or chat ID or email
  dispatchTime: number;
  success: boolean;
  gatewayResponse: string;
  latencyMs: number;
}

export class DeliveryAuditEngine {
  private auditLogs: DeliveryReceipt[] = [];

  constructor() {
    this.initializeDefaultLogs();
  }

  private initializeDefaultLogs() {
    this.auditLogs = [
      {
        receiptId: "RCP_99011",
        notificationId: "NOTIF_9901",
        channel: "WHATSAPP",
        destinationAddress: "+91-9876543210",
        dispatchTime: Date.now() - 3600 * 4 * 1000,
        success: true,
        gatewayResponse: "{\"message_id\":\"WA_msg_8812984\",\"status\":\"DELIVERED\"}",
        latencyMs: 180
      },
      {
        receiptId: "RCP_99012",
        notificationId: "NOTIF_9901",
        channel: "EMAIL",
        destinationAddress: "owner@pumpai.com",
        dispatchTime: Date.now() - 3600 * 4 * 1000,
        success: true,
        gatewayResponse: "{\"smtp_id\":\"250_OK_Queue_id_882142\",\"status\":\"SENT\"}",
        latencyMs: 320
      }
    ];
  }

  public getLogs(): DeliveryReceipt[] {
    return this.auditLogs;
  }

  /**
   * Commits a physical transmission dispatch log receipt
   */
  public logReceipt(
    notifId: string, 
    channel: "WHATSAPP" | "TELEGRAM" | "EMAIL", 
    destination: string, 
    success: boolean, 
    gwResponse: string, 
    latency: number
  ): DeliveryReceipt {
    const receipt: DeliveryReceipt = {
      receiptId: `RCP_${Math.floor(10000 + Math.random() * 90000)}`,
      notificationId: notifId,
      channel,
      destinationAddress: destination,
      dispatchTime: Date.now(),
      success,
      gatewayResponse: gwResponse,
      latencyMs: latency
    };

    this.auditLogs.unshift(receipt);
    return receipt;
  }
}
