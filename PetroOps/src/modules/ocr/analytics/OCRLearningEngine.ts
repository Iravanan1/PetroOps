export interface CorrectionEvent {
  jobId: string;
  field: string;
  originalValue: string | number;
  correctedValue: string | number;
  correctedBy: string; // 'manager' | 'operator'
  timestamp: string;
}

export class OCRLearningEngine {
  private static correctionHistory: CorrectionEvent[] = [];

  public static recordCorrection(event: CorrectionEvent): void {
    this.correctionHistory.push(event);
  }

  public static getCorrectionHistory(filters?: { field?: string; operatorId?: string }): CorrectionEvent[] {
    let history = this.correctionHistory;
    
    if (filters?.field) {
      history = history.filter(h => h.field === filters.field);
    }
    
    return history;
  }

  public static getCorrectionFrequency(field: string): number {
    const total = this.correctionHistory.length;
    if (total === 0) return 0;
    
    const fieldCorrections = this.correctionHistory.filter(h => h.field === field).length;
    return (fieldCorrections / total) * 100;
  }
}
