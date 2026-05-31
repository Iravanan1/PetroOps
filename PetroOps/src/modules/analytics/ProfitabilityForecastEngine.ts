/**
 * ProfitabilityForecastEngine.ts
 * Profit margin simulator for retail gas stations.
 * Computes margins, card processor fees (MDR), and predicts rolling cash flow.
 */

export interface ProfitMarginInputs {
  retailPricePerLiter: number;
  wholesaleProcurementPricePerLiter: number;
  dailyVolumeSoldLiters: number;
  operationalOverheadCostDaily: number;
  paymentMethodsSplit: {
    cashPercent: number;     // e.g. 20
    upiPercent: number;      // e.g. 50
    cardPercent: number;     // e.g. 30
  };
}

export interface ProfitabilityMetrics {
  grossRevenueDaily: number;
  wholesaleProcurementCost: number;
  cardProcessingFeesDaily: number; // MDR charges
  netProfitDaily: number;
  marginPercentage: number;
  breakevenLitersRequired: number;
}

export class ProfitabilityForecastEngine {
  // Merchant Discount Rates (MDR) constants
  private static readonly CARD_MDR_RATE = 0.012; // 1.2% credit/debit charges
  private static readonly UPI_MDR_RATE = 0.0;     // 0% UPI clearing charges in standard regions

  /**
   * Evaluates profit profiles and margins based on volume splits and procurement rates
   */
  public static calculateProfitability(
    inputs: ProfitMarginInputs
  ): ProfitabilityMetrics {
    const grossRevenueDaily = inputs.retailPricePerLiter * inputs.dailyVolumeSoldLiters;
    const wholesaleProcurementCost = inputs.wholesaleProcurementPricePerLiter * inputs.dailyVolumeSoldLiters;
    
    // Card processor MDR calculation
    const cardRevenue = grossRevenueDaily * (inputs.paymentMethodsSplit.cardPercent / 100);
    const cardProcessingFeesDaily = cardRevenue * this.CARD_MDR_RATE;

    const upiRevenue = grossRevenueDaily * (inputs.paymentMethodsSplit.upiPercent / 100);
    const upiProcessingFees = upiRevenue * this.UPI_MDR_RATE;

    const totalTransactionFees = cardProcessingFeesDaily + upiProcessingFees;

    // Net profit daily deductions
    const netProfitDaily = grossRevenueDaily - wholesaleProcurementCost - totalTransactionFees - inputs.operationalOverheadCostDaily;
    
    // Calculate margin percentage relative to wholesale and operational inputs
    const marginPercentage = grossRevenueDaily !== 0 
      ? (netProfitDaily / grossRevenueDaily) * 100 
      : 0;

    // Breakeven analysis (Liters required to balance operational overhead and payment fees)
    // marginContribution per liter = retailPrice - wholesalePrice - average card fee per liter
    const averageCardFeePerLiter = (inputs.retailPricePerLiter * (inputs.paymentMethodsSplit.cardPercent / 100)) * this.CARD_MDR_RATE;
    const netMarginContributionPerLiter = inputs.retailPricePerLiter - inputs.wholesaleProcurementPricePerLiter - averageCardFeePerLiter;

    const breakevenLitersRequired = netMarginContributionPerLiter > 0 
      ? inputs.operationalOverheadCostDaily / netMarginContributionPerLiter 
      : 999999; // unattainable breakeven if procurement exceeds retail

    return {
      grossRevenueDaily: parseFloat(grossRevenueDaily.toFixed(2)),
      wholesaleProcurementCost: parseFloat(wholesaleProcurementCost.toFixed(2)),
      cardProcessingFeesDaily: parseFloat(totalTransactionFees.toFixed(2)),
      netProfitDaily: parseFloat(netProfitDaily.toFixed(2)),
      marginPercentage: parseFloat(marginPercentage.toFixed(2)),
      breakevenLitersRequired: Math.ceil(breakevenLitersRequired)
    };
  }
}
