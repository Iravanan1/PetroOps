/**
 * WetstockLeakageEngine.ts
 * Volumetric wetstock inventory verification and regression analyzer.
 * Separates standard temperature expansion/evaporation limits from pipe or tank leaks.
 */

export interface WetstockReport {
  tankId: string;
  productType: string;
  salesLitersByMeters: number;
  startingDipLiters: number;
  endingDipLiters: number;
  expectedEndingDipLiters: number;
  absoluteVarianceLiters: number;
  evaporationLossToleranceLiters: number;
  densityExpansionToleranceLiters: number;
  unexplainedVarianceLiters: number;
  status: "optimal" | "evaporation_bounds" | "suspected_leakage" | "critical_leak";
  leakageConfidencePct: number;
}

export class WetstockLeakageEngine {
  // Evaporation percentages configured in retail fuel industry guidelines
  private static EVAP_LIMIT_MS = 0.006; // 0.6% max for Petrol (volatile)
  private static EVAP_LIMIT_HSD = 0.001; // 0.1% max for Diesel (low volatility)
  private static DENSITY_TOLERANCE_PCT = 0.002; // 0.2% temperature variance coefficient

  /**
   * Performs volumetric mass-balance calculations isolating tank inventory discrepancies
   */
  public static analyzeWetstockLeakage(
    tankId: string,
    productType: "MS" | "HSD" | "XP95" | "Speed" | "Power",
    startingDipLiters: number,
    endingDipLiters: number,
    salesLitersByMeters: number,
    testDensity: number, // actual reported density in kg/m3 during shift
    standardDensity: number // standard product standard density in kg/m3 (e.g. 745.0)
  ): WetstockReport {
    // 1. Expected Ending Volume = Starting Volume minus Sales volume recorded by mechanical meters
    const expectedEndingDipLiters = startingDipLiters - salesLitersByMeters;

    // 2. Absolute Variance = Actual ending dip minus expected ending dip
    const absoluteVarianceLiters = endingDipLiters - expectedEndingDipLiters; // Negative represents shortages

    // 3. Evaporation tolerances based on product volatility limits
    const isPetrol = productType === "MS" || productType === "Speed" || productType === "XP95" || productType === "Power";
    const evapFactor = isPetrol ? this.EVAP_LIMIT_MS : this.EVAP_LIMIT_HSD;
    const evaporationLossToleranceLiters = salesLitersByMeters * evapFactor;

    // 4. Density expansion tolerance adjustments based on ambient product temp fluctuations
    const densityRatio = testDensity > 0 && standardDensity > 0 ? (standardDensity - testDensity) / standardDensity : 0;
    const densityExpansionToleranceLiters = Math.abs(startingDipLiters * densityRatio);

    // 5. Unexplained Variance = Absolute Variance corrected by standard tolerances
    let unexplainedVarianceLiters = absoluteVarianceLiters;
    
    if (absoluteVarianceLiters < 0) { // product shortage
      // Allow credit for standard evaporation losses and density shrinkages
      const totalAllowedTolerance = evaporationLossToleranceLiters + densityExpansionToleranceLiters;
      unexplainedVarianceLiters = Math.min(0, absoluteVarianceLiters + totalAllowedTolerance);
    }

    // 6. Classification routing based on severity thresholds
    let status: "optimal" | "evaporation_bounds" | "suspected_leakage" | "critical_leak" = "optimal";
    let leakageConfidencePct = 0;

    const unexplainedAbs = Math.abs(unexplainedVarianceLiters);

    if (unexplainedVarianceLiters < 0) {
      if (unexplainedAbs > 120.00) { // extreme shortage
        status = "critical_leak";
        leakageConfidencePct = Math.min(100, Math.round(70 + (unexplainedAbs / startingDipLiters) * 1000));
      } else if (unexplainedAbs > 40.00) { // moderate unexplained discrepancy
        status = "suspected_leakage";
        leakageConfidencePct = Math.min(70, Math.round(30 + (unexplainedAbs / startingDipLiters) * 500));
      } else if (Math.abs(absoluteVarianceLiters) > evaporationLossToleranceLiters) {
        status = "evaporation_bounds";
        leakageConfidencePct = 10;
      }
    }

    return {
      tankId,
      productType,
      salesLitersByMeters: Math.round(salesLitersByMeters * 100) / 100,
      startingDipLiters: Math.round(startingDipLiters * 100) / 100,
      endingDipLiters: Math.round(endingDipLiters * 100) / 100,
      expectedEndingDipLiters: Math.round(expectedEndingDipLiters * 100) / 100,
      absoluteVarianceLiters: Math.round(absoluteVarianceLiters * 100) / 100,
      evaporationLossToleranceLiters: Math.round(evaporationLossToleranceLiters * 100) / 100,
      densityExpansionToleranceLiters: Math.round(densityExpansionToleranceLiters * 100) / 100,
      unexplainedVarianceLiters: Math.round(unexplainedVarianceLiters * 100) / 100,
      status,
      leakageConfidencePct,
    };
  }
}
