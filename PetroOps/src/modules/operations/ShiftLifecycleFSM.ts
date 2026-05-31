/**
 * ShiftLifecycleFSM.ts
 * Finite State Machine controlling shift lifecycle transitions.
 * Enforces unviolable rule: Direct status updates are strictly prohibited.
 * Status can only mutate by appending an event command to the event stream ledger.
 */

export type ShiftState = 'opened' | 'active' | 'under_review' | 'reconciled' | 'locked' | 'reopened';

export interface ShiftTransitionEvent {
  id: string;
  timestamp: string;
  shiftId: string;
  fromState: ShiftState;
  toState: ShiftState;
  operatorId: string;
  auditorSignature?: string;
  overrideReason?: string;
}

export class ShiftLifecycleFSM {
  private static eventStream: ShiftTransitionEvent[] = [];

  // Valid transition paths
  private static VALID_TRANSITIONS: Record<ShiftState, ShiftState[]> = {
    opened: ['active'],
    active: ['under_review'],
    under_review: ['reconciled'],
    reconciled: ['locked', 'under_review'],
    locked: ['reopened'], // LOCKED periods are immutable, reopening requires authorized auditor signature
    reopened: ['active', 'under_review']
  };

  /**
   * Appends a state transition event command to the ledger
   */
  public static triggerTransition(
    shiftId: string,
    currentStatus: ShiftState,
    targetStatus: ShiftState,
    operatorId: string,
    auditorSignature?: string,
    overrideReason?: string
  ): { success: boolean; newState: ShiftState; event?: ShiftTransitionEvent; error?: string } {
    
    // Enforce transition validation
    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        success: false,
        newState: currentStatus,
        error: `Illegal state transition: Cannot mutate shift from "${currentStatus}" to "${targetStatus}".`
      };
    }

    // Locked period constraint: Mutating out of locked status requires an authorized auditor signature
    if (currentStatus === 'locked' && !auditorSignature) {
      return {
        success: false,
        newState: currentStatus,
        error: `Compliance breach: Reopening a locked fiscal period strictly requires an auditor signature.`
      };
    }

    const event: ShiftTransitionEvent = {
      id: `evt_fsm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      shiftId,
      fromState: currentStatus,
      toState: targetStatus,
      operatorId,
      auditorSignature,
      overrideReason
    };

    this.eventStream.push(event);
    console.log(`[ShiftLifecycleFSM] State mutation appended to ledger: ${currentStatus} ➔ ${targetStatus}`);

    return {
      success: true,
      newState: targetStatus,
      event
    };
  }

  /**
   * Returns the immutable event stream for verification sweeps
   */
  public static getHistory(shiftId: string): ShiftTransitionEvent[] {
    return this.eventStream.filter(evt => evt.shiftId === shiftId);
  }

  /**
   * Safe reconstruct status from event history to guarantee determinism
   */
  public static replayState(shiftId: string, initialStatus: ShiftState = 'opened'): ShiftState {
    const history = this.getHistory(shiftId);
    let state = initialStatus;
    
    history.forEach(evt => {
      state = evt.toState;
    });

    return state;
  }
}
