/**
 * UsageQuotaEngine.ts
 * Real-time usage monitoring controller.
 * Tracks storage volumes, API counts, and active resources against subscriber quota limits.
 */

export interface QuotaConfig {
  maxMonthlyApiCalls: number;
  maxMonthlyOcrScans: number;
  maxStorageBytes: number;
}

export interface QuotaUsage {
  tenantId: string;
  monthlyApiCount: number;
  monthlyOcrCount: number;
  storageBytes: number;
  lastUpdated: number;
}

export class UsageQuotaEngine {
  // Hardcoded quota structures for subscription tiers
  private static readonly TIERS_QUOTA: Record<"FREE" | "GROWTH" | "ENTERPRISE", QuotaConfig> = {
    FREE: {
      maxMonthlyApiCalls: 5000,
      maxMonthlyOcrScans: 100,
      maxStorageBytes: 100 * 1024 * 1024 // 100 MB
    },
    GROWTH: {
      maxMonthlyApiCalls: 50000,
      maxMonthlyOcrScans: 1500,
      maxStorageBytes: 5 * 1024 * 1024 * 1024 // 5 GB
    },
    ENTERPRISE: {
      maxMonthlyApiCalls: 1000000,
      maxMonthlyOcrScans: 100000,
      maxStorageBytes: 100 * 1024 * 1024 * 1024 // 100 GB
    }
  };

  /**
   * Fetches the maximum configurations for a subscription tier
   */
  public static getQuotaLimits(tier: "FREE" | "GROWTH" | "ENTERPRISE"): QuotaConfig {
    return this.TIERS_QUOTA[tier];
  }

  /**
   * Validates whether a resource mutation will breach the storage quota limits
   */
  public static evaluateStorageQuota(
    tier: "FREE" | "GROWTH" | "ENTERPRISE",
    currentStorageBytes: number,
    incomingBytes: number
  ): { isAllowed: boolean; currentMB: number; maxMB: number } {
    const limit = this.getQuotaLimits(tier);
    const newTotal = currentStorageBytes + incomingBytes;
    
    return {
      isAllowed: newTotal <= limit.maxStorageBytes,
      currentMB: Math.round(newTotal / (1024 * 1024)),
      maxMB: Math.round(limit.maxStorageBytes / (1024 * 1024))
    };
  }

  /**
   * Evaluates if OCR processing requests can be fulfilled based on current usage metrics
   */
  public static evaluateOcrQuota(
    tier: "FREE" | "GROWTH" | "ENTERPRISE",
    currentOcrCount: number
  ): { isAllowed: boolean; percentageUsed: number } {
    const limit = this.getQuotaLimits(tier);
    const percentage = (currentOcrCount / limit.maxMonthlyOcrScans) * 100;
    
    return {
      isAllowed: currentOcrCount < limit.maxMonthlyOcrScans,
      percentageUsed: Math.min(percentage, 100)
    };
  }

  /**
   * Generates a structural warning report on quota depletion
   */
  public static checkQuotaDepletionStatus(
    tier: "FREE" | "GROWTH" | "ENTERPRISE",
    usage: QuotaUsage
  ): { warningTriggered: boolean; warnings: string[] } {
    const limit = this.getQuotaLimits(tier);
    const warnings: string[] = [];

    // Warn at 85% exhaustion thresholds
    if (usage.monthlyApiCount >= limit.maxMonthlyApiCalls * 0.85) {
      warnings.push(`Warning: API Request usage is at ${Math.round((usage.monthlyApiCount / limit.maxMonthlyApiCalls) * 100)}% of monthly capacity.`);
    }

    if (usage.monthlyOcrCount >= limit.maxMonthlyOcrScans * 0.85) {
      warnings.push(`Warning: OCR scans usage is at ${Math.round((usage.monthlyOcrCount / limit.maxMonthlyOcrScans) * 100)}% of monthly capacity.`);
    }

    if (usage.storageBytes >= limit.maxStorageBytes * 0.85) {
      warnings.push(`Warning: Tenant cloud storage capacity is at ${Math.round((usage.storageBytes / limit.maxStorageBytes) * 100)}%.`);
    }

    return {
      warningTriggered: warnings.length > 0,
      warnings
    };
  }
}
