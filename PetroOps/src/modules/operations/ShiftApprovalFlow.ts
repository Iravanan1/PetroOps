/**
 * ShiftApprovalFlow.ts
 * 
 * Orchestrates supervisor validation checkpoints, manages override audit trails,
 * and seals ledger shifts securely once double-entry balances are verified.
 */

import { LockValidationService, ValidationCheckpoint } from './LockValidationService';
import { NozzleReading, CreditCustomerOcrEntry } from '../ai/validation/AIExtractionSchema';

export interface ShiftApprovalStatus {
  shiftId: string;
  isLocked: boolean;
  status: 'OPEN' | 'RECONCILED' | 'PENDING_APPROVAL' | 'LOCKED';
  checkpoints: ValidationCheckpoint[];
  lastModified: string;
  lockedBy?: string;
  overrideJustification?: string;
}

export class ShiftApprovalFlow {
  private static readonly STORAGE_KEY = 'pumpai_shift_approval_flows';

  /**
   * Evaluates if a shift is prepared for sealing by running complete ledger validation gates
   */
  public static runLockVerification(params: {
    shiftId: string;
    nozzles: NozzleReading[];
    previousNozzles?: NozzleReading[];
    creditEntries: CreditCustomerOcrEntry[];
    openingCash: number;
    actualCash: number;
    upiSales: number;
    cardSales: number;
    creditSales: number;
    creditRecovery: number;
    expenses: number;
    ocrReviewCompleted: boolean;
    wetstockVarianceRecorded: boolean;
  }): ShiftApprovalStatus {
    const checkpoints = LockValidationService.runFullAudit({
      nozzles: params.nozzles,
      previousNozzles: params.previousNozzles,
      openingCash: params.openingCash,
      actualCash: params.actualCash,
      upiSales: params.upiSales,
      cardSales: params.cardSales,
      creditSales: params.creditSales,
      creditRecovery: params.creditRecovery,
      expenses: params.expenses,
      ocrReviewCompleted: params.ocrReviewCompleted,
      wetstockVarianceRecorded: params.wetstockVarianceRecorded
    });

    const hasFatalBlocks = checkpoints.some(c => c.severity === 'FATAL' && !c.passed);
    const hasWarnings = checkpoints.some(c => c.severity === 'WARNING' && !c.passed);

    let status: ShiftApprovalStatus['status'] = 'OPEN';
    if (!hasFatalBlocks && !hasWarnings) {
      status = 'RECONCILED';
    } else if (hasWarnings && !hasFatalBlocks) {
      status = 'PENDING_APPROVAL';
    }

    const approvalStatus: ShiftApprovalStatus = {
      shiftId: params.shiftId,
      isLocked: false,
      status,
      checkpoints,
      lastModified: new Date().toISOString()
    };

    this.saveApprovalStatus(approvalStatus);
    return approvalStatus;
  }

  /**
   * Seals and locks a shift, permanently securing its double-entry ledger state
   */
  public static sealAndLockShift(
    shiftId: string,
    managerId: string,
    overrideJustification?: string
  ): { success: boolean; error?: string } {
    const activeFlows = this.getAllFlows();
    const flowIndex = activeFlows.findIndex(f => f.shiftId === shiftId);

    if (flowIndex === -1) {
      return { success: false, error: 'Shift approval flow not initialized.' };
    }

    const flow = activeFlows[flowIndex];
    
    // Safety check: prohibit locking if there are active fatal blocks
    const hasUnresolvedFatal = flow.checkpoints.some(c => c.severity === 'FATAL' && !c.passed);
    if (hasUnresolvedFatal && !overrideJustification) {
      return { 
        success: false, 
        error: 'Cannot seal shift: Fatal accounting variance or meter continuity break detected. Supervisor override justification required.' 
      };
    }

    flow.isLocked = true;
    flow.status = 'LOCKED';
    flow.lockedBy = managerId;
    flow.overrideJustification = overrideJustification;
    flow.lastModified = new Date().toISOString();

    activeFlows[flowIndex] = flow;
    this.saveAllFlows(activeFlows);

    console.log(`[ShiftApprovalFlow] Locked shift "${shiftId}" securely by "${managerId}".`);
    return { success: true };
  }

  /**
   * Retrieves flow records
   */
  public static getFlowForShift(shiftId: string): ShiftApprovalStatus | null {
    return this.getAllFlows().find(f => f.shiftId === shiftId) || null;
  }

  private static getAllFlows(): ShiftApprovalStatus[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveApprovalStatus(status: ShiftApprovalStatus): void {
    const flows = this.getAllFlows();
    const idx = flows.findIndex(f => f.shiftId === status.shiftId);
    if (idx > -1) {
      flows[idx] = status;
    } else {
      flows.push(status);
    }
    this.saveAllFlows(flows);
  }

  private static saveAllFlows(flows: ShiftApprovalStatus[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flows));
    } catch (e) {
      console.warn('[ShiftApprovalFlow] LocalStorage sync failed:', e);
    }
  }
}
