import { CorrectionFeedbackEngine, CorrectionEvent } from './CorrectionFeedbackEngine';

export class AIImprovementAnalytics {
  
  public static getBranchReliability(): Record<string, number> {
    const logs = CorrectionFeedbackEngine.getLogs();
    const branchStats: Record<string, { total: number; corrected: number }> = {};
    
    logs.forEach(log => {
      if (!branchStats[log.branchId]) branchStats[log.branchId] = { total: 0, corrected: 0 };
      branchStats[log.branchId].corrected += 1;
      branchStats[log.branchId].total += 1; // Simplify total for demonstration
    });

    const reliability: Record<string, number> = {};
    Object.keys(branchStats).forEach(branch => {
      const { corrected, total } = branchStats[branch];
      // Simulated baseline total if logs are just corrections
      const simulatedTotal = total * 10 + 50; 
      reliability[branch] = Math.max(0, 100 - ((corrected / simulatedTotal) * 100));
    });

    return reliability;
  }

  public static getOperatorCorrectionTrends(): Record<string, number> {
    const logs = CorrectionFeedbackEngine.getLogs();
    const ops: Record<string, number> = {};
    
    logs.forEach(log => {
      ops[log.operatorId] = (ops[log.operatorId] || 0) + 1;
    });
    
    return ops;
  }

  public static getGlobalCorrectionFrequency(): number {
    return CorrectionFeedbackEngine.getLogs().length;
  }
}
