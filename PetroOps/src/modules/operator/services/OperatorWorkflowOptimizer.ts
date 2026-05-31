/**
 * OperatorWorkflowOptimizer.ts
 * Automated workflow streamlining and data clone optimizer for retail fuel attendants.
 * Pre-populates carry-forward metrics from daily closing bounds to compress task steps.
 */

import { BranchPilotDeploymentEngine, type BranchProfile } from "../../deployment/services/BranchPilotDeploymentEngine";

export interface SmartAutofillPayload {
  branchId: string;
  shiftCode: string;
  attendantId: string;
  attendantName: string;
  nozzleStartingMeters: Record<string, number>;
  tankStartingDips: Record<string, number>;
  predictedLubricantSalesQty: number;
  expectedUpiSettlements: number;
}

export class OperatorWorkflowOptimizer {
  private static HISTORICAL_LUBRICANT_AVG = 5.4; // Average daily lubricant sale counts
  private static HISTORICAL_UPI_AVG = 14500.00; // Average daily UPI total amount

  /**
   * Generates carry-forward pre-populated inputs cloning from previous shift closing limits
   */
  public static getCarryForwardStartingState(
    branchId: string,
    attendantId = "operator_active_user_1",
    attendantName = "Ramesh Kumar"
  ): SmartAutofillPayload {
    const profile = BranchPilotDeploymentEngine.getBranchProfile(branchId);
    
    // Extrapolate nozzle starting values mapping directly from branch current configuration
    const nozzleStartingMeters: Record<string, number> = {};
    profile.nozzleLayouts.forEach(nozzle => {
      nozzleStartingMeters[nozzle.id] = nozzle.currentMeter;
    });

    // Extrapolate tank dipping levels mapping from active branch profile
    const tankStartingDips: Record<string, number> = {};
    profile.tanks.forEach(tank => {
      tankStartingDips[tank.id] = tank.currentDip;
    });

    // Compute automatic shift codes based on current system time bounds
    const hours = new Date().getHours();
    let shiftCode = "SHIFT_NIGHT";
    if (hours >= 6 && hours < 14) {
      shiftCode = "SHIFT_MORNING";
    } else if (hours >= 14 && hours < 22) {
      shiftCode = "SHIFT_EVENING";
    }

    return {
      branchId,
      shiftCode,
      attendantId,
      attendantName,
      nozzleStartingMeters,
      tankStartingDips,
      predictedLubricantSalesQty: Math.round(this.HISTORICAL_LUBRICANT_AVG * (0.8 + Math.random() * 0.4)),
      expectedUpiSettlements: Math.round(this.HISTORICAL_UPI_AVG * (0.9 + Math.random() * 0.2) * 100) / 100,
    };
  }

  /**
   * Compresses multi-step entry sequences: automatically resolves credit and cash balance sheets
   */
  public static performOneClickReconciliation(
    nozzleOpen: number,
    nozzleClose: number,
    fuelPrice: number,
    reportedCash: number,
    reportedUpi: number
  ): {
    calculatedSalesQty: number;
    calculatedSalesVal: number;
    shortOverVariance: number;
    requiresEscalation: boolean;
  } {
    const calculatedSalesQty = Math.max(0, nozzleClose - nozzleOpen);
    const calculatedSalesVal = calculatedSalesQty * fuelPrice;
    
    // Core accounting balance sheet
    const reportedTotal = reportedCash + reportedUpi;
    const shortOverVariance = reportedTotal - calculatedSalesVal;
    
    // Variance threshold: If shortage exceeds 200 INR, flag a supervisor audit override alert
    const requiresEscalation = shortOverVariance < -200.00;

    return {
      calculatedSalesQty,
      calculatedSalesVal,
      shortOverVariance,
      requiresEscalation,
    };
  }
}
