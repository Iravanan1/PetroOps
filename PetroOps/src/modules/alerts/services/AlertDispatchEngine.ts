/**
 * AlertDispatchEngine.ts
 * Multi-channel communication router for enterprise alerts dispatching.
 * Programs API integrations (WhatsApp, Telegram, SMTP) with rate-limiting loop controls.
 */

export interface DispatchLog {
  id: string;
  channel: "whatsapp" | "telegram" | "smtp";
  category: string;
  body: string;
  timestamp: number;
  success: boolean;
}

export class AlertDispatchEngine {
  private static STORAGE_KEY = "pumpai_dispatch_history";
  private static RATE_LIMIT_COOLDOWN_MS = 300000; // 5 minutes cooldown per alert category

  /**
   * Tracks category cooldowns to prevent notification loops or message flooding
   */
  private static isRateLimited(category: string, channel: "whatsapp" | "telegram" | "smtp"): boolean {
    const history = this.getHistory();
    const now = Date.now();
    
    const recent = history.find(
      log => log.category === category && 
             log.channel === channel && 
             log.success &&
             (now - log.timestamp) < this.RATE_LIMIT_COOLDOWN_MS
    );

    return !!recent;
  }

  /**
   * Dispatches alerts using external webhooks
   */
  public static async dispatchNotification(
    channel: "whatsapp" | "telegram" | "smtp",
    category: string,
    body: string
  ): Promise<boolean> {
    if (this.isRateLimited(category, channel)) {
      console.warn(`AlertDispatchEngine: Category [${category}] on [${channel}] is rate-limited. Dispatch suppressed.`);
      return false;
    }

    let success = false;
    try {
      // simulated Webhook pipeline endpoints
      if (channel === "telegram") {
        success = await this.mockTelegramWebhook(category, body);
      } else if (channel === "whatsapp") {
        success = await this.mockWhatsAppWebhook(category, body);
      } else {
        success = await this.mockSmtpDispatch(category, body);
      }
    } catch (e) {
      console.error(`AlertDispatchEngine: Failed to dispatch on [${channel}]`, e);
      success = false;
    }

    const log: DispatchLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      channel,
      category,
      body,
      timestamp: Date.now(),
      success,
    };

    const history = this.getHistory();
    history.push(log);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));

    return success;
  }

  public static getHistory(): DispatchLog[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private static async mockTelegramWebhook(category: string, body: string): Promise<boolean> {
    return new Promise(res => {
      setTimeout(() => {
        console.log(`[Telegram Bot Webhook Fired] Category: ${category} | Message: ${body}`);
        res(true);
      }, 400);
    });
  }

  private static async mockWhatsAppWebhook(category: string, body: string): Promise<boolean> {
    return new Promise(res => {
      setTimeout(() => {
        console.log(`[WhatsApp Business API Webhook Fired] Category: ${category} | Message: ${body}`);
        res(true);
      }, 500);
    });
  }

  private static async mockSmtpDispatch(category: string, body: string): Promise<boolean> {
    return new Promise(res => {
      setTimeout(() => {
        console.log(`[SMTP Mail Dispatch Fired] Category: ${category} | Body: ${body}`);
        res(true);
      }, 300);
    });
  }
}
