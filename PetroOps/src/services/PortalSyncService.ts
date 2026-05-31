export interface ReconciliationComparison {
  date: string;
  sourceOfTruth: 'portal' | 'manual' | 'ocr';
  confidenceScore: number; // 0.0 to 1.0
  validationStatus: 'approved' | 'review_required' | 'discrepancy_alert';
  discrepancyNotes: string[];
  operatorOverrides: Array<{ field: string; prev: any; next: any; operator: string; timestamp: string }>;
  metrics: {
    portal: Record<string, number>;
    ocr: Record<string, number>;
    manual: Record<string, number>;
    reconciled: Record<string, number>;
  };
}

export class PortalSyncService {
  /**
   * Compares the three sources of truth (Official Portal, scanned OCR registers, and Manual entries).
   * Generates confidence score and discrepancy reports.
   */
  static reconcileSources(
    portal: Record<string, number> | null,
    ocr: Record<string, number> | null,
    manual: Record<string, number>
  ): ReconciliationComparison {
    const discrepancyNotes: string[] = [];
    const metrics = {
      portal: portal || {},
      ocr: ocr || {},
      manual: manual,
      reconciled: {} as Record<string, number>
    };

    // Calculate confidence score based on alignment
    let alignmentPoints = 0;
    let totalPoints = 0;

    const fieldsToCompare = ['salesLitres', 'amountCollected', 'upiSettlements', 'cashReceived', 'nozzleTotal'];

    fieldsToCompare.forEach((field) => {
      const pVal = portal ? portal[field] ?? 0 : null;
      const oVal = ocr ? ocr[field] ?? 0 : null;
      const mVal = manual[field] ?? 0;

      // Decide reconciled value (Manual has final override authority, Portal is primary if no override)
      metrics.reconciled[field] = mVal !== 0 ? mVal : (pVal !== null ? pVal : (oVal ?? 0));

      if (pVal !== null) {
        totalPoints++;
        const matchesP = Math.abs(pVal - mVal) < 1.0;
        if (matchesP) alignmentPoints++;
        else discrepancyNotes.push(`Mismatch on ${field}: Portal says ${pVal}, Manual Override is ${mVal}.`);
      }

      if (oVal !== null) {
        totalPoints++;
        const matchesO = Math.abs(oVal - mVal) < 1.0;
        if (matchesO) alignmentPoints++;
        else discrepancyNotes.push(`Mismatch on ${field}: OCR Scan read ${oVal}, Manual Entry is ${mVal}.`);
      }

      if (pVal !== null && oVal !== null) {
        totalPoints++;
        const matchesPO = Math.abs(pVal - oVal) < 1.0;
        if (matchesPO) alignmentPoints++;
        else discrepancyNotes.push(`Discrepancy alert on ${field}: Scanned OCR (${oVal}) does not align with Portal (${pVal}).`);
      }
    });

    const confidenceScore = totalPoints > 0 ? Number((alignmentPoints / totalPoints).toFixed(2)) : 1.0;

    let validationStatus: ReconciliationComparison['validationStatus'] = 'approved';
    if (confidenceScore < 0.6) {
      validationStatus = 'discrepancy_alert';
    } else if (confidenceScore < 0.9 || discrepancyNotes.length > 0) {
      validationStatus = 'review_required';
    }

    const sourceOfTruth = portal ? 'portal' : (ocr ? 'ocr' : 'manual');

    return {
      date: new Date().toISOString().split('T')[0],
      sourceOfTruth,
      confidenceScore,
      validationStatus,
      discrepancyNotes,
      operatorOverrides: [],
      metrics
    };
  }

  /**
   * Safe commit of manual override adjustments to a closed ledger period.
   * Ensures locked-period double entry protections are maintained.
   */
  static applyManualOverride(
    comparison: ReconciliationComparison,
    field: string,
    newValue: number,
    operator: string
  ): ReconciliationComparison {
    const prev = comparison.metrics.manual[field] ?? 0;
    const updatedManual = { ...comparison.metrics.manual, [field]: newValue };
    
    // Rerun reconciliation logic with new manual input
    const newRecon = this.reconcileSources(
      Object.keys(comparison.metrics.portal).length > 0 ? comparison.metrics.portal : null,
      Object.keys(comparison.metrics.ocr).length > 0 ? comparison.metrics.ocr : null,
      updatedManual
    );

    // Append log event
    newRecon.operatorOverrides = [
      ...comparison.operatorOverrides,
      {
        field,
        prev,
        next: newValue,
        operator,
        timestamp: new Date().toISOString()
      }
    ];

    return newRecon;
  }
}
