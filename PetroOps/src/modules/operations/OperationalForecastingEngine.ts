/**
 * OperationalForecastingEngine.ts
 * ───────────────────────────────
 * Implements explainable, lightweight daily rolling forecast metrics.
 * Predicts expected sales, credit collections recoveries, and stock depletion rates.
 */

export interface SalesForecast {
  day: string;
  expectedLitres: number;
  lowerBound: number;
  upperBound: number;
  factorExplanation: string;
}

export interface StockDepletionForecast {
  fuelType: 'MS' | 'HSD';
  currentLitres: number;
  averageDailySales: number;
  daysToDry: number;
  reorderAlert: boolean;
}

export class OperationalForecastingEngine {
  /**
   * Generates rolling sales forecast for succeeding 3 days based on historic week average
   */
  public static forecastSales(historicWeeklyAverage: number): SalesForecast[] {
    const today = new Date();
    const factors = [
      { name: 'Monday Baseline', multiplier: 1.0, expl: 'Standard weekly operations baseline' },
      { name: 'Tuesday Maintenance', multiplier: 0.95, expl: 'Slight highway commercial transit dip' },
      { name: 'Wednesday Peak', multiplier: 1.08, expl: 'Commercial trucking logistics peak mid-week' }
    ];

    return Array.from({ length: 3 }).map((_, i) => {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i + 1);
      const dateStr = nextDate.toISOString().slice(0, 10);
      
      const factor = factors[i % factors.length];
      const base = historicWeeklyAverage * factor.multiplier;
      
      return {
        day: dateStr,
        expectedLitres: parseFloat(base.toFixed(0)),
        lowerBound: parseFloat((base * 0.9).toFixed(0)),
        upperBound: parseFloat((base * 1.1).toFixed(0)),
        factorExplanation: factor.expl
      };
    });
  }

  /**
   * Evaluates stock depletion rates and determines reorder trigger points
   */
  public static evaluateStockDepletion(
    currentHsd: number,
    currentMs: number,
    avgHsdSales: number,
    avgMsSales: number
  ): StockDepletionForecast[] {
    const hsdDays = avgHsdSales > 0 ? currentHsd / avgHsdSales : 99;
    const msDays = avgMsSales > 0 ? currentMs / avgMsSales : 99;

    return [
      {
        fuelType: 'MS',
        currentLitres: currentMs,
        averageDailySales: avgMsSales,
        daysToDry: parseFloat(msDays.toFixed(1)),
        reorderAlert: msDays < 2.0 // Alert if stock dry-out is under 2 days
      },
      {
        fuelType: 'HSD',
        currentLitres: currentHsd,
        averageDailySales: avgHsdSales,
        daysToDry: parseFloat(hsdDays.toFixed(1)),
        reorderAlert: hsdDays < 2.0
      }
    ];
  }
}
