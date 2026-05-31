/**
 * PredictiveWetstockEngine.ts
 * Applies statistical regression formulas to model fuel inventory fluctuations.
 * Compensates for standard thermal expansion and isolates potential physical leakages.
 */

export interface WetstockReading {
  timestamp: number;
  physicalStockLiters: number;
  bookStockLiters: number; // Replayed ledger balance
  fuelTemperatureCelsius: number;
}

export interface LeakAnalysisResult {
  varianceLiters: number;
  evaporationEstimateLiters: number;
  unexplainedVarianceLiters: number;
  leakRiskLevel: "OPTIMAL" | "LOW_RISK" | "HIGH_WARNING" | "CRITICAL_ACTION";
  regressionSlope: number; // Rate of change in Liters/Hour
}

export class PredictiveWetstockEngine {
  // Thermal expansion coefficient of Petroleum (approx 0.00095 per °C)
  private static readonly THERMAL_EXPANSION_COEFF = 0.00095;
  private static readonly BASE_TEMPERATURE_CELSIUS = 15.0; // Reference calibration standard

  /**
   * Adjusts actual stock values to temperature-compensated liters
   */
  public static calculateTemperatureCompensatedVolume(
    volumeLiters: number,
    currentTempCelsius: number
  ): number {
    const tempDelta = currentTempCelsius - this.BASE_TEMPERATURE_CELSIUS;
    const correctionFactor = 1 - (tempDelta * this.THERMAL_EXPANSION_COEFF);
    return volumeLiters * correctionFactor;
  }

  /**
   * Performs linear regression over historical wetstock reads to detect unexplained drift patterns
   */
  public static analyzeLeakRisk(
    readings: WetstockReading[]
  ): LeakAnalysisResult {
    if (readings.length < 2) {
      return {
        varianceLiters: 0,
        evaporationEstimateLiters: 0,
        unexplainedVarianceLiters: 0,
        leakRiskLevel: "OPTIMAL",
        regressionSlope: 0
      };
    }

    let totalVariance = 0;
    const xValues: number[] = []; // Hours since start
    const yValues: number[] = []; // Unexplained variance

    const baseTime = readings[0].timestamp;

    readings.forEach((r) => {
      // 1. Compensate physical stock reading
      const compensatedPhysical = this.calculateTemperatureCompensatedVolume(
        r.physicalStockLiters,
        r.fuelTemperatureCelsius
      );

      // 2. Compute absolute drift variance against transactional ledger
      const variance = compensatedPhysical - r.bookStockLiters;
      totalVariance += variance;

      const hoursPassed = (r.timestamp - baseTime) / (1000 * 3600);
      xValues.push(hoursPassed);
      yValues.push(variance);
    });

    // 3. Run ordinary least squares linear regression (y = mx + c)
    const n = readings.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = (n * sumXX) - (sumX * sumX);
    
    // Regression slope: litters lost per hour
    const slope = denominator !== 0 ? (numerator / denominator) : 0;

    // Evaporation estimate: average baseline evaporation loss (~0.05% of capacity per day)
    // For safety, let's estimate standard micro-evaporation loss at -0.15 Liters/Hour
    const standardEvaporationSlope = -0.15;
    const expectedEvaporationLiters = standardEvaporationSlope * (xValues[xValues.length - 1] || 0);

    const netVariance = yValues[yValues.length - 1] || 0;
    // Unexplained loss after factoring standard evaporation
    const unexplained = netVariance - expectedEvaporationLiters;

    let riskLevel: LeakAnalysisResult["leakRiskLevel"] = "OPTIMAL";
    
    // If slope is strongly negative, it implies progressive fuel loss (leak/theft)
    if (slope < -1.5) {
      riskLevel = "CRITICAL_ACTION";
    } else if (slope < -0.8) {
      riskLevel = "HIGH_WARNING";
    } else if (slope < -0.3) {
      riskLevel = "LOW_RISK";
    }

    return {
      varianceLiters: parseFloat(netVariance.toFixed(2)),
      evaporationEstimateLiters: parseFloat(expectedEvaporationLiters.toFixed(2)),
      unexplainedVarianceLiters: parseFloat(unexplained.toFixed(2)),
      leakRiskLevel: riskLevel,
      regressionSlope: parseFloat(slope.toFixed(4))
    };
  }
}
