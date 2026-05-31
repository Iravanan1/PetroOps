import { 
  ShiftRecord, 
  NozzleReading, 
  DailyRecord, 
  AuditIssue 
} from '../types/index.js';
import { THRESHOLDS } from './ReconciliationEngine.js';

export interface FraudAnalysisResult {
  hasAlerts: boolean;
  alerts: AuditIssue[];
  score: number;
}

export class FraudDetectionEngine {
  public static analyzeShift(shift: ShiftRecord, previousShift?: ShiftRecord): FraudAnalysisResult {
    const alerts: AuditIssue[] = [];
    let riskScore = 0;

    // 1. Nozzle Anomalies & Duplicate Entry Detection
    const nozzleAlerts = this.detectNozzleAnomalies(shift);
    alerts.push(...nozzleAlerts);
    if (nozzleAlerts.length > 0) riskScore += 20 * nozzleAlerts.length;

    // 2. Suspicious Testing Detection
    const testingAlerts = this.detectSuspiciousTesting(shift);
    alerts.push(...testingAlerts);
    if (testingAlerts.length > 0) riskScore += 30;

    // 3. Meter Continuity (if previous shift provided)
    if (previousShift) {
      const continuityAlerts = this.detectMeterGaps(shift, previousShift);
      alerts.push(...continuityAlerts);
      if (continuityAlerts.length > 0) riskScore += 40;
    }

    return {
      hasAlerts: alerts.length > 0,
      alerts,
      score: Math.min(100, riskScore)
    };
  }

  public static analyzeDailyPattern(currentRecord: DailyRecord, previousRecords: DailyRecord[]): AuditIssue[] {
    const alerts: AuditIssue[] = [];

    // Streak of negative cash differences (Repeated cash shorting fraud)
    if (previousRecords.length >= THRESHOLDS.PATTERN_DAYS - 1) {
      const recent = [...previousRecords.slice(-(THRESHOLDS.PATTERN_DAYS - 1)), currentRecord];
      if (recent.every(r => r.cashDiff < -THRESHOLDS.CASH_WARN)) {
        alerts.push({ 
          level: 'theft', 
          date: currentRecord.date, 
          message: `🚨 PATTERN DETECTED: Cash short for ${recent.length} consecutive days. Potential bleeding fraud.` 
        });
      }
    }

    return alerts;
  }

  private static detectNozzleAnomalies(shift: ShiftRecord): AuditIssue[] {
    const alerts: AuditIssue[] = [];
    const hsdNozzles = shift.hsd || shift.readings?.filter(r => r.fuel === 'hsd' || r.fuel === 'HSD') || [];
    const msNozzles = shift.ms || shift.readings?.filter(r => r.fuel === 'ms' || r.fuel === 'MS') || [];
    const allNozzles = [...hsdNozzles, ...msNozzles];

    allNozzles.forEach(n => {
      const opening = typeof n.opening === 'string' ? parseFloat(n.opening) : (n.opening || 0);
      const closing = typeof n.closing === 'string' ? parseFloat(n.closing) : (n.closing || 0);
      const sale = closing - opening;

      if (sale < 0) {
        alerts.push({ 
          level: 'error', 
          date: shift.date || shift.shiftDate || new Date().toISOString().split('T')[0], 
          shift: shift.shift,
          message: `Negative sale volume detected on Nozzle ${n.id || n.nozzleId} (${n.fuel.toUpperCase()})` 
        });
      }

      if (n.active && sale === 0 && opening > 0) {
        alerts.push({ 
          level: 'warn', 
          date: shift.date || shift.shiftDate || new Date().toISOString().split('T')[0], 
          shift: shift.shift,
          message: `Nozzle ${n.id || n.nozzleId} marked ACTIVE but reported ZERO sales volume.` 
        });
      }

      const isDuplicate = allNozzles.some(other => 
        other.id !== n.id && 
        other.opening === n.opening && 
        other.closing === n.closing && 
        n.opening !== 0 && 
        n.opening !== "0"
      );
      if (isDuplicate) {
        alerts.push({ 
          level: 'theft', 
          date: shift.date || shift.shiftDate || new Date().toISOString().split('T')[0], 
          shift: shift.shift,
          message: `DUPLICATE ENTRY: Nozzle ${n.id || n.nozzleId} matches readings of another nozzle exactly.` 
        });
      }
    });

    return alerts;
  }

  private static detectSuspiciousTesting(shift: ShiftRecord): AuditIssue[] {
    const alerts: AuditIssue[] = [];
    const hsdNozzles = shift.hsd || shift.readings?.filter(r => r.fuel === 'hsd' || r.fuel === 'HSD') || [];
    const msNozzles = shift.ms || shift.readings?.filter(r => r.fuel === 'ms' || r.fuel === 'MS') || [];
    
    const checkGroup = (nozzles: NozzleReading[], fuelType: string) => {
      const totalRaw = nozzles.reduce((sum, n) => {
        const opening = typeof n.opening === 'string' ? parseFloat(n.opening) : (n.opening || 0);
        const closing = typeof n.closing === 'string' ? parseFloat(n.closing) : (n.closing || 0);
        return sum + Math.max(0, closing - opening);
      }, 0);

      const totalTest = nozzles.reduce((sum, n) => {
        const testing = typeof n.testing === 'string' ? parseFloat(n.testing) : (n.testing || 0);
        return sum + testing;
      }, 0);

      if (totalTest > 15) {
        alerts.push({ 
          level: 'warn', 
          date: shift.date || shift.shiftDate || new Date().toISOString().split('T')[0], 
          shift: shift.shift,
          message: `High testing volume (${totalTest}L) on ${fuelType.toUpperCase()}. Standard is <= 15L.` 
        });
      }

      if (totalRaw > 0 && (totalTest / totalRaw) > 0.05) {
        alerts.push({ 
          level: 'theft', 
          date: shift.date || shift.shiftDate || new Date().toISOString().split('T')[0], 
          shift: shift.shift,
          message: `SUSPICIOUS TESTING: Testing is ${((totalTest / totalRaw) * 100).toFixed(1)}% of total ${fuelType.toUpperCase()} sales.` 
        });
      }
    };

    checkGroup(hsdNozzles, 'hsd');
    checkGroup(msNozzles, 'ms');

    return alerts;
  }

  private static detectMeterGaps(current: ShiftRecord, previous: ShiftRecord): AuditIssue[] {
    const alerts: AuditIssue[] = [];
    const currHsd = current.hsd || current.readings?.filter(r => r.fuel === 'hsd' || r.fuel === 'HSD') || [];
    const prevHsd = previous.hsd || previous.readings?.filter(r => r.fuel === 'hsd' || r.fuel === 'HSD') || [];
    const currMs = current.ms || current.readings?.filter(r => r.fuel === 'ms' || r.fuel === 'MS') || [];
    const prevMs = previous.ms || previous.readings?.filter(r => r.fuel === 'ms' || r.fuel === 'MS') || [];
    
    const checkContinuity = (curr: NozzleReading[], prev: NozzleReading[]) => {
      curr.forEach(cN => {
        const pN = prev.find(p => p.id === cN.id || p.nozzleId === cN.nozzleId);
        if (pN) {
          const cOpening = typeof cN.opening === 'string' ? parseFloat(cN.opening) : (cN.opening || 0);
          const pClosing = typeof pN.closing === 'string' ? parseFloat(pN.closing) : (pN.closing || 0);
          if (cOpening !== pClosing) {
            const gap = Math.abs(cOpening - pClosing);
            if (gap > 0.1) {
              alerts.push({ 
                level: gap > THRESHOLDS.METER_GAP_WARN ? 'theft' : 'error', 
                date: current.date || current.shiftDate || new Date().toISOString().split('T')[0], 
                shift: current.shift,
                message: `METER GAP: Nozzle ${cN.id || cN.nozzleId} opening (${cOpening}) does not match previous closing (${pClosing}). Gap: ${gap.toFixed(2)}L` 
              });
            }
          }
        }
      });
    };

    checkContinuity(currHsd, prevHsd);
    checkContinuity(currMs, prevMs);

    return alerts;
  }
}
