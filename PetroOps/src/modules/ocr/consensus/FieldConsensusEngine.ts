/**
 * FieldConsensusEngine.ts
 * 
 * Orchestrates multi-model field-level OCR consensus and confidence voting.
 * Aggregates and reconciles extractions from PaddleOCR, EasyOCR, Local Qwen VLM, and Claude.
 * High-fidelity calculations resilient to real-world petrol pump register smudges and ink errors.
 */

import { AIExtraction, NozzleReading, CreditCustomerOcrEntry } from '../../ai/validation/AIExtractionSchema';

export interface ModelOcrOutput {
  modelName: 'PaddleOCR' | 'EasyOCR' | 'QwenVLM' | 'Claude';
  rawOutput: Record<string, any>;
  confidence: number; // 0 to 100
  fieldConfidence: Record<string, number>; // 0.0 to 1.0 per field
}

export interface FieldConsensusReport {
  consensusValue: any;
  confidence: number; // 0 to 100
  agreeingModels: string[];
  disagreementDetected: boolean;
}

export class FieldConsensusEngine {
  // Static weights for each model's historical reliability under Indian station environments
  private static readonly MODEL_WEIGHTS = {
    Claude: 1.0,     // Gold standard VLM for handwritten structure understanding
    QwenVLM: 0.9,    // Excellent local open-weights vision LLM
    PaddleOCR: 0.8,  // Highly robust line-level printed/handwritten detector
    EasyOCR: 0.65    // Fast offline fallback character match
  };

  /**
   * Main entry point: aggregates individual OCR extractions into a single verified consensus state
   */
  public static computeConsensus(outputs: ModelOcrOutput[]): AIExtraction {
    if (outputs.length === 0) {
      throw new Error('Cannot compute consensus with empty model outputs');
    }

    const fieldConsensus: Record<string, FieldConsensusReport> = {};

    // 1. Basic scalar fields
    const scalarFields = [
      'shiftDate',
      'operatorName',
      'openingCash',
      'actualCash',
      'cardSales',
      'upiSales',
      'creditSales',
      'creditRecovery',
      'expenses'
    ];

    scalarFields.forEach(field => {
      fieldConsensus[field] = this.voteOnField(field, outputs);
    });

    // 2. Complex nested structure: Nozzle Readings
    const nozzleReadingsConsensus = this.resolveNozzleReadings(outputs);

    // 3. Complex nested structure: Testing Litres
    const testingLitresConsensus = this.resolveTestingLitres(outputs);

    // 4. Complex nested structure: Fuel Totals
    const fuelTotalsConsensus = this.resolveFuelTotals(outputs);

    // 5. Complex nested structure: Credit Entries
    const creditEntriesConsensus = this.resolveCreditEntries(outputs);

    // Calculate aggregated overall confidence based on consensus agreement
    let confidenceSum = 0;
    let fieldCount = 0;

    Object.keys(fieldConsensus).forEach(key => {
      confidenceSum += fieldConsensus[key].confidence;
      fieldCount++;
    });

    // Add nozzle fields confidence to overall score
    let nozzleScoreSum = 0;
    nozzleReadingsConsensus.forEach(noz => {
      nozzleScoreSum += (noz as any).consensusConfidence ?? 90;
    });
    if (nozzleReadingsConsensus.length > 0) {
      confidenceSum += nozzleScoreSum / nozzleReadingsConsensus.length;
      fieldCount++;
    }

    const overallConfidence = fieldCount > 0 ? Math.round(confidenceSum / fieldCount) : 80;

    // Build standard warning triggers if there's any active model discrepancies
    const warnings: string[] = [];
    Object.keys(fieldConsensus).forEach(field => {
      if (fieldConsensus[field].disagreementDetected) {
        warnings.push(`OCR Discordance flagged on field '${field}': Models split between multiple values.`);
      }
    });

    // Structure model specific field confidence matrix
    const fieldConfidence = {
      actualCash: (fieldConsensus['actualCash']?.confidence ?? 100) / 100,
      cardSales: (fieldConsensus['cardSales']?.confidence ?? 100) / 100,
      upiSales: (fieldConsensus['upiSales']?.confidence ?? 100) / 100,
      nozzleClose: nozzleReadingsConsensus.length > 0 
        ? (nozzleReadingsConsensus[0] as any).consensusConfidence / 100 || 0.9
        : 0.9,
    };

    return {
      shiftDate: String(fieldConsensus['shiftDate']?.consensusValue ?? new Date().toISOString().split('T')[0]),
      operatorName: String(fieldConsensus['operatorName']?.consensusValue ?? 'Unknown Operator'),
      openingCash: Number(fieldConsensus['openingCash']?.consensusValue ?? 0),
      actualCash: Number(fieldConsensus['actualCash']?.consensusValue ?? 0),
      cardSales: Number(fieldConsensus['cardSales']?.consensusValue ?? 0),
      upiSales: Number(fieldConsensus['upiSales']?.consensusValue ?? 0),
      creditSales: Number(fieldConsensus['creditSales']?.consensusValue ?? 0),
      creditRecovery: Number(fieldConsensus['creditRecovery']?.consensusValue ?? 0),
      expenses: Number(fieldConsensus['expenses']?.consensusValue ?? 0),
      fuelTotals: fuelTotalsConsensus,
      nozzleReadings: nozzleReadingsConsensus.map(noz => {
        const { consensusConfidence, ...rest } = noz as any;
        return rest as NozzleReading;
      }),
      testingLitres: testingLitresConsensus,
      creditEntries: creditEntriesConsensus,
      confidence: overallConfidence,
      fieldConfidence,
      warnings
    };
  }

  /**
   * Voting algorithm using reliability weight groups.
   */
  private static voteOnField(fieldName: string, outputs: ModelOcrOutput[]): FieldConsensusReport {
    const candidates: Array<{ value: any; weight: number; model: string }> = [];

    outputs.forEach(out => {
      const val = out.rawOutput[fieldName];
      if (val !== undefined && val !== null) {
        const modelWeight = this.MODEL_WEIGHTS[out.modelName] ?? 0.5;
        // In-model confidence score adjustment (e.g. if Paddle OCR was 95% confident, scale the vote weight)
        const specificFieldConf = out.fieldConfidence[fieldName] ?? 1.0;
        const totalWeight = modelWeight * specificFieldConf;
        
        candidates.push({
          value: val,
          weight: totalWeight,
          model: out.modelName
        });
      }
    });

    if (candidates.length === 0) {
      return { consensusValue: 0, confidence: 0, agreeingModels: [], disagreementDetected: true };
    }

    // Cluster matching candidates
    const clusters: Array<{ value: any; totalWeight: number; models: string[] }> = [];

    candidates.forEach(cand => {
      // Find matching cluster
      let matchedCluster = clusters.find(cluster => this.areValuesFuzzyEqual(cluster.value, cand.value));

      if (matchedCluster) {
        matchedCluster.totalWeight += cand.weight;
        matchedCluster.models.push(cand.model);
      } else {
        clusters.push({
          value: cand.value,
          totalWeight: cand.weight,
          models: [cand.model]
        });
      }
    });

    // Sort clusters by weight descending
    clusters.sort((a, b) => b.totalWeight - a.totalWeight);
    const winner = clusters[0];

    // Compute relative consensus agreement confidence
    const totalWeightsPossible = Object.values(this.MODEL_WEIGHTS).reduce((sum, w) => sum + w, 0);
    const consensusRatio = winner.totalWeight / totalWeightsPossible;
    const finalConfidence = Math.min(100, Math.max(10, Math.round(consensusRatio * 100)));

    return {
      consensusValue: winner.value,
      confidence: finalConfidence,
      agreeingModels: winner.models,
      disagreementDetected: clusters.length > 1
    };
  }

  /**
   * Resolves nozzle readings per nozzle ID using field voting logic
   */
  private static resolveNozzleReadings(outputs: ModelOcrOutput[]): NozzleReading[] {
    const nozzleMap: Record<string, Array<{ reading: NozzleReading; weight: number; model: string }>> = {};

    outputs.forEach(out => {
      const readings = out.rawOutput['nozzleReadings'] as NozzleReading[] | undefined;
      if (readings && Array.isArray(readings)) {
        const modelWeight = this.MODEL_WEIGHTS[out.modelName] ?? 0.5;
        readings.forEach(noz => {
          if (!noz.nozzleId) return;
          if (!nozzleMap[noz.nozzleId]) {
            nozzleMap[noz.nozzleId] = [];
          }
          nozzleMap[noz.nozzleId].push({
            reading: noz,
            weight: modelWeight * (out.fieldConfidence['nozzleClose'] ?? 1.0),
            model: out.modelName
          });
        });
      }
    });

    const finalizedNozzles: NozzleReading[] = [];

    Object.keys(nozzleMap).forEach(nozzleId => {
      const candidates = nozzleMap[nozzleId];
      // We vote on each meter / numeric property of the nozzle reading separately
      const openingClusters: any[] = [];
      const closingClusters: any[] = [];
      const rateClusters: any[] = [];
      const testingClusters: any[] = [];
      const fuelTypes: string[] = [];

      candidates.forEach(cand => {
        fuelTypes.push(cand.reading.fuelType);
        this.addToCluster(openingClusters, cand.reading.openingMeter, cand.weight, cand.model);
        this.addToCluster(closingClusters, cand.reading.closingMeter, cand.weight, cand.model);
        this.addToCluster(rateClusters, cand.reading.fuelRate, cand.weight, cand.model);
        this.addToCluster(testingClusters, cand.reading.testingQty ?? 0, cand.weight, cand.model);
      });

      openingClusters.sort((a, b) => b.totalWeight - a.totalWeight);
      closingClusters.sort((a, b) => b.totalWeight - a.totalWeight);
      rateClusters.sort((a, b) => b.totalWeight - a.totalWeight);
      testingClusters.sort((a, b) => b.totalWeight - a.totalWeight);

      const winningOpening = openingClusters[0]?.value ?? 0;
      const winningClosing = closingClusters[0]?.value ?? 0;
      const winningRate = rateClusters[0]?.value ?? 100;
      const winningTesting = testingClusters[0]?.value ?? 0;
      const fuelType = this.getMostFrequentString(fuelTypes) || 'MS';

      const calculatedNet = Math.max(0, winningClosing - winningOpening - winningTesting);

      // Track relative agreement confidence for this nozzle reading
      const totalPossibleWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      const matchedWeight = (openingClusters[0]?.totalWeight ?? 0) + (closingClusters[0]?.totalWeight ?? 0);
      const nozzleConfidence = Math.min(100, Math.round(((matchedWeight) / (totalPossibleWeight * 2)) * 100));

      finalizedNozzles.push({
        nozzleId,
        fuelType: fuelType as any,
        openingMeter: Number(winningOpening),
        closingMeter: Number(winningClosing),
        testingQty: Number(winningTesting),
        netSales: Number(calculatedNet.toFixed(2)),
        fuelRate: Number(winningRate),
        // Custom attribute for tracking consensus inside pipeline
        ...({ consensusConfidence: nozzleConfidence } as any)
      });
    });

    return finalizedNozzles;
  }

  private static addToCluster(clusters: any[], value: any, weight: number, model: string) {
    let matched = clusters.find(c => this.areValuesFuzzyEqual(c.value, value));
    if (matched) {
      matched.totalWeight += weight;
      matched.models.push(model);
    } else {
      clusters.push({ value, totalWeight: weight, models: [model] });
    }
  }

  private static getMostFrequentString(arr: string[]): string {
    const counts: Record<string, number> = {};
    arr.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }

  /**
   * Resolves Testing Litres structures across models
   */
  private static resolveTestingLitres(outputs: ModelOcrOutput[]): Array<{ fuelType: string; litres: number }> {
    const list: Array<{ fuelType: string; litres: number }> = [];
    // Combine arrays and group by fuel type
    const grouped: Record<string, Array<{ litres: number; weight: number }>> = {};

    outputs.forEach(out => {
      const items = out.rawOutput['testingLitres'] as Array<{ fuelType: string; litres: number }> | undefined;
      if (items && Array.isArray(items)) {
        const modelWeight = this.MODEL_WEIGHTS[out.modelName] ?? 0.5;
        items.forEach(item => {
          const type = item.fuelType.toUpperCase();
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({ litres: item.litres, weight: modelWeight });
        });
      }
    });

    Object.keys(grouped).forEach(fuelType => {
      const candidates = grouped[fuelType];
      const clusters: any[] = [];
      candidates.forEach(cand => {
        this.addToCluster(clusters, cand.litres, cand.weight, 'model');
      });
      clusters.sort((a, b) => b.totalWeight - a.totalWeight);
      const winner = clusters[0]?.value ?? 0;
      list.push({ fuelType, litres: Number(winner) });
    });

    return list;
  }

  /**
   * Resolves Fuel Totals structures across models
   */
  private static resolveFuelTotals(outputs: ModelOcrOutput[]): Array<{ fuelType: string; totalLitres: number }> {
    const list: Array<{ fuelType: string; totalLitres: number }> = [];
    const grouped: Record<string, Array<{ totalLitres: number; weight: number }>> = {};

    outputs.forEach(out => {
      const items = out.rawOutput['fuelTotals'] as Array<{ fuelType: string; totalLitres: number }> | undefined;
      if (items && Array.isArray(items)) {
        const modelWeight = this.MODEL_WEIGHTS[out.modelName] ?? 0.5;
        items.forEach(item => {
          const type = item.fuelType.toUpperCase();
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({ totalLitres: item.totalLitres, weight: modelWeight });
        });
      }
    });

    Object.keys(grouped).forEach(fuelType => {
      const candidates = grouped[fuelType];
      const clusters: any[] = [];
      candidates.forEach(cand => {
        this.addToCluster(clusters, cand.totalLitres, cand.weight, 'model');
      });
      clusters.sort((a, b) => b.totalWeight - a.totalWeight);
      const winner = clusters[0]?.value ?? 0;
      list.push({ fuelType, totalLitres: Number(winner) });
    });

    return list;
  }

  /**
   * Resolves Credit customer entries across models using consensus voting
   */
  private static resolveCreditEntries(outputs: ModelOcrOutput[]): CreditCustomerOcrEntry[] {
    const list: CreditCustomerOcrEntry[] = [];
    const grouped: Record<string, Array<{ entry: any; weight: number; model: string }>> = {};

    outputs.forEach(out => {
      const items = out.rawOutput['creditEntries'] as any[] | undefined;
      if (items && Array.isArray(items)) {
        const modelWeight = this.MODEL_WEIGHTS[out.modelName] ?? 0.5;
        items.forEach(item => {
          if (!item.customerName) return;
          const cleanName = item.customerName.trim().toLowerCase();
          
          let matchedKey = Object.keys(grouped).find(k => this.areValuesFuzzyEqual(k, cleanName));
          if (!matchedKey) {
            matchedKey = cleanName;
            grouped[matchedKey] = [];
          }
          
          grouped[matchedKey].push({
            entry: item,
            weight: modelWeight,
            model: out.modelName
          });
        });
      }
    });

    Object.keys(grouped).forEach(key => {
      const candidates = grouped[key];
      const amountClusters: any[] = [];
      const paymentStatuses: string[] = [];
      const reviewStatuses: string[] = [];
      const notesList: string[] = [];
      const dates: string[] = [];
      
      let maxConfidence = 0;

      candidates.forEach(cand => {
        this.addToCluster(amountClusters, cand.entry.amount ?? 0, cand.weight, cand.model);
        paymentStatuses.push(cand.entry.paymentStatus || 'pending');
        reviewStatuses.push(cand.entry.reviewStatus || 'clean');
        if (cand.entry.notes) notesList.push(cand.entry.notes);
        if (cand.entry.date) dates.push(cand.entry.date);
        maxConfidence = Math.max(maxConfidence, cand.entry.confidence ?? 50);
      });

      amountClusters.sort((a, b) => b.totalWeight - a.totalWeight);
      const winningAmount = amountClusters[0]?.value ?? 0;
      const paymentStatus = this.getMostFrequentString(paymentStatuses) || 'pending';
      const reviewStatus = this.getMostFrequentString(reviewStatuses) || 'clean';
      const notes = notesList.length > 0 ? this.getMostFrequentString(notesList) : '';
      const date = dates.length > 0 ? this.getMostFrequentString(dates) : new Date().toISOString().split('T')[0];
      const customerName = candidates[0]?.entry.customerName || key;

      list.push({
        customerName,
        amount: Number(winningAmount),
        date,
        shiftId: candidates[0]?.entry.shiftId || null,
        paymentStatus: paymentStatus as any,
        notes,
        confidence: maxConfidence,
        reviewStatus: reviewStatus as any
      });
    });

    return list;
  }

  /**
   * Core fuzzy compare utility. Groups numbers within a small margin or handles dates and names.
   */
  private static areValuesFuzzyEqual(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return false;

    const num1 = parseFloat(String(val1).replace(/[^\d.-]/g, ''));
    const num2 = parseFloat(String(val2).replace(/[^\d.-]/g, ''));

    if (!isNaN(num1) && !isNaN(num2)) {
      return Math.abs(num1 - num2) <= 0.5;
    }

    const s1 = String(val1).trim().toLowerCase();
    const s2 = String(val2).trim().toLowerCase();

    return s1 === s2;
  }
}
