/**
 * DemandForecastEngine.ts
 * Time-series analysis predicting station demand loads.
 * Incorporates seasonal shifts, daily averages, and holiday impact factors.
 */

export interface HistoricalSalesPoint {
  dayOfWeek: number; // 0-6
  dailyLitersSold: number;
  isHoliday: boolean;
  averageTemperatureCelsius: number;
}

export interface DemandProjection {
  targetDateEpoch: number;
  projectedLiters: number;
  confidenceLowerLiters: number;
  confidenceUpperLiters: number;
  growthIndicatorPercent: number;
}

export class DemandForecastEngine {
  /**
   * Generates a 7-day demand projection utilizing seasonal moving averages and weighting multipliers
   */
  public static forecastFuelDemand(
    historicalSales: HistoricalSalesPoint[],
    daysToForecast: number = 7,
    growthTrendMultiplier: number = 1.02 // 2% baseline growth trend
  ): DemandProjection[] {
    if (historicalSales.length === 0) {
      return [];
    }

    const projections: DemandProjection[] = [];
    const baseEpoch = Date.now();

    // 1. Calculate baseline average consumption
    const totalSales = historicalSales.reduce((sum, h) => sum + h.dailyLitersSold, 0);
    const baselineAverage = totalSales / historicalSales.length;

    // 2. Compute weekday averages to capture weekly seasonality
    const weekdayAverages = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);

    historicalSales.forEach((h) => {
      weekdayAverages[h.dayOfWeek] += h.dailyLitersSold;
      weekdayCounts[h.dayOfWeek]++;
    });

    for (let i = 0; i < 7; i++) {
      if (weekdayCounts[i] > 0) {
        weekdayAverages[i] = weekdayAverages[i] / weekdayCounts[i];
      } else {
        weekdayAverages[i] = baselineAverage;
      }
    }

    // 3. Project out consecutive daily steps
    for (let day = 1; day <= daysToForecast; day++) {
      const targetDate = new Date(baseEpoch + day * 24 * 3600 * 1000);
      const targetDayOfWeek = targetDate.getDay();
      
      // Calculate seasonality index
      const seasonalityFactor = weekdayAverages[targetDayOfWeek] / (baselineAverage || 1);
      
      // Holiday index check (simulate weekend and general peak factors)
      const holidayMultiplier = (targetDayOfWeek === 0 || targetDayOfWeek === 6) ? 1.15 : 1.0;

      // Compound growth over projections timeline
      const projectionTrend = Math.pow(growthTrendMultiplier, day / 7);

      let projectedLiters = baselineAverage * seasonalityFactor * holidayMultiplier * projectionTrend;
      
      // Enforce bounds sanity check
      projectedLiters = Math.max(0, projectedLiters);

      // Define prediction confidence bands (e.g. +/- 8% variance window)
      const varianceBuffer = projectedLiters * 0.08;

      projections.push({
        targetDateEpoch: targetDate.getTime(),
        projectedLiters: Math.round(projectedLiters),
        confidenceLowerLiters: Math.round(projectedLiters - varianceBuffer),
        confidenceUpperLiters: Math.round(projectedLiters + varianceBuffer),
        growthIndicatorPercent: parseFloat(((projectionTrend - 1) * 100).toFixed(2))
      });
    }

    return projections;
  }
}
