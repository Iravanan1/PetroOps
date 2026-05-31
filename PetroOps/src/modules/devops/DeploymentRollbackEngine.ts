/**
 * DeploymentRollbackEngine.ts
 * Manages zero-downtime application version monitoring, error checks, and rollback routines.
 * Intercepts stability anomalies and swaps operational configurations automatically.
 */

export interface DeploymentManifest {
  version: string;
  imageTag: string;
  deployedAt: number;
  status: "STABLE" | "DEPRECATING" | "ROLLED_BACK" | "FAILED";
  checksum: string;
}

export interface DeploymentAuditLog {
  timestamp: number;
  triggerSource: "SYSTEM_MONITOR" | "ADMIN_OVERRIDE";
  reason: string;
  previousVersion: string;
  restoredVersion: string;
}

export class DeploymentRollbackEngine {
  private static readonly STABILITY_THRESHOLD_PERCENT = 5.0; // Fail at 5% error rates

  /**
   * Evaluates deployment health telemetry and triggers automated rollbacks if required
   */
  public static evaluateDeploymentStability(
    activeManifest: DeploymentManifest,
    errorRatePercent: number,
    transactionFailureCount: number
  ): { triggerRollback: boolean; reason?: string } {
    if (errorRatePercent >= this.STABILITY_THRESHOLD_PERCENT) {
      return {
        triggerRollback: true,
        reason: `Automated Rollback: Active version '${activeManifest.version}' error rate is at ${errorRatePercent}%, exceeding safety threshold of ${this.STABILITY_THRESHOLD_PERCENT}%.`
      };
    }

    // Critical accounting safety: reject if ledger processing failures are detected
    if (transactionFailureCount > 5) {
      return {
        triggerRollback: true,
        reason: `Automated Rollback: Detected ${transactionFailureCount} consecutive ledger event validation crashes on version '${activeManifest.version}'.`
      };
    }

    return { triggerRollback: false };
  }

  /**
   * Executes restoration routine to revert the active version environment to the last stable manifest
   */
  public static executeRollback(
    activeManifest: DeploymentManifest,
    stableHistory: DeploymentManifest[],
    triggerSource: "SYSTEM_MONITOR" | "ADMIN_OVERRIDE",
    reason: string
  ): { updatedManifest: DeploymentManifest; rollbackAudit: DeploymentAuditLog } {
    const lastStable = stableHistory.find((m) => m.status === "STABLE");

    if (!lastStable) {
      throw new Error(
        `🚨 [DEVOPS EXCEPTION] Deployment Rollback Aborted! Could not find any stable historical manifest to revert to for version '${activeManifest.version}'.`
      );
    }

    const updatedActive: DeploymentManifest = {
      ...activeManifest,
      status: "ROLLED_BACK"
    };

    const rollbackAudit: DeploymentAuditLog = {
      timestamp: Date.now(),
      triggerSource,
      reason,
      previousVersion: activeManifest.version,
      restoredVersion: lastStable.version
    };

    return {
      updatedManifest: updatedActive,
      rollbackAudit
    };
  }
}
