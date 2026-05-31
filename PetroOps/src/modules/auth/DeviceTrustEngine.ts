/**
 * DeviceTrustEngine
 * Computes hardware/workstation fingerprint hashes and maintains the active tenant trusted devices database.
 * Blocks API access from unauthorized browser contexts or unapproved remote environments.
 */

export interface TrustedDeviceRecord {
  deviceHash: string;
  deviceName: string;
  tenantId: string;
  registeredBy: string;
  registeredAt: number;
  lastUsedAt: number;
  isApproved: boolean;
  userAgentSnippet: string;
}

export class DeviceTrustEngine {
  private static localDeviceTrustCacheKey = "pumpai_trusted_device_metadata";

  /**
   * Generates a stable, mathematical SHA-256 fingerprint representing the current workstation parameters.
   */
  public static async calculateDeviceFingerprint(): Promise<string> {
    if (typeof window === "undefined") {
      // Server-side fallback or testing environments
      return "srv_fingerprint_dummy_sha256_hash_value";
    }

    const nav = window.navigator;
    const screenInfo = window.screen;
    
    const fingerprintPayload = {
      userAgent: nav.userAgent,
      language: nav.language,
      platform: (nav as any).platform || "unknown",
      hardwareConcurrency: nav.hardwareConcurrency || 4,
      deviceMemory: (nav as any).deviceMemory || 8,
      colorDepth: screenInfo.colorDepth,
      width: screenInfo.width,
      height: screenInfo.height,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const payloadString = JSON.stringify(fingerprintPayload);
    
    // Hash using SHA-256 via SubtleCrypto
    if (window.crypto && window.crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(payloadString);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hashHex;
      } catch (e) {
        console.warn("SubtleCrypto digest failed, falling back to custom hashing", e);
      }
    }

    // Custom non-crypto robust fallback hashing function (djb2 hash equivalent)
    let hash = 5381;
    for (let i = 0; i < payloadString.length; i++) {
      hash = (hash * 33) ^ payloadString.charCodeAt(i);
    }
    return `dev_fb_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Retrieves the trusted device database for a tenant from mock/Firestore sync storage.
   */
  public static getTenantTrustedDevices(tenantId: string): TrustedDeviceRecord[] {
    const defaultDevices: TrustedDeviceRecord[] = [
      {
        deviceHash: "a1b2c3d4e5f678901234567890abcdef",
        deviceName: "Delhi Branch Master Pos Terminal 01",
        tenantId: "tenant-delhi-01",
        registeredBy: "admin@pumpai.com",
        registeredAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastUsedAt: Date.now(),
        isApproved: true,
        userAgentSnippet: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      },
      {
        deviceHash: "f9e8d7c6b5a432109876543210fedcba",
        deviceName: "Mumbai Branch Backoffice PC",
        tenantId: "tenant-delhi-01",
        registeredBy: "manager@pumpai.com",
        registeredAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        lastUsedAt: Date.now() - 12 * 60 * 60 * 1000,
        isApproved: false,
        userAgentSnippet: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    ];

    try {
      const stored = localStorage.getItem(`${this.localDeviceTrustCacheKey}_${tenantId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      // Populate defaults on initial query
      localStorage.setItem(`${this.localDeviceTrustCacheKey}_${tenantId}`, JSON.stringify(defaultDevices));
      return defaultDevices;
    } catch {
      return defaultDevices;
    }
  }

  /**
   * Saves updated device lists to storage.
   */
  private static saveTenantTrustedDevices(tenantId: string, records: TrustedDeviceRecord[]) {
    try {
      localStorage.setItem(`${this.localDeviceTrustCacheKey}_${tenantId}`, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to write Device Trust database", e);
    }
  }

  /**
   * Asserts whether a device fingerprint is registered and approved for tenant operations.
   */
  public static assertDeviceTrust(tenantId: string, deviceHash: string): boolean {
    const devices = this.getTenantTrustedDevices(tenantId);
    const matched = devices.find(d => d.deviceHash === deviceHash);
    return !!(matched && matched.isApproved);
  }

  /**
   * Registers a new hardware context for supervisor review.
   */
  public static async registerCurrentDevice(tenantId: string, name: string, userId: string): Promise<TrustedDeviceRecord> {
    const hash = await this.calculateDeviceFingerprint();
    const devices = this.getTenantTrustedDevices(tenantId);
    
    const existing = devices.find(d => d.deviceHash === hash);
    if (existing) {
      return existing;
    }

    const newRecord: TrustedDeviceRecord = {
      deviceHash: hash,
      deviceName: name,
      tenantId,
      registeredBy: userId,
      registeredAt: Date.now(),
      lastUsedAt: Date.now(),
      isApproved: false, // Requires manual supervisor override approval
      userAgentSnippet: typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 100) : "Server API"
    };

    devices.push(newRecord);
    this.saveTenantTrustedDevices(tenantId, devices);
    return newRecord;
  }

  /**
   * Approves a registered device fingerprint.
   */
  public static approveDevice(tenantId: string, deviceHash: string): boolean {
    const devices = this.getTenantTrustedDevices(tenantId);
    const match = devices.find(d => d.deviceHash === deviceHash);
    if (match) {
      match.isApproved = true;
      this.saveTenantTrustedDevices(tenantId, devices);
      return true;
    }
    return false;
  }

  /**
   * Revokes approval for a specific device fingerprint.
   */
  public static revokeDevice(tenantId: string, deviceHash: string): boolean {
    const devices = this.getTenantTrustedDevices(tenantId);
    const match = devices.find(d => d.deviceHash === deviceHash);
    if (match) {
      match.isApproved = false;
      this.saveTenantTrustedDevices(tenantId, devices);
      return true;
    }
    return false;
  }
}
