export interface ExplainerInputs {
  expectedCash: number;
  actualCash: number;
  difference: number;
  lowConfidenceFields: string[];
  duplicateExpenseSuspected: boolean;
  unresolvedPaymentsCount: number;
}

export class ExplainabilityEngine {
  /**
   * Compiles audit failures and mathematical variances into natural, human-readable insights
   * so petrol pump managers can instantly isolate operational issues.
   */
  public static explainVariance(inputs: ExplainerInputs): string {
    const absDiff = Math.abs(inputs.difference);
    if (absDiff <= 10) {
      return "Reconciliation Complete: All accounts, nozzle registers, and cash counts are balanced and within standard tolerance limits.";
    }

    const direction = inputs.difference > 0 ? "SURPLUS" : "DEFICIT";
    let explanation = `Reconciliation Variance Detected (Cash ${direction} of ₹${absDiff.toLocaleString()}):\n`;
    explanation += `  - Expected Cash Balance: ₹${inputs.expectedCash.toLocaleString()}\n`;
    explanation += `  - Actual Physical Cash Collected: ₹${inputs.actualCash.toLocaleString()}\n`;
    explanation += `  - Outstanding Mismatch: ₹${absDiff.toLocaleString()}\n\n`;

    explanation += "Operational Contributing Factors:\n";
    let index = 1;

    if (inputs.unresolvedPaymentsCount > 0) {
      explanation += `  ${index++}. Missing Credit/UPI settlements: There are ${inputs.unresolvedPaymentsCount} unresolved digital payment tickets that have not yet cleared bank matching logs.\n`;
    }

    if (inputs.lowConfidenceFields.length > 0) {
      explanation += `  ${index++}. Low OCR certainty on field values: [${inputs.lowConfidenceFields.join(", ")}]. Scan noise might have introduced digit confusion (e.g. reading 8 as 0).\n`;
    }

    if (inputs.duplicateExpenseSuspected) {
      explanation += `  ${index++}. Suspected Duplicate Expense Ledger: An expense line entry is matching a previous shift's details, which may indicate a double-ledger booking error.\n`;
    }

    if (inputs.difference < 0 && inputs.unresolvedPaymentsCount === 0 && inputs.lowConfidenceFields.length === 0) {
      explanation += `  ${index++}. Unaccounted Shortage: Physical Till cash is less than the calculated book float, indicating possible operator payout leakage.\n`;
    }

    return explanation;
  }
}
