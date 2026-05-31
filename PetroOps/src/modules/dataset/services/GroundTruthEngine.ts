/**
 * GroundTruthEngine.ts
 * Finite State Machine controlling the Ground Truth human-in-the-loop lifecycle.
 * State changes are strictly append-only, ensuring no direct status overrides.
 */

import { type GroundTruthStatus, RegisterDatasetStorageEngine } from "./RegisterDatasetStorageEngine";

export interface GroundTruthStateEvent {
  eventId: string;
  recordId: string;
  fromState: GroundTruthStatus;
  toState: GroundTruthStatus;
  operatorId: string;
  timestamp: string;
  notes?: string;
  signature?: string;
}

export class GroundTruthEngine {
  private static eventStreamKey = "pumpai_groundTruthEvents";

  private static VALID_TRANSITIONS: Record<GroundTruthStatus, GroundTruthStatus[]> = {
    RAW_UPLOAD: ["OCR_EXTRACTED", "HUMAN_LABELED"],
    OCR_EXTRACTED: ["HUMAN_LABELED"],
    HUMAN_LABELED: ["MANAGER_VERIFIED", "RAW_UPLOAD"],
    MANAGER_VERIFIED: ["AUDITOR_APPROVED", "HUMAN_LABELED"],
    AUDITOR_APPROVED: ["GROUND_TRUTH_LOCKED", "MANAGER_VERIFIED"],
    GROUND_TRUTH_LOCKED: [] // Ground truth is immutable once locked
  };

  /**
   * Triggers a transition in the FSM and logs it to an append-only event log
   */
  public static async transitionState(
    recordId: string,
    targetState: GroundTruthStatus,
    operatorId: string,
    notes?: string,
    signature?: string
  ): Promise<{ success: boolean; newState: GroundTruthStatus; error?: string }> {
    // 1. Fetch active state
    const record = await RegisterDatasetStorageEngine.getIngestedItemById(recordId);
    if (!record) {
      return { success: false, newState: "RAW_UPLOAD", error: `Record with ID ${recordId} not found.` };
    }

    const currentState = record.status;

    // 2. Validate transition
    const allowedTransitions = this.VALID_TRANSITIONS[currentState] || [];
    if (!allowedTransitions.includes(targetState)) {
      return {
        success: false,
        newState: currentState,
        error: `Illegal transition: Cannot mutate Ground Truth state from "${currentState}" to "${targetState}".`
      };
    }

    // 3. Locked constraint: unlocking requires auditor signature
    if (currentState === "GROUND_TRUTH_LOCKED") {
      return {
        success: false,
        newState: currentState,
        error: "Compliance Lock: Cannot mutate a closed, locked ground-truth master key."
      };
    }

    // 4. Create append-only event
    const event: GroundTruthStateEvent = {
      eventId: `evt_gt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      recordId,
      fromState: currentState,
      toState: targetState,
      operatorId,
      timestamp: new Date().toISOString(),
      notes,
      signature
    };

    this.appendEvent(event);

    // 5. Mutate database index status
    await RegisterDatasetStorageEngine.updateItemStatus(recordId, targetState);

    return {
      success: true,
      newState: targetState
    };
  }

  /**
   * Replays events from history to reconstruct deterministic state
   */
  public static replayState(recordId: string, initialStatus: GroundTruthStatus = "RAW_UPLOAD"): GroundTruthStatus {
    const events = this.getEvents(recordId);
    let state = initialStatus;
    events.forEach(evt => {
      state = evt.toState;
    });
    return state;
  }

  /**
   * Retrieves all logged state transitions for a record
   */
  public static getEvents(recordId: string): GroundTruthStateEvent[] {
    const events: GroundTruthStateEvent[] = JSON.parse(localStorage.getItem(this.eventStreamKey) || "[]");
    return events.filter(e => e.recordId === recordId);
  }

  private static appendEvent(event: GroundTruthStateEvent): void {
    const events: GroundTruthStateEvent[] = JSON.parse(localStorage.getItem(this.eventStreamKey) || "[]");
    events.push(event);
    localStorage.setItem(this.eventStreamKey, JSON.stringify(events));
    console.log(`[GroundTruthFSM] Transition appended to log: ${event.fromState} ➔ ${event.toState}`);
  }
}
