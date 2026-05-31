/**
 * VerifiedAccountingTruthEngine.ts
 * Enforces rigorous accounting validation rules on human labeling entries
 * before permitting status progression to grounded truth states.
 */

export interface LabelAccountingInput {
  nozzles: Array<{
    id: string;
    opening: number;
    closing: number;
    price: number;
  }>;
  wetstock: {
    openingVolume: number;
    closingVolume: number;
    deliveries: number;
    density: number;
  };
  collections: {
    cashReceived: number;
    cardCollections: number;
    upiCollections: number;
    creditSales: number;
    expenses: number;
  };
}

export interface AccountingValidationReport {
  passed: boolean;
  errors: string[];
  mismatchScore: number;
}

export class VerifiedAccountingTruthEngine {
  /**
   * Evaluates manual ground truth entry parameters for compliance with core accounting formulas
   */
  public static validate(input: LabelAccountingInput): AccountingValidationReport {
    const errors: string[] = [];
    let mismatchScore = 0;

    // 1. Validate Nozzles Meter Continuity
    let totalSalesVolume = 0;
    let expectedRevenue = 0;

    input.nozzles.forEach(noz => {
      if (noz.closing < noz.opening) {
        errors.push(`Compliance Breach: Nozzle "${noz.id}" closing meter (${noz.closing}) cannot be less than opening meter (${noz.opening}).`);
        mismatchScore += 100;
      } else {
        const salesVolume = noz.closing - noz.opening;
        totalSalesVolume += salesVolume;
        expectedRevenue += salesVolume * noz.price;
      }
    });

    // 2. Validate Double-Entry Settlement Reconciliations
    const reportedTotalCollections = 
      input.collections.cashReceived + 
      input.collections.cardCollections + 
      input.collections.upiCollections + 
      input.collections.creditSales + 
      input.collections.expenses;

    const balanceDifference = Math.abs(expectedRevenue - reportedTotalCollections);
    
    // Enforce strict Indian Rupee penny-rounding limits (tolerance of ₹5 for minor currency variations)
    if (balanceDifference > 5.0) {
      errors.push(`Double-Entry Mismatch: Total nozzle sales revenue of ₹${expectedRevenue.toFixed(2)} does not balance against categoric settlements of ₹${reportedTotalCollections.toFixed(2)} (variance: ₹${balanceDifference.toFixed(2)}).`);
      mismatchScore += balanceDifference;
    }

    // 3. Validate Wetstock Evaporative Bounds
    const expectedClosingStock = input.wetstock.openingVolume - totalSalesVolume + input.wetstock.deliveries;
    const stockDiscrepancy = input.wetstock.closingVolume - expectedClosingStock;
    const allowedVariance = expectedClosingStock * 0.001 * (input.wetstock.density / 750); // 0.1% evaporation limit
    
    if (Math.abs(stockDiscrepancy) > allowedVariance) {
      errors.push(`Wetstock Deviation: Closing physical inventory (${input.wetstock.closingVolume}L) deviates from calculated stock (${expectedClosingStock.toFixed(2)}L) by ${stockDiscrepancy.toFixed(2)}L, exceeding the evaporation threshold of ${allowedVariance.toFixed(2)}L.`);
      mismatchScore += Math.abs(stockDiscrepancy) * 2;
    }

    return {
      passed: errors.length === 0,
      errors,
      mismatchScore: Number(mismatchScore.toFixed(2))
    };
  }
}
