"use strict";
/**
 * ShiftLifecycleFSM.ts
 * Finite State Machine controlling shift lifecycle transitions.
 * Enforces unviolable rule: Direct status updates are strictly prohibited.
 * Status can only mutate by appending an event command to the event stream ledger.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftLifecycleFSM = void 0;
class ShiftLifecycleFSM {
    static eventStream = [];
    // Valid transition paths
    static VALID_TRANSITIONS = {
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
    static triggerTransition(shiftId, currentStatus, targetStatus, operatorId, auditorSignature, overrideReason) {
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
        const event = {
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
    static getHistory(shiftId) {
        return this.eventStream.filter(evt => evt.shiftId === shiftId);
    }
    /**
     * Safe reconstruct status from event history to guarantee determinism
     */
    static replayState(shiftId, initialStatus = 'opened') {
        const history = this.getHistory(shiftId);
        let state = initialStatus;
        history.forEach(evt => {
            state = evt.toState;
        });
        return state;
    }
}
exports.ShiftLifecycleFSM = ShiftLifecycleFSM;
