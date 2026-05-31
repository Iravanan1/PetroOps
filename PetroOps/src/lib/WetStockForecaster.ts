export interface StockForecast {
  fuelType: 'HSD' | 'MS';
  currentStockL: number;
  avgDailySalesL: number;
  daysRemaining: number;
  reorderPointL: number;
  recommendedReorderQtyL: number;
  status: 'OPTIMAL' | 'WARN' | 'CRITICAL';
}

export class WetStockForecaster {
  private static REORDER_LEAD_TIME_DAYS = 2;
  private static MIN_SAFE_DAYS = 3;

  /**
   * Generates dynamic inventory forecasting reports for tank stocks
   */
  public static forecastStock(
    fuelType: 'HSD' | 'MS',
    currentStockL: number,
    historicalSalesL: number[], // Array of sales volume of last N shifts/days
    tankCapacityL = 20000
  ): StockForecast {
    
    // Calculate simple moving average of daily sales
    let avgDailySalesL = fuelType === 'HSD' ? 850 : 1100; // Realistic defaults
    if (historicalSalesL.length > 0) {
      const sum = historicalSalesL.reduce((a, b) => a + b, 0);
      avgDailySalesL = Number((sum / historicalSalesL.length).toFixed(2)) || avgDailySalesL;
    }

    const daysRemaining = avgDailySalesL > 0 
      ? Number((currentStockL / avgDailySalesL).toFixed(1)) 
      : 99;

    const reorderPointL = avgDailySalesL * this.REORDER_LEAD_TIME_DAYS + (avgDailySalesL * this.MIN_SAFE_DAYS);
    const recommendedReorderQtyL = Math.max(0, tankCapacityL - currentStockL);

    let status: 'OPTIMAL' | 'WARN' | 'CRITICAL' = 'OPTIMAL';
    if (daysRemaining <= this.MIN_SAFE_DAYS) {
      status = 'CRITICAL';
    } else if (daysRemaining <= this.MIN_SAFE_DAYS + 2) {
      status = 'WARN';
    }

    return {
      fuelType,
      currentStockL,
      avgDailySalesL,
      daysRemaining,
      reorderPointL,
      recommendedReorderQtyL,
      status
    };
  }
}
