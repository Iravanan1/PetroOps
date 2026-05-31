/**
 * EnvironmentPromotionEngine.ts
 * Manages operational profile swaps and safety promotion audits across staging, local, and production environments.
 * Protects production databases from accidental sandbox leakages.
 */

export type EnvironmentProfile = "LOCAL_DEVELOPMENT" | "STAGING_SANDBOX" | "PRODUCTION_ENTERPRISE";

export interface EnvironmentConfig {
  profile: EnvironmentProfile;
  firebaseDbPath: string;
  apiGatewayUrl: string;
  enableDebugLogs: boolean;
  isolationKeyChecksum: string;
}

export class EnvironmentPromotionEngine {
  /**
   * Evaluates environment promotion readiness by auditing vital parameters and secrets sanity
   */
  public static auditEnvironmentPromotion(
    targetProfile: EnvironmentProfile,
    config: EnvironmentConfig,
    encryptionKey: string
  ): { ready: boolean; violations: string[] } {
    const violations: string[] = [];

    // 1. Enforce strict database boundary protections
    if (targetProfile === "PRODUCTION_ENTERPRISE") {
      if (config.firebaseDbPath.includes("demo") || config.firebaseDbPath.includes("sandbox")) {
        violations.push("Critical: Production environment cannot point to a Sandbox/Demo database pool.");
      }

      if (config.apiGatewayUrl.includes("localhost") || config.apiGatewayUrl.includes("127.0.0.1")) {
        violations.push("Critical: Production environment cannot route to local gateway loopbacks.");
      }

      if (config.enableDebugLogs) {
        violations.push("Security Warning: verbose debug logs must be disabled in Production environments.");
      }

      // Check security signature key size
      if (!encryptionKey || encryptionKey.length < 32) {
        violations.push("Security Failure: Production cryptographic key size must be strictly >= 32 characters.");
      }
    }

    if (targetProfile === "STAGING_SANDBOX") {
      if (config.firebaseDbPath.includes("prod")) {
        violations.push("Data Leak Risk: Sandbox environment is directly targeting a production database endpoint.");
      }
    }

    return {
      ready: violations.length === 0,
      violations
    };
  }

  /**
   * Returns complete network configurations mapped to target environments
   */
  public static getEnvironmentDefaults(profile: EnvironmentProfile): EnvironmentConfig {
    switch (profile) {
      case "PRODUCTION_ENTERPRISE":
        return {
          profile,
          firebaseDbPath: "projects/pumpai-prod-db/databases/(default)",
          apiGatewayUrl: "https://api.gateway.pumpai.com/v1",
          enableDebugLogs: false,
          isolationKeyChecksum: "0c8a5f4d2e9c1b7a"
        };
      case "STAGING_SANDBOX":
        return {
          profile,
          firebaseDbPath: "projects/pumpai-staging-db/databases/(default)",
          apiGatewayUrl: "https://api-sandbox.gateway.pumpai.com/v1",
          enableDebugLogs: true,
          isolationKeyChecksum: "8a4f6d3c2e1b5a9f"
        };
      case "LOCAL_DEVELOPMENT":
      default:
        return {
          profile: "LOCAL_DEVELOPMENT",
          firebaseDbPath: "projects/pumpai-dev-db/databases/(default)",
          apiGatewayUrl: "http://localhost:8080/api/v1",
          enableDebugLogs: true,
          isolationKeyChecksum: "local-dev-isolation-token"
        };
    }
  }
}
