export interface LayoutCorrectionLog {
  stationId: string;
  fieldKey: string;
  xOffset: number;
  yOffset: number;
  frequency: number;
}

export class StationLayoutMemory {
  private static memoryBank = new Map<string, LayoutCorrectionLog[]>();

  public static logSpatialCorrection(stationId: string, fieldKey: string, dx: number, dy: number): void {
    const stationLogs = this.memoryBank.get(stationId) || [];
    let log = stationLogs.find(l => l.fieldKey === fieldKey && l.xOffset === dx && l.yOffset === dy);

    if (log) {
      log.frequency += 1;
    } else {
      stationLogs.push({
        stationId,
        fieldKey,
        xOffset: dx,
        yOffset: dy,
        frequency: 1
      });
    }

    this.memoryBank.set(stationId, stationLogs);
  }

  public static predictLayoutDrift(stationId: string, fieldKey: string): { dx: number, dy: number } {
    const stationLogs = this.memoryBank.get(stationId);
    if (!stationLogs) return { dx: 0, dy: 0 };

    const specificLogs = stationLogs.filter(l => l.fieldKey === fieldKey);
    if (specificLogs.length === 0) return { dx: 0, dy: 0 };

    // Find the most frequent spatial drift
    const topLog = specificLogs.sort((a, b) => b.frequency - a.frequency)[0];
    
    // Require minimum history before predicting
    if (topLog.frequency >= 5) {
      return { dx: topLog.xOffset, dy: topLog.yOffset };
    }

    return { dx: 0, dy: 0 };
  }
}
