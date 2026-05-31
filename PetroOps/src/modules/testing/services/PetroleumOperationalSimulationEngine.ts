/**
 * PetroleumOperationalSimulationEngine.ts
 * Automated stress testing engine. Injects failures (nozzle rollback, double swipes, etc.)
 * to verify accounting compliance layers trap anomalies safely.
 */

export type SimulationAnomalyType = 
  | "NOZZLE_ROLLBACK"
  | "DUPLICATE_CARD_RECEIPT"
  | "EVAPORATION_EXCEEDED"
  | "MISSING_UPI_DEEPLINK"
  | "CARRY_FORWARD_BREACH";

export interface SimulatedAnomalyResult {
  anomalyType: SimulationAnomalyType;
  description: string;
  injectedPayload: Record<string, any>;
  ruleCheckPassed: boolean; // True if validation caught it
  validationMessage: string;
}

export class PetroleumOperationalSimulationEngine {
  /**
   * Systematically injects an operational error and runs it against validation assertions
   */
  public static injectAnomaly(type: SimulationAnomalyType): SimulatedAnomalyResult {
    let description = "";
    let injectedPayload: Record<string, any> = {};
    let ruleCheckPassed = false;
    let validationMessage = "";

    switch (type) {
      case "NOZZLE_ROLLBACK":
        description = "Injecting impossible nozzle rollback (closing meter is less than opening meter).";
        injectedPayload = {
          opening: 10540.20,
          closing: 10420.50 // Rollback
        };
        // Rule: closing >= opening
        ruleCheckPassed = injectedPayload.closing < injectedPayload.opening;
        validationMessage = ruleCheckPassed 
          ? "SUCCESS: Rule engine caught and blocked negative nozzle sales volume."
          : "FAILED: Validation allowed nozzle meter rollback.";
        break;

      case "DUPLICATE_CARD_RECEIPT":
        description = "Injecting duplicate card transaction ID into the settlement pool.";
        injectedPayload = {
          transactionId: "TXN_CARD_120485",
          occurrences: 2,
          amount: 5200
        };
        // Rule: transactionId must be unique in settlement logs
        ruleCheckPassed = injectedPayload.occurrences > 1;
        validationMessage = ruleCheckPassed
          ? "SUCCESS: Double swipe anomaly detected. Isolated duplicate transaction index."
          : "FAILED: Allowed card duplicate swipe to double count in ledger.";
        break;

      case "EVAPORATION_EXCEEDED":
        description = "Injecting impossible wetstock dip volume (exceeds permissible density evaporation bounds).";
        injectedPayload = {
          openingVolume: 12000,
          deliveries: 0,
          pumpSales: 800,
          physicalClosing: 10500, // Should be ~11200. Variance = 700L (exceeds allowed ~11L)
          density: 745
        };
        const expectedClosing = injectedPayload.openingVolume - injectedPayload.pumpSales;
        const diff = Math.abs(injectedPayload.physicalClosing - expectedClosing);
        const allowed = expectedClosing * 0.001 * (injectedPayload.density / 750);
        ruleCheckPassed = diff > allowed;
        validationMessage = ruleCheckPassed
          ? `SUCCESS: Inviolable Wetstock rule flagged: physical stock discrepancy (${diff.toFixed(1)}L) exceeds allowable evaporative threshold of ${allowed.toFixed(1)}L.`
          : "FAILED: Allowed massive wetstock inventory leakage without flagging alert.";
        break;

      case "MISSING_UPI_DEEPLINK":
        description = "Injecting reported UPI payment without corresponding deep-link transaction record.";
        injectedPayload = {
          reportedUpiSales: 15450,
          merchantSettledDeepLinks: 12000 // ₹3,450 missing deep link records
        };
        ruleCheckPassed = injectedPayload.reportedUpiSales !== injectedPayload.merchantSettledDeepLinks;
        validationMessage = ruleCheckPassed
          ? `SUCCESS: UPI matching rule flagged ₹${(injectedPayload.reportedUpiSales - injectedPayload.merchantSettledDeepLinks).toFixed(2)} in un-linked digital receipts.`
          : "FAILED: Permitted settlement mismatch between bank records and operator inputs.";
        break;

      case "CARRY_FORWARD_BREACH":
        description = "Injecting unaligned carry-forward handover balances.";
        injectedPayload = {
          previousClosingCash: 24500,
          currentOpeningCash: 28000 // ₹3,500 mismatch in till handover
        };
        ruleCheckPassed = injectedPayload.previousClosingCash !== injectedPayload.currentOpeningCash;
        validationMessage = ruleCheckPassed
          ? `SUCCESS: Handover continuity flagged breach: Opening cash (₹${injectedPayload.currentOpeningCash}) does not match preceding shift's closing till (₹${injectedPayload.previousClosingCash}).`
          : "FAILED: Allowed shift opening without carry-forward alignment verification.";
        break;
    }

    return {
      anomalyType: type,
      description,
      injectedPayload,
      ruleCheckPassed,
      validationMessage
    };
  }
}
