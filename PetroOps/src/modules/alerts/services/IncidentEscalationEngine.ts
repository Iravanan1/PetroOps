/**
 * IncidentEscalationEngine.ts
 * Operational incident routing and severity matrix escalation controller.
 * Directs incident alerts to dashboards, managers, or secure auditor phone lines.
 */

import { AlertDispatchEngine } from "./AlertDispatchEngine";

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  severity: "low_priority" | "medium_severity" | "critical_emergency";
  status: "raised" | "acknowledged" | "resolved";
  timestamp: number;
  assignedRole: "operator" | "manager" | "auditor";
  actionsTaken: string[];
}

export class IncidentEscalationEngine {
  private static STORAGE_KEY = "pumpai_active_incidents";

  /**
   * Routes incident payloads into active severity matrices, triggering messaging webhooks
   */
  public static async escalateIncident(
    title: string,
    description: string,
    severity: "low_priority" | "medium_severity" | "critical_emergency"
  ): Promise<IncidentRecord> {
    let assignedRole: "operator" | "manager" | "auditor" = "operator";
    
    if (severity === "critical_emergency") {
      assignedRole = "auditor";
    } else if (severity === "medium_severity") {
      assignedRole = "manager";
    }

    const incident: IncidentRecord = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      description,
      severity,
      status: "raised",
      timestamp: Date.now(),
      assignedRole,
      actionsTaken: [],
    };

    // Save locally
    const incidents = this.getIncidents();
    incidents.push(incident);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(incidents));

    // Dispatch communication webhooks based on priority matrices
    const body = `[SEVERITY: ${severity.toUpperCase()}] Alert: ${title}. Info: ${description}`;

    if (severity === "critical_emergency") {
      // Trigger full multi-channel routing immediately (WhatsApp + Telegram + Smtp)
      await AlertDispatchEngine.dispatchNotification("whatsapp", "incident_critical", body);
      await AlertDispatchEngine.dispatchNotification("telegram", "incident_critical", body);
      await AlertDispatchEngine.dispatchNotification("smtp", "incident_critical", body);
    } else if (severity === "medium_severity") {
      // Route to Telegram bot dashboard channel
      await AlertDispatchEngine.dispatchNotification("telegram", "incident_medium", body);
    } else {
      // Low priority: quiet SMTP logger entry
      await AlertDispatchEngine.dispatchNotification("smtp", "incident_low", body);
    }

    return incident;
  }

  public static getIncidents(): IncidentRecord[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Action audits tracker to log supervisor or attendant interventions
   */
  public static updateIncidentStatus(id: string, nextStatus: "acknowledged" | "resolved", comment: string): void {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
      incidents[idx].status = nextStatus;
      incidents[idx].actionsTaken.push(`[${new Date().toLocaleTimeString()}] Status updated to ${nextStatus}. Comment: ${comment}`);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(incidents));
    }
  }

  /**
   * Resets active incident boards
   */
  public static purgeIncidents(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
