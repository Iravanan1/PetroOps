/**
 * WorkflowFrictionEngine.ts
 * Captures user interaction clickstreams, form validation failures,
 * and keyboard input changes to score layout friction thresholds.
 */

export interface InteractionFrictionEvent {
  eventId: string;
  timestamp: number;
  type: "CLICK" | "FOCUS_LOSS" | "VALIDATION_FAILED" | "FIELD_EDIT_DELAY";
  elementId: string;
  meta?: Record<string, any>;
}

export interface FrictionScoreboard {
  totalClicks: number;
  totalValidationFailures: number;
  focusLossEvents: number;
  frictionIndex: number; // 0 (Zero Friction) to 100 (Unusable Complexity)
  highestFrictionFields: string[];
}

export class WorkflowFrictionEngine {
  private static STORAGE_KEY = "PUMPAI_WORKFLOW_FRICTION_EVENTS";

  /**
   * Retrieves all logged friction events
   */
  public static getEvents(): InteractionFrictionEvent[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getMockFrictionEvents();
    } catch (e) {
      console.error("[FrictionEngine] Failed to retrieve events", e);
      return this.getMockFrictionEvents();
    }
  }

  /**
   * Saves raw events back to local storage
   */
  public static saveEvents(events: InteractionFrictionEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error("[FrictionEngine] Storage sync error", e);
    }
  }

  /**
   * Appends an interaction event to telemetry stream
   */
  public static trackEvent(type: InteractionFrictionEvent["type"], elementId: string, meta?: Record<string, any>): void {
    const events = this.getEvents();
    events.push({
      eventId: `FE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: Date.now(),
      type,
      elementId,
      meta
    });
    this.saveEvents(events);
  }

  /**
   * Computes layout friction metrics and flags troublesome fields
   */
  public static analyzeFriction(): FrictionScoreboard {
    const events = this.getEvents();
    
    let totalClicks = 0;
    let totalValidationFailures = 0;
    let focusLossEvents = 0;
    const fieldDisputeMap: Record<string, number> = {};

    events.forEach(e => {
      if (e.type === "CLICK") totalClicks++;
      if (e.type === "VALIDATION_FAILED") {
        totalValidationFailures++;
        fieldDisputeMap[e.elementId] = (fieldDisputeMap[e.elementId] || 0) + 1.5;
      }
      if (e.type === "FOCUS_LOSS") {
        focusLossEvents++;
        fieldDisputeMap[e.elementId] = (fieldDisputeMap[e.elementId] || 0) + 0.5;
      }
      if (e.type === "FIELD_EDIT_DELAY") {
        fieldDisputeMap[e.elementId] = (fieldDisputeMap[e.elementId] || 0) + 1.0;
      }
    });

    // Identify the top 3 highest friction elements
    const sortedFields = Object.entries(fieldDisputeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([field]) => field)
      .slice(0, 3);

    // Friction Index calculation: Ranges from 0 (Perfect) to 100 (Extremely clunky)
    // Formula weighting: Validation errors (5 pts each), focus loops (1.5 pts each), excessive clicks
    let frictionIndex = 0;
    frictionIndex += totalValidationFailures * 8.0;
    frictionIndex += focusLossEvents * 1.5;
    
    // Clicking more than 40 times is considered high friction search
    if (totalClicks > 40) {
      frictionIndex += (totalClicks - 40) * 0.4;
    }

    frictionIndex = Math.max(5, Math.min(100, Math.round(frictionIndex)));

    return {
      totalClicks,
      totalValidationFailures,
      focusLossEvents,
      frictionIndex,
      highestFrictionFields: sortedFields.length > 0 ? sortedFields : ["openingNozzleCounter", "creditAttendantHandover", "dipStockPhysical"]
    };
  }

  /**
   * Standard mock events for cold boot profiles
   */
  private static getMockFrictionEvents(): InteractionFrictionEvent[] {
    return [
      { eventId: "FE-101", timestamp: Date.now() - 400000, type: "CLICK", elementId: "openingNozzleCounter" },
      { eventId: "FE-102", timestamp: Date.now() - 390000, type: "VALIDATION_FAILED", elementId: "openingNozzleCounter", meta: { reason: "Rollback invalid" } },
      { eventId: "FE-103", timestamp: Date.now() - 380000, type: "FOCUS_LOSS", elementId: "openingNozzleCounter" },
      { eventId: "FE-104", timestamp: Date.now() - 370000, type: "CLICK", elementId: "dipStockPhysical" },
      { eventId: "FE-105", timestamp: Date.now() - 360000, type: "FIELD_EDIT_DELAY", elementId: "dipStockPhysical", meta: { durationMs: 4500 } },
      { eventId: "FE-106", timestamp: Date.now() - 350000, type: "VALIDATION_FAILED", elementId: "dipStockPhysical", meta: { reason: "Evaporation bounds out" } },
      { eventId: "FE-107", timestamp: Date.now() - 300000, type: "CLICK", elementId: "creditAttendantHandover" },
      { eventId: "FE-108", timestamp: Date.now() - 290000, type: "FOCUS_LOSS", elementId: "creditAttendantHandover" },
      { eventId: "FE-109", timestamp: Date.now() - 280000, type: "CLICK", elementId: "creditAttendantHandover" }
    ];
  }
}
