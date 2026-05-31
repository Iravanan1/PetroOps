/**
 * TenantIsolationEngine.ts
 * Enforces strict enterprise tenant segregation across the application tier.
 * Prevents unauthorized cross-tenant operations, leakage, or data mutations.
 */

export interface TenantContext {
  tenantId: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED";
  tier: "FREE" | "GROWTH" | "ENTERPRISE";
}

export class TenantIsolationEngine {
  /**
   * Asserts that the executing user context matches the requested data tenancy
   * Throws a hard security exception on boundary violation
   */
  public static assertTenantAccess(
    userTenantId: string,
    targetTenantId: string,
    action: string = "READ"
  ): void {
    if (!userTenantId || !targetTenantId) {
      throw new Error(
        `🚨 [SECURITY EXCEPTION] Tenancy assertion failed: Missing tenant identifiers. User Tenant: ${userTenantId}, Target Tenant: ${targetTenantId}. Action: ${action}`
      );
    }

    if (userTenantId !== targetTenantId) {
      throw new Error(
        `🚨 [SECURITY EXCEPTION] Tenancy boundary violation! Attempted unauthorized ${action} across tenant divisions. Active User Tenant: ${userTenantId}, Target Data Tenant: ${targetTenantId}`
      );
    }
  }

  /**
   * Safe filter ensuring only items matching the user's tenant context are returned
   */
  public static enforceTenancyFilter<T extends { tenantId: string }>(
    data: T[],
    userTenantId: string
  ): T[] {
    if (!userTenantId) return [];
    return data.filter((item) => item.tenantId === userTenantId);
  }

  /**
   * Injects the tenantId context property into any outbound database or API payload
   */
  public static injectTenantContext<T extends Record<string, any>>(
    payload: T,
    userTenantId: string
  ): T & { tenantId: string } {
    if (!userTenantId) {
      throw new Error("🚨 [SECURITY EXCEPTION] Cannot inject tenancy. Tenant context identifier is empty.");
    }
    return {
      ...payload,
      tenantId: userTenantId
    };
  }

  /**
   * Validates if a document payload complies with multi-tenant structure rules
   */
  public static validateSchemaTenancy(payload: any): boolean {
    if (!payload || typeof payload !== "object") return false;
    if (!payload.tenantId || typeof payload.tenantId !== "string" || payload.tenantId.trim() === "") {
      return false;
    }
    return true;
  }
}
