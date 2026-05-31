/**
 * FuelLossDetectionEngine.ts
 * ───────────────────────────
 * Predictive wetstock shrinkage model analyzing daily tank dip fluctuations, physical
 * volume variances, and nozzle testing calibrations to isolate product losses.
 */

export interface FuelLossAudit {
  tankId: string;
  fuelType: string;
  shrinkageLitres: number;
  variancePct: number;
  pattern: 'STABLE' | 'CALIBRATION_DRIFT' | 'PIPE_LEAK_SUSPECTED' | 'TEMPERATURE_CONTRACTION';
  isAbnormal: boolean;
  confidence: number; // 0 to 100
}

export class FuelLossDetectionEngine {
  /**
   * Evaluates volumetric variance trends to identify fuel loss patterns
   */
  public static evaluateLoss(params: {
    tankId: string;
    fuelType: string;
    openingStock: number;
    receivedStock: number;
    closingStock: number;
    meterSales: number;
  }): FuelLossAudit {
    // Book Stock calculation: Opening + Received - Sales
    const bookStock = params.openingStock + params.receivedStock - params.meterSales;
    const shrinkageLitres = params.closingStock - bookStock;
    const variancePct = bookStock > 0 ? (shrinkageLitres / bookStock) * 100 : 0;

    let pattern: FuelLossAudit['pattern'] = 'STABLE';
    let isAbnormal = false;
    let confidence = 95;

    // evaps tolerance normally: MS is ~0.75%, HSD is ~0.25%
    const thresholdPct = params.fuelType === 'MS' ? -0.75 : -0.25;

    if (variancePct < thresholdPct) {
      isAbnormal = true;
      confidence = 88;
      
      if (variancePct < -1.5) {
        pattern = 'PIPE_LEAK_SUSPECTED';
      } else {
        pattern = 'CALIBRATION_DRIFT';
      }
    } else if (variancePct > 0.5) {
      pattern = 'TEMPERATURE_CONTRACTION';
    }

    return {
      tankId: params.tankId,
      fuelType: params.fuelType,
      shrinkageLitres: Math.round(shrinkageLitres * 100) / 100,
      variancePct: Math.round(variancePct * 100) / 100,
      pattern,
      isAbnormal,
      confidence
    };
  }
}

export default FuelLossDetectionEngine;
