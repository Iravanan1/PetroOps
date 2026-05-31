/**
 * SubscriptionEngine.ts
 * Manages SaaS subscriptions, license metrics, renewal bounds, and active capabilities.
 * Restricts access to advanced modules based on subscriber tiers.
 */

export type SubscriptionTier = "FREE" | "GROWTH" | "ENTERPRISE";

export interface SubscriptionStatus {
  tenantId: string;
  tier: SubscriptionTier;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED" | "CANCELLED";
  expiresAt: number; // Unix timestamp
  maxStationsAllowed: number;
  maxUsersAllowed: number;
  features: string[];
}

export class SubscriptionEngine {
  // Enterprise modules feature mapping keys
  private static readonly TIER_FEATURES: Record<SubscriptionTier, string[]> = {
    FREE: ["SHIFT_CONTROL", "BASIC_REPORTING", "MANAGE_STAFF"],
    GROWTH: [
      "SHIFT_CONTROL",
      "BASIC_REPORTING",
      "MANAGE_STAFF",
      "OCR_VALIDATION",
      "UPI_MANAGEMENT",
      "CREDIT_LEDGER",
      "BANKING_INTEGRATION"
    ],
    ENTERPRISE: [
      "SHIFT_CONTROL",
      "BASIC_REPORTING",
      "MANAGE_STAFF",
      "OCR_VALIDATION",
      "UPI_MANAGEMENT",
      "CREDIT_LEDGER",
      "BANKING_INTEGRATION",
      "HARDWARE_INTEGRATION", // Nozzles and ATG probes
      "LIVE_BANK_SETTLEMENTS", // PhonePe, Paytm API reconciliations
      "FORENSIC_REPLAY", // Ledger timeline reconstructor
      "ADVANCED_ANALYTICS", // Predictive wetstock evaporation regression
      "AUDIT_CERTIFICATION", // Tamper-proof compliance signing
      "MULTI_FACTOR_AUTH", // Hardware trusted tokens
      "DISTRIBUTED_OBSERVABILITY" // Telemetry tracing
    ]
  };

  /**
   * Asserts whether a tenant has access to a specific feature key based on subscription tier
   */
  public static isFeaturePermitted(
    tenantTier: SubscriptionTier,
    status: SubscriptionStatus["status"],
    expiresAt: number,
    featureKey: string
  ): boolean {
    // Check general subscription status validity
    if (status !== "ACTIVE") {
      return false;
    }

    if (Date.now() > expiresAt) {
      return false; // Subscription expired
    }

    const allowedFeatures = this.TIER_FEATURES[tenantTier] || [];
    return allowedFeatures.includes(featureKey);
  }

  /**
   * Safe assertion that throws a runtime error if subscription bounds are violated
   */
  public static assertFeatureAccess(
    status: SubscriptionStatus,
    featureKey: string
  ): void {
    const permitted = this.isFeaturePermitted(
      status.tier,
      status.status,
      status.expiresAt,
      featureKey
    );

    if (!permitted) {
      throw new Error(
        `🚨 [LICENSE EXCEPTION] Subscription tier '${status.tier}' does not possess permissions for advanced capability: '${featureKey}'. Upgrade required.`
      );
    }
  }

  /**
   * Verifies if additional station nodes comply with subscription bounds
   */
  public static verifyStationCapacity(
    status: SubscriptionStatus,
    currentCount: number
  ): { allowed: boolean; message?: string } {
    if (currentCount >= status.maxStationsAllowed) {
      return {
        allowed: false,
        message: `Tenant capacity exceeded. Active stations: ${currentCount}, maximum allowed in '${status.tier}': ${status.maxStationsAllowed}`
      };
    }
    return { allowed: true };
  }
}
