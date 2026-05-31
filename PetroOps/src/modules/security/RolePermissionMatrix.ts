/**
 * RolePermissionMatrix.ts
 * ────────────────────────
 * Implements authoritative Role-Based Access Control matrix for petrol pump station operations.
 * Role hierarchy: owner > regional_manager > manager > accountant > auditor > operator.
 */

export type UserRole = 'owner' | 'manager' | 'accountant' | 'auditor' | 'operator';

export interface SecurityPermissions {
  canCreateShift: boolean;
  canApproveReconciliation: boolean;
  canEditCredit: boolean;
  canCorrectSettlement: boolean;
  canSyncPortal: boolean;
  canExportReport: boolean;
  canOverrideOcr: boolean;
  canLockUnlockShift: boolean;
  canRestoreBackup: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSION_MATRIX: Record<UserRole, SecurityPermissions> = {
  owner: {
    canCreateShift: true,
    canApproveReconciliation: true,
    canEditCredit: true,
    canCorrectSettlement: true,
    canSyncPortal: true,
    canExportReport: true,
    canOverrideOcr: true,
    canLockUnlockShift: true,
    canRestoreBackup: true,
    canManageUsers: true
  },
  manager: {
    canCreateShift: true,
    canApproveReconciliation: true,
    canEditCredit: true,
    canCorrectSettlement: true,
    canSyncPortal: true,
    canExportReport: true,
    canOverrideOcr: true,
    canLockUnlockShift: true, // Only if approved or override comment entered
    canRestoreBackup: false,
    canManageUsers: false
  },
  accountant: {
    canCreateShift: false,
    canApproveReconciliation: true,
    canEditCredit: false,
    canCorrectSettlement: true, // Requires step-up audit comments
    canSyncPortal: false,
    canExportReport: true,
    canOverrideOcr: false,
    canLockUnlockShift: true,
    canRestoreBackup: false,
    canManageUsers: false
  },
  auditor: {
    canCreateShift: false,
    canApproveReconciliation: false,
    canEditCredit: false,
    canCorrectSettlement: false,
    canSyncPortal: false,
    canExportReport: true,
    canOverrideOcr: false,
    canLockUnlockShift: false,
    canRestoreBackup: false,
    canManageUsers: false
  },
  operator: {
    canCreateShift: true,
    canApproveReconciliation: false,
    canEditCredit: true, // Operator logs sales credit, but cannot reopen locked history
    canCorrectSettlement: false,
    canSyncPortal: false,
    canExportReport: false,
    canOverrideOcr: false,
    canLockUnlockShift: false,
    canRestoreBackup: false,
    canManageUsers: false
  }
};
