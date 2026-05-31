/**
 * OperatorTaskEngine.ts
 * 
 * Analyzes active shift states to construct dynamic, actionable checklists
 * for operators and managers (e.g., missing dips, OCR discrepancies, or outstanding credit dues).
 */

import { NozzleReading, CreditCustomerOcrEntry } from '../ai/validation/AIExtractionSchema';

export interface OperatorTask {
  id: string;
  category: 'OCR_REVIEW' | 'NOZZLE_METER' | 'WETSTOCK_DIP' | 'CREDIT_RECOVERY' | 'UPI_MISMATCH' | 'GENERAL';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completed: boolean;
  actionPath: string;
}

export class OperatorTaskEngine {
  /**
   * Evaluates active operational registers to generate a live checklist
   */
  public static generateChecklist(params: {
    shiftId: string;
    nozzles: NozzleReading[];
    creditEntries: CreditCustomerOcrEntry[];
    upiSales: number;
    actualUpiSales?: number;
    wetstockVarianceRecorded: boolean;
    ocrReviewCompleted: boolean;
  }): OperatorTask[] {
    const tasks: OperatorTask[] = [];

    // 1. OCR Review Validation Check
    if (!params.ocrReviewCompleted) {
      tasks.push({
        id: 'task_ocr_review',
        category: 'OCR_REVIEW',
        title: 'OCR Ingestion Review Pending',
        description: 'Verify scanned register values against consensus matrix before shift seal.',
        priority: 'HIGH',
        completed: false,
        actionPath: `/ai-review/${params.shiftId}`
      });
    }

    // 2. Nozzle Reading Completeness
    params.nozzles.forEach(noz => {
      if (noz.closingMeter <= 0 || noz.openingMeter <= 0) {
        tasks.push({
          id: `task_nozzle_${noz.nozzleId}`,
          category: 'NOZZLE_METER',
          title: `Nozzle ${noz.nozzleId} Readings Incomplete`,
          description: 'Meter opening or closing values must be positive non-zero entries.',
          priority: 'HIGH',
          completed: false,
          actionPath: `/operations/shifts/${params.shiftId}/reconcile`
        });
      }
    });

    // 3. Wetstock Dips Recording Check
    if (!params.wetstockVarianceRecorded) {
      tasks.push({
        id: 'task_wetstock_dip',
        category: 'WETSTOCK_DIP',
        title: 'Daily Tank Dips Log Missing',
        description: 'Record physical fuel stock dips to determine volumetric shrinkage.',
        priority: 'HIGH',
        completed: false,
        actionPath: `/operations/reconciliation`
      });
    }

    // 4. UPI/Digital Discrepancy Warnings
    if (params.actualUpiSales !== undefined) {
      const upiMismatch = Math.abs(params.upiSales - params.actualUpiSales);
      if (upiMismatch > 10) {
        tasks.push({
          id: 'task_upi_mismatch',
          category: 'UPI_MISMATCH',
          title: `UPI Discrepancy Found: ₹${upiMismatch.toFixed(2)}`,
          description: 'UPI merchant total differs from manual Attendant entry.',
          priority: 'MEDIUM',
          completed: false,
          actionPath: `/operations/shifts/${params.shiftId}/reconcile`
        });
      }
    }

    // 5. Credit entries audit check
    const unverifiedCredit = params.creditEntries.filter(c => c.reviewStatus === 'needs_review');
    if (unverifiedCredit.length > 0) {
      tasks.push({
        id: 'task_credit_review',
        category: 'CREDIT_RECOVERY',
        title: `Unresolved Credit Customer Entries (${unverifiedCredit.length})`,
        description: 'Approve or adjust flagged credit customers ledger entries.',
        priority: 'MEDIUM',
        completed: false,
        actionPath: `/credit-ledger`
      });
    }

    return tasks;
  }
}
