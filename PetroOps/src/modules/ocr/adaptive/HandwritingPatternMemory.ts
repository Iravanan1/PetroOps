export interface DigitConfusionLog {
  operatorId: string;
  originalOCR: string;
  correctedValue: string;
  frequency: number;
}

export class HandwritingPatternMemory {
  // Map of operatorId -> array of confusion patterns
  private static memoryBank = new Map<string, DigitConfusionLog[]>();

  public static logCorrection(operatorId: string, originalOCR: string, correctedValue: string): void {
    if (!operatorId || !originalOCR || !correctedValue) return;
    
    // Only track single digit or common character swaps (e.g., 'O' -> '0', '7' -> '1')
    if (originalOCR.length > 2 || correctedValue.length > 2) return;

    const operatorLogs = this.memoryBank.get(operatorId) || [];
    const existingLog = operatorLogs.find(log => log.originalOCR === originalOCR && log.correctedValue === correctedValue);

    if (existingLog) {
      existingLog.frequency += 1;
    } else {
      operatorLogs.push({
        operatorId,
        originalOCR,
        correctedValue,
        frequency: 1
      });
    }

    this.memoryBank.set(operatorId, operatorLogs);
  }

  public static predictCorrection(operatorId: string, extractedStr: string): string | null {
    const operatorLogs = this.memoryBank.get(operatorId);
    if (!operatorLogs || operatorLogs.length === 0) return null;

    // Very naive substitution for demonstration: substitute high-frequency known confusions
    let suggestion = extractedStr;
    let modified = false;

    // Sort by frequency descending
    const sortedLogs = [...operatorLogs].sort((a, b) => b.frequency - a.frequency);

    for (const log of sortedLogs) {
      if (log.frequency > 3) { // Require at least 3 historical corrections to form a prediction
        if (suggestion.includes(log.originalOCR)) {
          suggestion = suggestion.replace(new RegExp(log.originalOCR, 'g'), log.correctedValue);
          modified = true;
        }
      }
    }

    return modified ? suggestion : null;
  }
}
