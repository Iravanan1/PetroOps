/**
 * BranchProfitabilityEngine.ts
 * Revenue compiler and petroleum margins metrics calculator.
 * Factoring in product type costs, wetstock handling losses, payment fees, and cash variances.
 */

export interface ProfitabilityRecord {
  branchId: string;
  timestamp: number;
  salesVolumeMS: number;
  salesVolumeHSD: number;
  revenueMS: number;
  revenueHSD: number;
  revenueLubricants: number;
  totalRevenue: number;
  cogsMS: number;
  cogsHSD: number;
  cogsLubricants: number;
  totalCogs: number;
  handlingLossCosts: number; // costs from evaporation/shrinkage limits
  cardProcessingFees: number; // bank gateway deduction charges
  cashVarianceImpact: number; // operator short/over deductions
  grossProfit: number;
  netMarginPercentage: number;
}

export class BranchProfitabilityEngine {
  // Profit margins configured for Indian Retail Fuel sectors
  private static MS_MARGIN_PER_LITER = 3.50; // standard margin in INR
  private static HSD_MARGIN_PER_LITER = 2.45; // standard margin in INR
  private static LUBRICANT_MARGIN_PCT = 0.28; // 28% standard lubricant margin
  private static EVAPORATION_LOSS_PCT_MS = 0.006; // 0.6% normal petrol handling shrinkage
  private static EVAPORATION_LOSS_PCT_HSD = 0.001; // 0.1% normal diesel handling shrinkage
  private static CREDIT_CARD_FEE_PCT = 0.009; // 0.9% standard credit card collection gateway fees

  /**
   * Compiles daily transaction totals into a granular profit and loss metrics card
   */
  public static calculateDailyBranchProfit(
    branchId: string,
    salesVolumeMS: number,
    salesVolumeHSD: number,
    lubricantsSalesQty: number,
    priceMS: number,
    priceHSD: number,
    cashVarianceImpact: number, // reported cashier short/over variance (negative = shortage)
    cardSalesAmount: number // total sales settled via credit/debit card swipe channels
  ): ProfitabilityRecord {
    // 1. Revenue calculations
    const revenueMS = salesVolumeMS * priceMS;
    const revenueHSD = salesVolumeHSD * priceHSD;
    const lubricantPriceAvg = 450.00; // Average lubricant pack price in INR
    const revenueLubricants = lubricantsSalesQty * lubricantPriceAvg;
    const totalRevenue = revenueMS + revenueHSD + revenueLubricants;

    // 2. Cost of Goods Sold calculations using standard margins
    const cogsMS = salesVolumeMS * (priceMS - this.MS_MARGIN_PER_LITER);
    const cogsHSD = salesVolumeHSD * (priceHSD - this.HSD_MARGIN_PER_LITER);
    const cogsLubricants = revenueLubricants * (1 - this.LUBRICANT_MARGIN_PCT);
    const totalCogs = cogsMS + cogsHSD + cogsLubricants;

    // 3. Petroleum handling shrinkage and evaporation costs
    const MS_EVAPORATION_LITERS = salesVolumeMS * this.EVAPORATION_LOSS_PCT_MS;
    const HSD_EVAPORATION_LITERS = salesVolumeHSD * this.EVAPORATION_LOSS_PCT_HSD;
    const handlingLossCosts = 
      (MS_EVAPORATION_LITERS * (priceMS - this.MS_MARGIN_PER_LITER)) + 
      (HSD_EVAPORATION_LITERS * (priceHSD - this.HSD_MARGIN_PER_LITER));

    // 4. payment collection gateway processing fees (e.g. MDR charges)
    const cardProcessingFees = cardSalesAmount * this.CREDIT_CARD_FEE_PCT;

    // 5. Net profit balancing: Revenue minus COGS minus handling loss minus fees plus operator cash variances
    const rawProfit = (totalRevenue - totalCogs) - handlingLossCosts - cardProcessingFees + cashVarianceImpact;
    const grossProfit = Math.round(rawProfit * 100) / 100;
    
    const netMarginPercentage = totalRevenue > 0 
      ? Math.round((grossProfit / totalRevenue) * 10000) / 100 
      : 0;

    return {
      branchId,
      timestamp: Date.now(),
      salesVolumeMS,
      salesVolumeHSD,
      revenueMS,
      revenueHSD,
      revenueLubricants,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      cogsMS: Math.round(cogsMS * 100) / 100,
      cogsHSD: Math.round(cogsHSD * 100) / 100,
      cogsLubricants: Math.round(cogsLubricants * 100) / 100,
      totalCogs: Math.round(totalCogs * 100) / 100,
      handlingLossCosts: Math.round(handlingLossCosts * 100) / 100,
      cardProcessingFees: Math.round(cardProcessingFees * 100) / 100,
      cashVarianceImpact: Math.round(cashVarianceImpact * 100) / 100,
      grossProfit,
      netMarginPercentage,
    };
  }
}
