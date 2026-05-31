import { OCRLearningEngine, CorrectionEvent } from './OCRLearningEngine';

export interface HeatmapData {
  field: string;
  errorCount: number;
  commonMisreads: Record<string, number>;
}

export class OCRCorrectionAnalytics {
  
  public static generateHeatmap(): HeatmapData[] {
    const history = OCRLearningEngine.getCorrectionHistory();
    const map: Record<string, HeatmapData> = {};

    history.forEach(event => {
      if (!map[event.field]) {
        map[event.field] = {
          field: event.field,
          errorCount: 0,
          commonMisreads: {}
        };
      }
      
      map[event.field].errorCount++;
      const originalStr = String(event.originalValue);
      
      if (!map[event.field].commonMisreads[originalStr]) {
        map[event.field].commonMisreads[originalStr] = 0;
      }
      map[event.field].commonMisreads[originalStr]++;
    });

    return Object.values(map).sort((a, b) => b.errorCount - a.errorCount);
  }

  public static getOperatorCorrectionFrequency(operatorId: string): number {
    const history = OCRLearningEngine.getCorrectionHistory({ operatorId } as any); // mock filter
    return history.length;
  }
}
