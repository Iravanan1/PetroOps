import { db } from '../../../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AuditReport } from '../../accounting/MathematicalAuditEngine';

export type AnomalyCategory =
  | 'OCR_LOW_CONFIDENCE'
  | 'SETTLEMENT_MISMATCH'
  | 'DUPLICATE_ENTRY'
  | 'CASH_VARIANCE'
  | 'WETSTOCK_VARIANCE'
  | 'NOZZLE_ROLLBACK'
  | 'SHIFT_GAP'
  | 'CARRY_FORWARD_MISMATCH';

export interface ClassificationRecord {
  shiftId: string;
  categories: AnomalyCategory[];
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
}

export class AIClassificationEngine {
  /**
   * AI classification pipeline mapping discrepancy reports and mathematical
   * inconsistencies into standard auditing alarm states.
   */
  public static async classifyShiftAnomalies(
    shiftId: string,
    auditReport: AuditReport,
    ocrConfidence: number,
    duplicateFound: boolean
  ): Promise<ClassificationRecord> {
    const categories: AnomalyCategory[] = [];

    // 1. OCR Confidence check
    if (ocrConfidence < 85) {
      categories.push('OCR_LOW_CONFIDENCE');
    }

    // 2. Duplicate Checks
    if (duplicateFound) {
      categories.push('DUPLICATE_ENTRY');
    }

    // 3. Cash Variance Check
    if (Math.abs(auditReport.metrics.cashMismatch) > 100) {
      categories.push('CASH_VARIANCE');
    }

    // 4. Wetstock leak checks
    if (Math.abs(auditReport.metrics.wetstockVariance) > 50) {
      categories.push('WETSTOCK_VARIANCE');
    }

    // 5. Audit discrepancies parsing
    auditReport.discrepancies.forEach(err => {
      if (err.includes("rollback") || err.includes("Closing meter")) {
        if (!categories.includes('NOZZLE_ROLLBACK')) {
          categories.push('NOZZLE_ROLLBACK');
        }
      }
      if (err.includes("Continuity") || err.includes("previous")) {
        if (!categories.includes('CARRY_FORWARD_MISMATCH')) {
          categories.push('CARRY_FORWARD_MISMATCH');
        }
      }
      if (err.includes("UPI") || err.includes("Card") || err.includes("Variance")) {
        if (!categories.includes('SETTLEMENT_MISMATCH')) {
          categories.push('SETTLEMENT_MISMATCH');
        }
      }
    });

    let severity: ClassificationRecord['severity'] = 'INFO';
    if (categories.includes('NOZZLE_ROLLBACK') || categories.includes('CARRY_FORWARD_MISMATCH')) {
      severity = 'CRITICAL';
    } else if (categories.length > 0) {
      severity = 'WARNING';
    }

    const record: ClassificationRecord = {
      shiftId,
      categories,
      severity,
      timestamp: new Date().toISOString()
    };

    // Log the anomaly classification in Firestore
    try {
      await addDoc(collection(db, "aiClassificationLogs"), record);
    } catch (e) {
      console.warn("[AIClassificationEngine] Offline bypass - logged anomalies locally.");
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`anomaly_class_${shiftId}`, JSON.stringify(record));
      } catch (err) {}
    }
    return record;
  }
}
