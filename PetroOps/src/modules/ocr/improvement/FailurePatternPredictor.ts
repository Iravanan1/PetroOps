import { CorrectionFeedbackEngine } from './CorrectionFeedbackEngine';

export class FailurePatternPredictor {
  
  /**
   * Identifies if a specific field is failing consistently across recent scans.
   */
  public static analyzeSystemicFailures(): string[] {
    const logs = CorrectionFeedbackEngine.getLogs();
    const recentLogs = logs.slice(-50); // Look at last 50 corrections
    
    const fieldCounts: Record<string, number> = {};
    recentLogs.forEach(log => {
      fieldCounts[log.fieldKey] = (fieldCounts[log.fieldKey] || 0) + 1;
    });

    const warnings: string[] = [];
    Object.entries(fieldCounts).forEach(([fieldKey, count]) => {
      if (count >= 10) {
        warnings.push(`High failure rate detected for field: ${fieldKey} (${count} recent corrections). Layout template might need adjusting.`);
      }
    });

    return warnings;
  }
}
