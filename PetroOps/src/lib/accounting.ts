import { 
  NozzleReading, 
  ShiftRecord, 
  DailyRecord, 
  AuditIssue 
} from '../types/index.js';
import { ReconciliationEngine, DEFAULT_RATES, THRESHOLDS } from './ReconciliationEngine.js';
import { FraudDetectionEngine } from './FraudDetectionEngine.js';

export { DEFAULT_RATES, THRESHOLDS };

/**
 * Calculates results for a group of nozzles (HSD or MS)
 */
export function calculateFuelGroup(
  nozzles: NozzleReading[], 
  testingExpense: number, 
  sellRate: number
) {
  const active = nozzles.filter(n => n.active);
  let rawLitres = 0;
  let testingLitres = 0;
  
  const breakdown = nozzles.map(n => {
    const opening = typeof n.opening === 'string' ? parseFloat(n.opening) : (n.opening || 0);
    const closing = typeof n.closing === 'string' ? parseFloat(n.closing) : (n.closing || 0);
    const testing = typeof n.testing === 'string' ? parseFloat(n.testing) : (n.testing || 0);

    if (n.active === false) return { id: n.id || 0, raw: 0, test: 0, net: 0, active: false };
    
    const raw = Math.max(0, closing - opening); 
    testingLitres += testing;
    rawLitres += raw;
    
    return {
      id: n.id || 0,
      raw,
      test: testing,
      net: Math.max(0, raw - testing),
      active: true
    };
  });

  let netLitres;
  if (testingLitres > 0) {
    netLitres = Math.max(0, rawLitres - testingLitres);
  } else if (testingExpense > 0 && sellRate > 0) {
    netLitres = Math.max(0, rawLitres - (testingExpense / sellRate));
  } else {
    netLitres = rawLitres;
  }

  const zeroSaleNozzles = breakdown.filter(n => n.active && n.net === 0 && rawLitres > 0);

  return {
    netLitres,
    rawLitres,
    breakdown,
    anomalies: zeroSaleNozzles.map(n => `${n.id} active with zero sale`)
  };
}

/**
 * Full shift financial calculation
 */
export function calculateShift(shift: ShiftRecord, previousShift?: ShiftRecord) {
  const report = ReconciliationEngine.reconcile(shift);
  const fraudResult = FraudDetectionEngine.analyzeShift(shift, previousShift);

  return {
    hsdL: report.metrics.totalLitres.hsd,
    msL: report.metrics.totalLitres.ms,
    revenue: report.metrics.revenue,
    paytm: report.metrics.paytmTotal,
    credit: report.metrics.creditTotal,
    recovery: report.metrics.recoveryTotal,
    expenses: report.metrics.expenseTotal,
    expectedCash: report.metrics.expectedCash,
    actualCash: report.metrics.actualCash,
    cashDiff: report.metrics.cashMismatch,
    profit: report.metrics.netProfit,
    anomalies: [
      ...report.flags.map(f => f.message),
      ...fraudResult.alerts.map(f => f.message)
    ],
    fraudScore: fraudResult.score,
    report
  };
}

/**
 * Aggregates day and night shifts into a daily record
 */
export function buildDailyRecord(
  date: string, 
  dayShift: ShiftRecord | null, 
  nightShift: ShiftRecord | null,
  previousRecords: DailyRecord[] = []
): DailyRecord {
  const dc = dayShift ? calculateShift(dayShift) : null;
  const nc = nightShift ? calculateShift(nightShift, dayShift || undefined) : null;
  
  const sum = (key: 'hsdL' | 'msL' | 'revenue' | 'profit' | 'cashDiff' | 'paytm' | 'credit' | 'recovery' | 'expenses') => 
    ((dc?.[key] as number || 0) + (nc?.[key] as number || 0));

  const hsdL = sum('hsdL');
  const msL = sum('msL');
  const revenue = sum('revenue');
  const profit = sum('profit');
  const cashDiff = sum('cashDiff');

  const alerts: AuditIssue[] = [];

  if (!dayShift) alerts.push({ level: 'info', date, message: 'Day shift missing' });
  if (!nightShift) alerts.push({ level: 'info', date, message: 'Night shift missing' });

  // Consolidate flags from both reports
  if (dc?.report) {
    dc.report.flags.forEach(f => alerts.push({ level: f.level, date, message: `(Day) ${f.message}` }));
  }
  if (nc?.report) {
    nc.report.flags.forEach(f => alerts.push({ level: f.level, date, message: `(Night) ${f.message}` }));
  }

  // Tank logic
  const hsdTankDiff = nc?.report.variances.tanks.hsd || 0;
  const msTankDiff = nc?.report.variances.tanks.ms || 0;

  const currentRecord: DailyRecord = {
    date,
    hsdL,
    msL,
    revenue,
    paytm: sum('paytm'),
    credit: sum('credit'),
    recovery: sum('recovery'),
    expenses: sum('expenses'),
    profit,
    cashDiff,
    hsdTankDiff,
    msTankDiff,
    hasDay: !!dayShift,
    hasNight: !!nightShift,
    alerts,
    netCredit: sum('credit') - sum('recovery')
  };

  const patternAlerts = FraudDetectionEngine.analyzeDailyPattern(currentRecord, previousRecords);
  alerts.push(...patternAlerts);

  return currentRecord;
}
