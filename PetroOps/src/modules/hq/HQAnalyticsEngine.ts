export interface BranchMetrics {
  branchId: string;
  branchName: string;
  region: string;
  dailySalesVolume: number;
  dailySalesAmount: number;
  wetstockVariance: number;
  ocrCorrectionRate: number;
  openAlerts: number;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  lastSyncTime: string;
}

export interface RegionalRollup {
  region: string;
  totalBranches: number;
  totalVolume: number;
  totalRevenue: number;
  avgVariance: number;
  criticalAlerts: number;
}

export class HQAnalyticsEngine {
  private branches: Map<string, BranchMetrics> = new Map();

  /**
   * Simulates receiving a sync payload from a remote branch ledger.
   */
  public ingestBranchData(metrics: BranchMetrics): void {
    this.branches.set(metrics.branchId, metrics);
  }

  public getAllBranchMetrics(): BranchMetrics[] {
    return Array.from(this.branches.values());
  }

  public getRegionalRollups(): RegionalRollup[] {
    const rollups: Record<string, RegionalRollup> = {};

    for (const branch of this.branches.values()) {
      if (!rollups[branch.region]) {
        rollups[branch.region] = {
          region: branch.region,
          totalBranches: 0,
          totalVolume: 0,
          totalRevenue: 0,
          avgVariance: 0,
          criticalAlerts: 0
        };
      }
      
      const r = rollups[branch.region];
      r.totalBranches += 1;
      r.totalVolume += branch.dailySalesVolume;
      r.totalRevenue += branch.dailySalesAmount;
      r.criticalAlerts += branch.openAlerts;
      // Rolling average approximation for demo
      r.avgVariance = ((r.avgVariance * (r.totalBranches - 1)) + branch.wetstockVariance) / r.totalBranches;
    }

    return Object.values(rollups);
  }

  /**
   * Identifies branches performing below acceptable baseline parameters.
   */
  public getUnderperformingBranches(): BranchMetrics[] {
    return this.getAllBranchMetrics().filter(b => 
      b.wetstockVariance > 0.5 || // High leak/shrinkage
      b.ocrCorrectionRate > 0.15 || // AI failing too often
      b.openAlerts > 3
    );
  }
}

export const hqAnalyticsEngine = new HQAnalyticsEngine();

// --- Seed Demo Data ---
hqAnalyticsEngine.ingestBranchData({
  branchId: 'BR_001', branchName: 'Noida Sector 62 HPCL', region: 'NCR',
  dailySalesVolume: 12450, dailySalesAmount: 1195200, wetstockVariance: 0.12,
  ocrCorrectionRate: 0.04, openAlerts: 0, status: 'ONLINE', lastSyncTime: new Date().toISOString()
});
hqAnalyticsEngine.ingestBranchData({
  branchId: 'BR_002', branchName: 'Gurugram NH-8 BPCL', region: 'NCR',
  dailySalesVolume: 28900, dailySalesAmount: 2774400, wetstockVariance: 0.85,
  ocrCorrectionRate: 0.02, openAlerts: 4, status: 'DEGRADED', lastSyncTime: new Date().toISOString()
});
hqAnalyticsEngine.ingestBranchData({
  branchId: 'BR_003', branchName: 'Connaught Place IOCL', region: 'NCR',
  dailySalesVolume: 8400, dailySalesAmount: 806400, wetstockVariance: 0.05,
  ocrCorrectionRate: 0.18, openAlerts: 1, status: 'ONLINE', lastSyncTime: new Date().toISOString()
});
hqAnalyticsEngine.ingestBranchData({
  branchId: 'BR_004', branchName: 'Jaipur Highway Reliance', region: 'RAJASTHAN',
  dailySalesVolume: 42100, dailySalesAmount: 4041600, wetstockVariance: 0.22,
  ocrCorrectionRate: 0.08, openAlerts: 0, status: 'ONLINE', lastSyncTime: new Date().toISOString()
});
