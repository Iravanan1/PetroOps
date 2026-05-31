/**
 * AccessControlEngine.ts
 * ──────────────────────
 * Core run-time RBAC supervisor that checks user credentials roles
 * and blocks unauthorized ledger overrides dynamically.
 */

import { ROLE_PERMISSION_MATRIX, UserRole, SecurityPermissions } from './RolePermissionMatrix';

export class AccessControlEngine {
  /**
   * Asserts if the target user role is authorized to complete the operation
   */
  public static isAuthorized(
    role: UserRole | string | null,
    permission: keyof SecurityPermissions
  ): boolean {
    if (!role) return false;
    
    // Normalize role string fallback
    const normRole = role.toLowerCase() as UserRole;
    const permissions = ROLE_PERMISSION_MATRIX[normRole];
    
    if (!permissions) return false;
    return permissions[permission] === true;
  }

  /**
   * Safe check for shift adjustments.
   * Operators can enter logs but cannot adjust records if period is sealed and LOCKED.
   */
  public static canModifyShift(
    role: UserRole | string | null,
    shiftStatus: string
  ): boolean {
    if (shiftStatus === 'APPROVED' || shiftStatus === 'LOCKED') {
      // Locked journals require Owner or Manager authority remote overrides
      return this.isAuthorized(role, 'canLockUnlockShift');
    }
    return true; // Active periods are operator-writable
  }
}
