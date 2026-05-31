export interface NotificationPayload {
  notificationId: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  category: "WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT";
  channels: Array<"WHATSAPP" | "TELEGRAM" | "EMAIL">;
  timestamp: number;
  retryAttempts: number;
  deliveryStatus: "QUEUED" | "SENT" | "FAILED" | "RETRYING";
}

export class NotificationQueueEngine {
  private queue: NotificationPayload[] = [];
  private static readonly MAX_QUEUE_LIMIT = 500;

  constructor() {
    this.initializeDefaultQueue();
  }

  private initializeDefaultQueue() {
    this.queue = [
      {
        notificationId: "NOTIF_9901",
        title: "Critical Wetstock Variance Detected",
        message: "Variance of -210 liters detected on Petrol Tank T1 during Shift Close SF_990182.",
        severity: "CRITICAL",
        category: "WETSTOCK_VARIANCE",
        channels: ["WHATSAPP", "EMAIL"],
        timestamp: Date.now() - 3600 * 4 * 1000, // 4 hours ago
        retryAttempts: 0,
        deliveryStatus: "SENT"
      },
      {
        notificationId: "NOTIF_9902",
        title: "Security Ledger Tamper Alert",
        message: "Broken rolling signature hash detected on account Staff Advance ACC_STAFF. Expected 3f2a1b9e but received bad_signature_hash.",
        severity: "CRITICAL",
        category: "SECURITY_TAMPER",
        channels: ["WHATSAPP", "TELEGRAM"],
        timestamp: Date.now() - 3600 * 2 * 1000, // 2 hours ago
        retryAttempts: 2,
        deliveryStatus: "RETRYING"
      }
    ];
  }

  public getQueue(): NotificationPayload[] {
    return this.queue;
  }

  public enqueue(
    title: string, 
    message: string, 
    severity: "INFO" | "WARNING" | "CRITICAL", 
    category: "WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT",
    channels: Array<"WHATSAPP" | "TELEGRAM" | "EMAIL">
  ): NotificationPayload {
    if (this.queue.length >= NotificationQueueEngine.MAX_QUEUE_LIMIT) {
      // Remove oldest SENT or FAILED item to free up slot
      const indexToEvict = this.queue.findIndex(n => n.deliveryStatus === "SENT" || n.deliveryStatus === "FAILED");
      if (indexToEvict >= 0) {
        this.queue.splice(indexToEvict, 1);
      } else {
        this.queue.shift(); // Force evict oldest anyway
      }
    }

    const newNotification: NotificationPayload = {
      notificationId: `NOTIF_${Math.floor(10000 + Math.random() * 90000)}`,
      title,
      message,
      severity,
      category,
      channels,
      timestamp: Date.now(),
      retryAttempts: 0,
      deliveryStatus: "QUEUED"
    };

    // Prioritize: CRITICAL alerts go to front of queue
    if (severity === "CRITICAL") {
      this.queue.unshift(newNotification);
    } else {
      this.queue.push(newNotification);
    }

    return newNotification;
  }

  public updateStatus(notifId: string, status: "SENT" | "FAILED" | "RETRYING", attempts: number): void {
    const idx = this.queue.findIndex(n => n.notificationId === notifId);
    if (idx >= 0) {
      this.queue[idx] = {
        ...this.queue[idx],
        deliveryStatus: status,
        retryAttempts: attempts
      };
    }
  }
}
