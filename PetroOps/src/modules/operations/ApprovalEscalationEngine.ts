/**
 * ApprovalEscalationEngine.ts
 * ───────────────────────────
 * Implements Role-Based Access Control (RBAC) operational restrictions.
 * Enforces authority seals on double-entry accounting overrides.
 */

export type UserRole = 'owner' | 'regional_manager' | 'accountant' | 'operator' | 'auditor';

export interface RolePermissions {
  canLockPeriod: boolean;
  canOverrideFatalVariance: boolean;
  canRunDisasterRestore: boolean;
  canEditRosterAttendance: boolean;
  canApprovePettyCash: boolean;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  owner: {
    canLockPeriod: true,
    canOverrideFatalVariance: true,
    canRunDisasterRestore: true,
    canEditRosterAttendance: true,
    canApprovePettyCash: true
  },
  regional_manager: {
    canLockPeriod: true,
    canOverrideFatalVariance: true,
    canRunDisasterRestore: false,
    canEditRosterAttendance: true,
    canApprovePettyCash: true
  },
  accountant: {
    canLockPeriod: true,
    canOverrideFatalVariance: false,
    canRunDisasterRestore: false,
    canEditRosterAttendance: false,
    canApprovePettyCash: true
  },
  auditor: {
    canLockPeriod: false,
    canOverrideFatalVariance: false,
    canRunDisasterRestore: false,
    canEditRosterAttendance: false,
    canApprovePettyCash: false
  },
  operator: {
    canLockPeriod: false,
    canOverrideFatalVariance: false,
    canRunDisasterRestore: false,
    canEditRosterAttendance: false,
    canApprovePettyCash: false
  }
};

export class ApprovalEscalationEngine {
  /**
   * Asserts if an active user role is authorized to complete the target operational action
   */
  public static verifyAction(
    role: UserRole,
    action: keyof RolePermissions
  ): boolean {
    const permissions = ROLE_PERMISSIONS_MAP[role];
    return permissions ? permissions[action] : false;
  }

  /**
   * Generates mock escalations checklist list for supervisor review
   */
  public static getEscalationsQueue(): {
    id: string;
    station: string;
    escalationType: 'FATAL_VARIANCE' | 'OFFLINE_TIMELOCKED' | 'SHRINKAGE_ALERT';
    details: string;
    daysOutstanding: number;
    sealedBy?: string;
  }[] {
    return [
      { id: 'esc-001', station: 'Pune Highway Potaliya', escalationType: 'FATAL_VARIANCE', details: 'Nozzle MS Opening continuity break (noz-02 variance gap 150L)', daysOutstanding: 2 },
      { id: 'esc-002', station: 'Mumbai Terminal Branch', escalationType: 'OFFLINE_TIMELOCKED', details: 'Station sync failure - offline duration exceeded 12 hours limit', daysOutstanding: 1 },
      { id: 'esc-003', station: 'Delhi Central Pump', escalationType: 'SHRINKAGE_ALERT', details: 'Wetstock dip variance is -0.78% (evaporation tolerance limit exceeded)', daysOutstanding: 3 }
    ];
  }
}
