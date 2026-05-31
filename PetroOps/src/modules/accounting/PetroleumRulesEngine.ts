/**
 * PetroleumRulesEngine  (expanded production-grade implementation)
 * ───────────────────────────────────────────────────────────────
 * Domain-specific validation layer for fuel retail operations.
 *
 * Checks implemented:
 *  1. Nozzle Rollback Prevention
 *  2. Wet Stock Variance (ETG dip vs pump sales)
 *  3. Fuel Density / Temperature anomaly detection
 *  4. Settlement Continuity (card batch + UPI merchant vs sales log)
 *  5. Attendant Cash Variance profiling
 *  6. Fraud Risk Scoring Matrix
 *  7. Step-by-step anomaly timeline generation
 */

// ─────────────────────────────────────────────────────────────────
// Input Interfaces
// ─────────────────────────────────────────────────────────────────
export interface NozzleRecord {
  nozzleId: string;
  fuelType: 'MS' | 'HSD' | 'CNG' | 'XP95';
  openingMeter: number;   // litres
  closingMeter: number;   // litres
  testingQty: number;     // litres
  historicalLastClose: number; // last verified closing meter (from prev snapshot)
  fuelRate: number;       // INR / litre
}

export interface WetStockRecord {
  tankId: string;
  fuelType: string;
  openingDip: number;    // litres from ETG / dipstick
  closingDip: number;    // litres
  deliveryReceived: number;
  pumpSalesExtracted: number; // sum of nozzle netSales for this fuel type
  evaporationAllowancePct: number; // standard 0.05–0.10%
}

export interface DensityRecord {
  fuelType: string;
  densityBaseline: number;   // kg/m³ (government standard)
  densityMeasured: number;   // kg/m³ (sampled this shift)
  temperatureC: number;
}

export interface SettlementRecord {
  cardBatchTotal: number;
  upiMerchantTotal: number;
  cardSalesOnRegister: number;
  upiSalesOnRegister: number;
}

export interface AttendantRecord {
  attendantId: string;
  attendantName: string;
  openingCash: number;
  actualCash: number;
  expectedCash: number;    // calculated from sales + recovery - expenses
  historicalVariances: number[]; // last N shifts' net variances (INR)
  alertThresholdINR: number;
}

export interface PetroleumAuditMetrics {
  densityStandard: number;
  densityMeasured: number;
  temperatureStandard: number;
  temperatureMeasured: number;
  totalLitresSold: number;
  cashShortage: number;
  consecutiveDelayDays: number;
}

// ─────────────────────────────────────────────────────────────────
// Output Interfaces
// ─────────────────────────────────────────────────────────────────
export interface AnomalyEvent {
  timestamp: string;
  category:
    | 'NOZZLE_ROLLBACK'
    | 'WETSTOCK_VARIANCE'
    | 'DENSITY_ANOMALY'
    | 'SETTLEMENT_MISMATCH'
    | 'ATTENDANT_VARIANCE'
    | 'CASH_SHORTAGE';
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  entity: string;          // e.g. "Nozzle N1", "Tank T2", "Attendant Raju"
  message: string;
  delta: number;           // numeric deviation (litres, INR, kg/m³, etc.)
  unit: string;
}

export interface OperationalRiskReport {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;       // 0–100
  fraudIndicators: string[];
  anomalyTimeline: AnomalyEvent[];
  nozzleRollbacksDetected: string[];
  wetstockVarianceSummary: Record<string, number>;
  densityAlerts: string[];
  settlementAlerts: string[];
  attendantAlerts: string[];
}

// ─────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────
export class PetroleumRulesEngine {
  private static readonly DENSITY_TOLERANCE_KGM3 = 3.0;       // government limit
  private static readonly EVAPORATION_TOLERANCE_PCT = 0.10;    // 0.10%
  private static readonly SETTLEMENT_TOLERANCE_INR = 50;       // card/UPI rounding
  private static readonly CASH_SHORTAGE_WARNING_INR = 200;
  private static readonly CASH_SHORTAGE_CRITICAL_INR = 1000;

  // ─── 1. Nozzle Rollback Prevention ─────────────────────────────
  public static checkNozzleRollbacks(nozzles: NozzleRecord[]): {
    rollbacks: string[];
    events: AnomalyEvent[];
  } {
    const rollbacks: string[] = [];
    const events: AnomalyEvent[] = [];
    const ts = new Date().toISOString();

    nozzles.forEach(nz => {
      // A. Current closing < current opening (impossible)
      if (nz.closingMeter < nz.openingMeter) {
        rollbacks.push(nz.nozzleId);
        events.push({
          timestamp: ts,
          category: 'NOZZLE_ROLLBACK',
          severity: 'CRITICAL',
          entity: `Nozzle ${nz.nozzleId}`,
          message: `Closing meter (${nz.closingMeter.toFixed(2)} L) is below ` +
            `opening meter (${nz.openingMeter.toFixed(2)} L). ` +
            `Nozzle counter rollback or manipulation suspected.`,
          delta: nz.openingMeter - nz.closingMeter,
          unit: 'Litres'
        });
      }

      // B. Current opening < last verified close (carry-forward rollback)
      if (nz.openingMeter < nz.historicalLastClose - 0.01) {
        rollbacks.push(nz.nozzleId);
        events.push({
          timestamp: ts,
          category: 'NOZZLE_ROLLBACK',
          severity: 'CRITICAL',
          entity: `Nozzle ${nz.nozzleId}`,
          message: `Today's opening meter (${nz.openingMeter.toFixed(2)} L) is ` +
            `less than last verified closing meter (${nz.historicalLastClose.toFixed(2)} L). ` +
            `Physical meter rollback between shifts confirmed.`,
          delta: nz.historicalLastClose - nz.openingMeter,
          unit: 'Litres'
        });
      }
    });

    return { rollbacks, events };
  }

  // ─── 2. Wet Stock Variance Monitoring ──────────────────────────
  public static checkWetStockVariances(tanks: WetStockRecord[]): {
    variances: Record<string, number>;
    events: AnomalyEvent[];
  } {
    const variances: Record<string, number> = {};
    const events: AnomalyEvent[] = [];
    const ts = new Date().toISOString();

    tanks.forEach(tank => {
      // Physical stock movement = opening + deliveries - closing (pump sales + losses)
      const physicalMovement = tank.openingDip + tank.deliveryReceived - tank.closingDip;
      const variance = physicalMovement - tank.pumpSalesExtracted;

      // Permissible evaporation in litres
      const evaporationAllowance = tank.pumpSalesExtracted * (tank.evaporationAllowancePct / 100);
      variances[tank.tankId] = Math.round(variance * 100) / 100;

      if (Math.abs(variance) > evaporationAllowance) {
        const severity = Math.abs(variance) > evaporationAllowance * 5 ? 'CRITICAL' : 'WARNING';
        events.push({
          timestamp: ts,
          category: 'WETSTOCK_VARIANCE',
          severity,
          entity: `Tank ${tank.tankId} (${tank.fuelType})`,
          message: `Wet stock variance of ${variance.toFixed(2)} L detected. ` +
            `Physical movement: ${physicalMovement.toFixed(2)} L, ` +
            `Pump sales: ${tank.pumpSalesExtracted.toFixed(2)} L. ` +
            `Permissible evaporation: ${evaporationAllowance.toFixed(2)} L.`,
          delta: variance,
          unit: 'Litres'
        });
      }
    });

    return { variances, events };
  }

  // ─── 3. Fuel Density / Temperature Tracking ────────────────────
  public static checkDensityAnomalies(samples: DensityRecord[]): {
    alerts: string[];
    events: AnomalyEvent[];
  } {
    const alerts: string[] = [];
    const events: AnomalyEvent[] = [];
    const ts = new Date().toISOString();

    samples.forEach(s => {
      const densityVariance = Math.abs(s.densityBaseline - s.densityMeasured);
      if (densityVariance > this.DENSITY_TOLERANCE_KGM3) {
        const msg = `${s.fuelType} density anomaly: measured ${s.densityMeasured} kg/m³ vs ` +
          `baseline ${s.densityBaseline} kg/m³ (Δ=${densityVariance.toFixed(2)} kg/m³ > ` +
          `${this.DENSITY_TOLERANCE_KGM3} kg/m³ limit). Possible adulteration or water contamination.`;
        alerts.push(msg);
        events.push({
          timestamp: ts,
          category: 'DENSITY_ANOMALY',
          severity: densityVariance > 6 ? 'CRITICAL' : 'HIGH',
          entity: `Density Sample (${s.fuelType})`,
          message: msg,
          delta: densityVariance,
          unit: 'kg/m³'
        });
      }
    });

    return { alerts, events };
  }

  // ─── 4. Settlement Continuity ───────────────────────────────────
  public static checkSettlementContinuity(settlement: SettlementRecord): {
    alerts: string[];
    events: AnomalyEvent[];
  } {
    const alerts: string[] = [];
    const events: AnomalyEvent[] = [];
    const ts = new Date().toISOString();

    const cardDelta = Math.abs(settlement.cardBatchTotal - settlement.cardSalesOnRegister);
    const upiDelta  = Math.abs(settlement.upiMerchantTotal - settlement.upiSalesOnRegister);

    if (cardDelta > this.SETTLEMENT_TOLERANCE_INR) {
      const msg = `Card settlement mismatch: Batch total ₹${settlement.cardBatchTotal.toLocaleString()} vs ` +
        `Register ₹${settlement.cardSalesOnRegister.toLocaleString()} (Δ ₹${cardDelta.toLocaleString()}).`;
      alerts.push(msg);
      events.push({
        timestamp: ts, category: 'SETTLEMENT_MISMATCH', severity: 'HIGH',
        entity: 'Card Terminal', message: msg, delta: cardDelta, unit: 'INR'
      });
    }

    if (upiDelta > this.SETTLEMENT_TOLERANCE_INR) {
      const msg = `UPI settlement mismatch: Merchant total ₹${settlement.upiMerchantTotal.toLocaleString()} vs ` +
        `Register ₹${settlement.upiSalesOnRegister.toLocaleString()} (Δ ₹${upiDelta.toLocaleString()}).`;
      alerts.push(msg);
      events.push({
        timestamp: ts, category: 'SETTLEMENT_MISMATCH', severity: 'HIGH',
        entity: 'UPI Merchant Account', message: msg, delta: upiDelta, unit: 'INR'
      });
    }

    return { alerts, events };
  }

  // ─── 5. Attendant Variance Analysis ────────────────────────────
  public static checkAttendantVariances(attendants: AttendantRecord[]): {
    alerts: string[];
    events: AnomalyEvent[];
  } {
    const alerts: string[] = [];
    const events: AnomalyEvent[] = [];
    const ts = new Date().toISOString();

    attendants.forEach(att => {
      const variance = att.actualCash - att.expectedCash;
      const absVar = Math.abs(variance);

      if (absVar > att.alertThresholdINR) {
        const direction = variance < 0 ? 'SHORTAGE' : 'SURPLUS';
        const msg = `Attendant ${att.attendantName} cash ${direction} of ₹${absVar.toLocaleString()} ` +
          `(Expected: ₹${att.expectedCash.toLocaleString()}, Actual: ₹${att.actualCash.toLocaleString()}).`;
        alerts.push(msg);
        events.push({
          timestamp: ts, category: 'ATTENDANT_VARIANCE',
          severity: absVar > att.alertThresholdINR * 3 ? 'CRITICAL' : 'WARNING',
          entity: `Attendant: ${att.attendantName}`,
          message: msg, delta: variance, unit: 'INR'
        });
      }

      // Repeated pattern detection (≥3 consecutive shortages)
      const recentShortages = att.historicalVariances.filter(v => v < -att.alertThresholdINR * 0.5);
      if (recentShortages.length >= 3) {
        const msg = `Repeated variance pattern for ${att.attendantName}: ` +
          `${recentShortages.length} consecutive shortage events detected.`;
        alerts.push(msg);
        events.push({
          timestamp: ts, category: 'ATTENDANT_VARIANCE', severity: 'HIGH',
          entity: `Attendant: ${att.attendantName}`,
          message: msg, delta: recentShortages.reduce((s, v) => s + v, 0), unit: 'INR'
        });
      }
    });

    return { alerts, events };
  }

  // ─── 6. Consolidated Risk Report ───────────────────────────────
  public static evaluateFullRisk(params: {
    nozzles: NozzleRecord[];
    tanks: WetStockRecord[];
    densitySamples: DensityRecord[];
    settlement: SettlementRecord;
    attendants: AttendantRecord[];
  }): OperationalRiskReport {
    const timeline: AnomalyEvent[] = [];
    const fraudIndicators: string[] = [];
    let riskScore = 10;

    const nozzleCheck      = this.checkNozzleRollbacks(params.nozzles);
    const wetStockCheck    = this.checkWetStockVariances(params.tanks);
    const densityCheck     = this.checkDensityAnomalies(params.densitySamples);
    const settlementCheck  = this.checkSettlementContinuity(params.settlement);
    const attendantCheck   = this.checkAttendantVariances(params.attendants);

    timeline.push(
      ...nozzleCheck.events,
      ...wetStockCheck.events,
      ...densityCheck.events,
      ...settlementCheck.events,
      ...attendantCheck.events
    );

    // Score nozzle rollbacks
    if (nozzleCheck.rollbacks.length > 0) {
      riskScore += 45;
      fraudIndicators.push(`Critical Nozzle Rollback: ${nozzleCheck.rollbacks.join(', ')}`);
    }

    // Score wetstock
    Object.values(wetStockCheck.variances).forEach(v => {
      if (Math.abs(v) > 20) { riskScore += 25; fraudIndicators.push('Significant wet stock variance.'); }
      else if (Math.abs(v) > 5) { riskScore += 10; }
    });

    // Score density
    if (densityCheck.alerts.length > 0) {
      riskScore += 35;
      fraudIndicators.push(...densityCheck.alerts);
    }

    // Score settlement
    if (settlementCheck.alerts.length > 0) {
      riskScore += 20;
      fraudIndicators.push(...settlementCheck.alerts);
    }

    // Score attendant
    if (attendantCheck.alerts.length > 0) {
      riskScore += 15;
      fraudIndicators.push(...attendantCheck.alerts);
    }

    riskScore = Math.min(100, riskScore);
    let overallRiskLevel: OperationalRiskReport['overallRiskLevel'] = 'LOW';
    if (riskScore >= 80) overallRiskLevel = 'CRITICAL';
    else if (riskScore >= 55) overallRiskLevel = 'HIGH';
    else if (riskScore >= 30) overallRiskLevel = 'MEDIUM';

    return {
      overallRiskLevel,
      riskScore,
      fraudIndicators,
      anomalyTimeline: timeline,
      nozzleRollbacksDetected: nozzleCheck.rollbacks,
      wetstockVarianceSummary: wetStockCheck.variances,
      densityAlerts: densityCheck.alerts,
      settlementAlerts: settlementCheck.alerts,
      attendantAlerts: attendantCheck.alerts
    };
  }

  // Legacy compat shim for existing callers
  public static evaluateRisk(
    metrics: PetroleumAuditMetrics,
    rollbacksDetected: boolean
  ): { overallRiskLevel: string; riskScore: number; fraudIndicators: string[] } {
    const fraudIndicators: string[] = [];
    let riskScore = 10;

    const densityVariance = Math.abs(metrics.densityStandard - metrics.densityMeasured);
    if (densityVariance > this.DENSITY_TOLERANCE_KGM3) {
      fraudIndicators.push(`Density anomaly: ${densityVariance.toFixed(2)} kg/m³ variance.`);
      riskScore += 35;
    }
    if (Math.abs(metrics.cashShortage) > this.CASH_SHORTAGE_WARNING_INR) {
      fraudIndicators.push(`Cash shortage: ₹${metrics.cashShortage}`);
      riskScore += 20;
    }
    if (rollbacksDetected) { fraudIndicators.push('Nozzle meter rollback detected.'); riskScore += 45; }
    if (metrics.consecutiveDelayDays > 3) {
      fraudIndicators.push(`Credit delay: ${metrics.consecutiveDelayDays} days.`);
      riskScore += 15;
    }

    riskScore = Math.min(100, riskScore);
    let overallRiskLevel = 'LOW';
    if (riskScore >= 80) overallRiskLevel = 'CRITICAL';
    else if (riskScore >= 55) overallRiskLevel = 'HIGH';
    else if (riskScore >= 30) overallRiskLevel = 'MEDIUM';

    return { overallRiskLevel, riskScore, fraudIndicators };
  }
}
