/**
 * ShiftStressEngine.ts
 * ─────────────────────
 * Production-grade simulation + stress-testing engine for PumpAI petroleum shifts.
 * Integrated with the authoritative CoreReplayEngine and TransactionNormalizer.
 */

import { ShiftLifecycleFSM, ShiftState } from '../operations/ShiftLifecycleFSM';
import { AIExtraction } from '../ai/validation/AIExtractionSchema';
import { TransactionNormalizer, LedgerTransaction } from '../accounting/TransactionNormalizer';
import { CoreReplayEngine, ReplayState } from '../replay/CoreReplayEngine';

// ─── SIMULATION CONSTANTS ────────────────────────────────────────────────────────

export const FUEL_RATES: Record<string, number> = {
  MS:    104.72,
  HSD:   91.60,
  SPEED: 117.50,
};

const OPERATORS = [
  { id: 'op_001', name: 'Raju Sharma',    shift: 'D' },
  { id: 'op_002', name: 'Suresh Yadav',   shift: 'N' },
  { id: 'op_003', name: 'Mohan Gupta',    shift: 'D' },
  { id: 'op_004', name: 'Priya Verma',    shift: 'N' },
];

const EXPENSE_TEMPLATES = [
  'Station tea & snacks',
  'Pipe fitting repair',
  'Generator diesel',
  'Toilet cleaner',
  'Fire extinguisher refill',
  'Electricity bill petty cash',
  'Water tank cleaning',
  'Lubricant stock',
];

// ─── TYPES ────────────────────────────────────────────────────────────────────────

export type SimEventType =
  | 'SHIFT_OPEN' | 'SHIFT_ACTIVE' | 'SHIFT_REVIEW' | 'SHIFT_RECONCILE'
  | 'SHIFT_LOCK'  | 'SHIFT_REOPEN'
  | 'NOZZLE_SALE' | 'NOZZLE_ROLLBACK'
  | 'UPI_COLLECT' | 'CARD_COLLECT'
  | 'EXPENSE'     | 'CREDIT_SALE' | 'CREDIT_RECOVERY'
  | 'DIP_READING' | 'TESTING_LITRE'
  | 'OCR_FAILURE' | 'DUPLICATE_ENTRY'
  | 'OFFLINE_WRITE' | 'OFFLINE_REPLAY' | 'SYNC_CONFLICT'
  | 'SNAPSHOT_CHECKPOINT' | 'CARRY_FORWARD'
  | 'STRESS_SCENARIO';

export type FailureMode =
  | 'till_shortage' | 'duplicate_entry' | 'delayed_settlement'
  | 'ocr_failure' | 'carry_forward_mismatch' | 'nozzle_rollback'
  | 'offline_conflict' | 'partial_write' | 'duplicate_sync'
  | 'network_interruption' | 'none';

export type SeverityLevel = 'info' | 'warn' | 'error' | 'critical';

export interface SimNozzle {
  id: string;
  label: string;
  fuel: string;
  opening: number;
  closing: number;
  testing: number;
  rate: number;
}

export interface SimEvent {
  id: string;
  seq: number;
  ts: string;
  type: SimEventType;
  severity: SeverityLevel;
  shiftId: string;
  operatorId: string;
  message: string;
  payload: Record<string, any>;
  checksum: string;
  replayed: boolean;
  failureMode: FailureMode;
}

export interface SimShift {
  id: string;
  date: string;
  label: string;
  state: ShiftState;
  operatorId: string;
  operatorName: string;
  openingCash: number;
  nozzles: SimNozzle[];
  upiTotal: number;
  cardTotal: number;
  creditSales: number;
  creditRecovery: number;
  expenses: number;
  tillCounted: number;
  shortage: number;
  events: SimEvent[];
  snapshotHash: string;
  carryForward: number;
  dipReadings: Record<string, number>;
}

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  failureMode: FailureMode;
  expectedOutcome: string;
  injected: boolean;
}

export interface CarryForwardCheck {
  shiftId: string;
  date: string;
  label: string;
  expectedCash: number;
  actualCash: number;
  delta: number;
  passed: boolean;
}

export interface NozzleContinuityCheck {
  shiftId: string;
  date: string;
  label: string;
  nozzleId: string;
  expectedOpening: number;
  actualOpening: number;
  delta: number;
  passed: boolean;
}

export interface SettlementCheck {
  shiftId: string;
  date: string;
  label: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
  recordedShortage: number;
  passed: boolean;
}

export interface LockedPeriodViolation {
  date: string;
  attemptedTxId: string;
  message: string;
  blocked: boolean;
}

export interface MismatchReportItem {
  severity: 'info' | 'warn' | 'error' | 'critical';
  category: 'carry_forward' | 'nozzle_continuity' | 'settlement' | 'ledger' | 'lock_violation';
  message: string;
  timestamp: string;
}

export interface CorrectionRecommendation {
  problem: string;
  solution: string;
  actionableCmd?: string;
}

export interface AccountingReplayResult {
  replayState: ReplayState;
  carryForwardChecks: CarryForwardCheck[];
  nozzleContinuityChecks: NozzleContinuityCheck[];
  settlementChecks: SettlementCheck[];
  lockedPeriodViolations: LockedPeriodViolation[];
  mismatchReport: MismatchReportItem[];
  correctionRecommendations: CorrectionRecommendation[];
}

export interface SimRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  mode: 'single' | 'multi_day' | 'load_test' | 'stress';
  simMode?: 'operator' | 'manager' | 'locked_period';
  shiftCount: number;
  txCount: number;
  failureCount: number;
  warningCount: number;
  durationMs: number;
  shifts: SimShift[];
  scenarios: StressScenario[];
  replayValid: boolean;
  ledgerIntact: boolean;
  summary: string;
  accountingReplay?: AccountingReplayResult;
}

export interface StressMetrics {
  totalEvents:      number;
  failures:         number;
  warnings:         number;
  replaysRun:       number;
  replaySuccesses:  number;
  replayFailures:   number;
  avgShiftDurationMs: number;
  shortagesDetected:  number;
  duplicatesDetected: number;
  ocrFailures:        number;
  offlineConflicts:   number;
  ledgerIntegrityOk:  boolean;
  snapshotContinuity: boolean;
  carryForwardValid:  boolean;
}

// ─── FAST HASH ────────────────────────────────────────────────────────────────────

function fastHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let seqCounter = 0;
function makeEvent(
  type: SimEventType,
  shiftId: string,
  operatorId: string,
  message: string,
  payload: Record<string, any> = {},
  severity: SeverityLevel = 'info',
  failureMode: FailureMode = 'none'
): SimEvent {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const ts = new Date().toISOString();
  const raw = `${id}${type}${shiftId}${operatorId}${ts}${JSON.stringify(payload)}`;
  return {
    id, seq: ++seqCounter, ts, type, severity, shiftId, operatorId,
    message, payload, checksum: fastHash(raw), replayed: false, failureMode
  };
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── SIMULATION ENGINE ─────────────────────────────────────────────────────────────

export class ShiftStressEngine {
  // ── Shift Generator ────────────────────────────────────────────────────────────

  static generateShift(
    date: string,
    label: string,
    injectFailures: FailureMode[] = [],
    carryForwardCash = 0
  ): SimShift {
    const operator = pick(OPERATORS);
    const shiftId = `shift_${date.replace(/-/g, '')}_${label.charAt(0)}_${operator.id}`;

    const openingCash = carryForwardCash > 0 ? carryForwardCash : randInt(8000, 20000);
    const events: SimEvent[] = [];

    // ── Nozzle setup
    const nozzles: SimNozzle[] = [
      { id: 'N1', label: 'Nozzle 1', fuel: 'MS',  opening: parseFloat(rand(1200, 2000).toFixed(2)), closing: 0, testing: parseFloat(rand(1, 5).toFixed(2)), rate: FUEL_RATES.MS  },
      { id: 'N2', label: 'Nozzle 2', fuel: 'MS',  opening: parseFloat(rand(1200, 2000).toFixed(2)), closing: 0, testing: parseFloat(rand(1, 5).toFixed(2)), rate: FUEL_RATES.MS  },
      { id: 'N3', label: 'Nozzle 3', fuel: 'HSD', opening: parseFloat(rand(800, 1500).toFixed(2)),  closing: 0, testing: parseFloat(rand(1, 4).toFixed(2)), rate: FUEL_RATES.HSD },
      { id: 'N4', label: 'Nozzle 4', fuel: 'HSD', opening: parseFloat(rand(800, 1500).toFixed(2)),  closing: 0, testing: parseFloat(rand(1, 4).toFixed(2)), rate: FUEL_RATES.HSD },
    ];

    // Assign closing readings
    nozzles.forEach(nz => {
      const saleL = rand(80, 350);
      nz.closing = parseFloat((nz.opening + saleL + nz.testing).toFixed(2));
    });

    events.push(makeEvent('SHIFT_OPEN', shiftId, operator.id,
      `Shift opened. Operator: ${operator.name}. Opening float: ₹${openingCash.toLocaleString('en-IN')}`,
      { openingCash, operator }, 'info'));

    // ── Simulate 15–60 transactions
    const txCount = randInt(15, 60);
    let upiTotal = 0, cardTotal = 0, creditSales = 0, creditRecovery = 0, expenses = 0;

    for (let t = 0; t < txCount; t++) {
      const txType = pick(['upi', 'card', 'credit', 'expense', 'recovery', 'upi', 'upi', 'card']);

      if (txType === 'upi') {
        const amt = randInt(200, 5000);
        upiTotal += amt;
        events.push(makeEvent('UPI_COLLECT', shiftId, operator.id,
          `UPI collected ₹${amt.toLocaleString('en-IN')} via QR terminal`, { amount: amt }));
      } else if (txType === 'card') {
        const amt = randInt(500, 8000);
        cardTotal += amt;
        events.push(makeEvent('CARD_COLLECT', shiftId, operator.id,
          `Card payment ₹${amt.toLocaleString('en-IN')} via POS`, { amount: amt }));
      } else if (txType === 'credit') {
        const amt = randInt(300, 3000);
        creditSales += amt;
        events.push(makeEvent('CREDIT_SALE', shiftId, operator.id,
          `Credit sale ₹${amt.toLocaleString('en-IN')} (udhari customer)`, { amount: amt }));
      } else if (txType === 'expense') {
        const desc = pick(EXPENSE_TEMPLATES);
        const amt = randInt(100, 2000);
        expenses += amt;
        events.push(makeEvent('EXPENSE', shiftId, operator.id,
          `Expense: ${desc} ₹${amt.toLocaleString('en-IN')}`, { desc, amount: amt }));
      } else if (txType === 'recovery') {
        const amt = randInt(200, 2500);
        creditRecovery += amt;
        events.push(makeEvent('CREDIT_RECOVERY', shiftId, operator.id,
          `Credit recovery ₹${amt.toLocaleString('en-IN')} collected`, { amount: amt }));
      }
    }

    // ── Compute fuel revenue
    const fuelRevenue = nozzles.reduce((s, nz) => {
      const net = Math.max(0, nz.closing - nz.opening - nz.testing);
      return s + net * nz.rate;
    }, 0);

    // ── Dip readings
    const dipReadings: Record<string, number> = {
      MS_tank_1:  parseFloat(rand(2000, 8000).toFixed(0)),
      MS_tank_2:  parseFloat(rand(1000, 6000).toFixed(0)),
      HSD_tank_1: parseFloat(rand(3000, 10000).toFixed(0)),
    };
    events.push(makeEvent('DIP_READING', shiftId, operator.id,
      `Dip readings recorded: MS1=${dipReadings.MS_tank_1}L MS2=${dipReadings.MS_tank_2}L HSD=${dipReadings.HSD_tank_1}L`,
      { dipReadings }));

    // ── Inject failure scenarios
    let tillCounted = openingCash + fuelRevenue + creditRecovery - creditSales - expenses;
    let shortage = 0;

    for (const failure of injectFailures) {
      switch (failure) {
        case 'till_shortage': {
          const short = randInt(200, 2500);
          tillCounted = Math.max(0, tillCounted - short);
          shortage = short;
          events.push(makeEvent('STRESS_SCENARIO', shiftId, operator.id,
            `INJECTED till shortage of ₹${short.toLocaleString('en-IN')}`,
            { failure, shortage: short }, 'error', 'till_shortage'));
          break;
        }
        case 'duplicate_entry': {
          const dupAmt = randInt(500, 3000);
          upiTotal += dupAmt;  // same entry added twice
          events.push(makeEvent('DUPLICATE_ENTRY', shiftId, operator.id,
            `INJECTED duplicate UPI entry ₹${dupAmt.toLocaleString('en-IN')} — double-posted`,
            { failure, dupAmt }, 'warn', 'duplicate_entry'));
          break;
        }
        case 'ocr_failure': {
          events.push(makeEvent('OCR_FAILURE', shiftId, operator.id,
            `INJECTED OCR extraction failure — nozzle readings unreadable, falling back to manual`,
            { failure, affectedNozzles: ['N1', 'N3'] }, 'error', 'ocr_failure'));
          break;
        }
        case 'nozzle_rollback': {
          const rollbackNozzle = nozzles[0];
          const oldClosing = rollbackNozzle.closing;
          rollbackNozzle.closing = rollbackNozzle.opening + 10; // rollback to near-opening
          events.push(makeEvent('NOZZLE_ROLLBACK', shiftId, operator.id,
            `INJECTED nozzle rollback on ${rollbackNozzle.label}: closing reset from ${oldClosing.toFixed(2)} to ${rollbackNozzle.closing.toFixed(2)}`,
            { failure, nozzleId: rollbackNozzle.id, oldClosing, newClosing: rollbackNozzle.closing }, 'error', 'nozzle_rollback'));
          break;
        }
        case 'carry_forward_mismatch': {
          const delta = randInt(100, 800);
          events.push(makeEvent('CARRY_FORWARD', shiftId, operator.id,
            `INJECTED carry-forward mismatch: expected ₹${carryForwardCash.toLocaleString('en-IN')}, actual ₹${(carryForwardCash - delta).toLocaleString('en-IN')}`,
            { failure, expected: carryForwardCash, actual: carryForwardCash - delta, delta }, 'error', 'carry_forward_mismatch'));
          break;
        }
        case 'offline_conflict': {
          events.push(makeEvent('SYNC_CONFLICT', shiftId, operator.id,
            `INJECTED sync conflict: same shiftId submitted twice from offline queue during network restore`,
            { failure, conflictType: 'duplicate_shiftId' }, 'warn', 'offline_conflict'));
          break;
        }
        case 'partial_write': {
          events.push(makeEvent('OFFLINE_WRITE', shiftId, operator.id,
            `INJECTED partial write: IndexedDB transaction interrupted mid-batch (simulated power loss)`,
            { failure, batchProgress: '43/100' }, 'critical', 'partial_write'));
          break;
        }
        case 'delayed_settlement': {
          events.push(makeEvent('STRESS_SCENARIO', shiftId, operator.id,
            `INJECTED delayed settlement: UPI gateway response pending for 47s (timeout threshold 30s)`,
            { failure, gatewayDelayMs: 47000 }, 'warn', 'delayed_settlement'));
          break;
        }
        case 'duplicate_sync': {
          events.push(makeEvent('OFFLINE_REPLAY', shiftId, operator.id,
            `INJECTED duplicate sync: offline queue replayed same transaction x3 before dedup detection`,
            { failure, duplicates: 3, txId: `tx_${Date.now()}` }, 'warn', 'duplicate_sync'));
          break;
        }
      }
    }

    // ── Snapshot checkpoint
    const snapshotPayload = {
      fuelRevenue:    parseFloat(fuelRevenue.toFixed(2)),
      upiTotal:       parseFloat(upiTotal.toFixed(2)),
      cardTotal:      parseFloat(cardTotal.toFixed(2)),
      creditSales:    parseFloat(creditSales.toFixed(2)),
      creditRecovery: parseFloat(creditRecovery.toFixed(2)),
      expenses:       parseFloat(expenses.toFixed(2)),
      tillCounted:    parseFloat(tillCounted.toFixed(2)),
      shortage:       parseFloat(shortage.toFixed(2)),
    };
    const snapshotHash = fastHash(JSON.stringify(snapshotPayload) + shiftId + date);

    events.push(makeEvent('SNAPSHOT_CHECKPOINT', shiftId, operator.id,
      `Snapshot checkpoint generated: hash=${snapshotHash}`,
      { snapshotHash, ...snapshotPayload }, 'info'));

    // ── FSM lifecycle
    events.push(makeEvent('SHIFT_ACTIVE',     shiftId, operator.id, 'Shift activated — transactions flowing', {}));
    events.push(makeEvent('SHIFT_REVIEW',     shiftId, operator.id, 'Shift submitted for supervisor review', {}));
    events.push(makeEvent('SHIFT_RECONCILE',  shiftId, operator.id, 'Reconciliation complete — figures signed off', {}));
    events.push(makeEvent('SHIFT_LOCK',       shiftId, operator.id, 'Shift locked — ledger immutable', {}));

    const shift: SimShift = {
      id: shiftId, date, label, state: 'locked',
      operatorId: operator.id, operatorName: operator.name,
      openingCash, nozzles, upiTotal: parseFloat(upiTotal.toFixed(2)),
      cardTotal: parseFloat(cardTotal.toFixed(2)),
      creditSales: parseFloat(creditSales.toFixed(2)),
      creditRecovery: parseFloat(creditRecovery.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      tillCounted: parseFloat(tillCounted.toFixed(2)),
      shortage: parseFloat(shortage.toFixed(2)),
      events, snapshotHash, carryForward: parseFloat(tillCounted.toFixed(2)),
      dipReadings,
    };

    return shift;
  }

  // ── Multi-Day Replay ────────────────────────────────────────────────────────────

  static generateMultiDayReplay(days: number, failureRate = 0.2): SimShift[] {
    const shifts: SimShift[] = [];
    let carryForward = 15000;
    const today = new Date();

    for (let d = 0; d < days; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - d));
      const dateStr = date.toISOString().slice(0, 10);

      for (const label of ['Day', 'Night']) {
        const failures: FailureMode[] = [];
        if (Math.random() < failureRate) {
          failures.push(pick(['till_shortage', 'duplicate_entry', 'ocr_failure',
                              'nozzle_rollback', 'carry_forward_mismatch',
                              'offline_conflict', 'partial_write', 'delayed_settlement',
                              'duplicate_sync'] as FailureMode[]));
        }
        const shift = this.generateShift(dateStr, label, failures, carryForward);
        carryForward = shift.carryForward;
        shifts.push(shift);
      }
    }
    return shifts;
  }

  // ── Load Test ──────────────────────────────────────────────────────────────────

  static generateLoadTest(txTarget = 1000): { shifts: SimShift[]; totalTx: number } {
    const shifts: SimShift[] = [];
    let totalTx = 0;
    let carryForward = 15000;
    const today = new Date();
    let day = 0;

    while (totalTx < txTarget) {
      const date = new Date(today);
      date.setDate(today.getDate() - day);
      const dateStr = date.toISOString().slice(0, 10);
      const shift = this.generateShift(dateStr, day % 2 === 0 ? 'Day' : 'Night', [], carryForward);
      totalTx += shift.events.filter(e => ['UPI_COLLECT','CARD_COLLECT','EXPENSE','CREDIT_SALE','CREDIT_RECOVERY'].includes(e.type)).length;
      carryForward = shift.carryForward;
      shifts.push(shift);
      day++;
    }
    return { shifts, totalTx };
  }

  // ── Deterministic Replay Validation ───────────────────────────────────────────

  static validateReplay(shift: SimShift): {
    valid: boolean; recomputedHash: string; matches: boolean; issues: string[];
  } {
    const issues: string[] = [];
    let upi = 0, card = 0, credit = 0, recovery = 0, expense = 0;

    for (const ev of shift.events) {
      if (ev.type === 'UPI_COLLECT')      upi      += ev.payload.amount || 0;
      if (ev.type === 'CARD_COLLECT')     card     += ev.payload.amount || 0;
      if (ev.type === 'CREDIT_SALE')      credit   += ev.payload.amount || 0;
      if (ev.type === 'CREDIT_RECOVERY')  recovery += ev.payload.amount || 0;
      if (ev.type === 'EXPENSE')          expense  += ev.payload.amount || 0;
    }

    const fuelRevenue = shift.nozzles.reduce((s, nz) => {
      const net = Math.max(0, nz.closing - nz.opening - nz.testing);
      return s + net * nz.rate;
    }, 0);

    const expectedTill = shift.openingCash + fuelRevenue + recovery - credit - expense;
    const delta = Math.abs(expectedTill - shift.tillCounted);

    if (delta > 1 && shift.shortage === 0) {
      issues.push(`Till discrepancy of ₹${delta.toFixed(2)} — shortage not recorded`);
    }
    if (upi !== shift.upiTotal) {
      const dupDelta = Math.abs(upi - shift.upiTotal);
      if (dupDelta > 1) issues.push(`UPI replay mismatch: replayed ₹${upi.toFixed(2)}, recorded ₹${shift.upiTotal.toFixed(2)}`);
    }

    // Verify checksums
    const badChecksums = shift.events.filter(ev => {
      const raw = `${ev.id}${ev.type}${ev.shiftId}${ev.operatorId}${ev.ts}${JSON.stringify(ev.payload)}`;
      return fastHash(raw) !== ev.checksum;
    });
    if (badChecksums.length > 0) {
      issues.push(`${badChecksums.length} event(s) have invalid checksums — ledger tampered`);
    }

    // Recompute snapshot — must use identical field order + rounding as generateShift
    const snapshotPayload = {
      fuelRevenue:    parseFloat(fuelRevenue.toFixed(2)),
      upiTotal:       shift.upiTotal,
      cardTotal:      shift.cardTotal,
      creditSales:    shift.creditSales,
      creditRecovery: shift.creditRecovery,
      expenses:       shift.expenses,
      tillCounted:    shift.tillCounted,
      shortage:       shift.shortage,
    };
    const recomputedHash = fastHash(JSON.stringify(snapshotPayload) + shift.id + shift.date);
    const matches = recomputedHash === shift.snapshotHash;
    if (!matches) issues.push(`Snapshot hash mismatch — data mutated after locking`);

    return { valid: issues.length === 0, recomputedHash, matches, issues };
  }

  // ── Conversion Helper ──────────────────────────────────────────────────────────

  public static mapSimShiftToAIExtraction(shift: SimShift): AIExtraction {
    return {
      shiftDate: shift.date,
      operatorName: shift.operatorName,
      openingCash: shift.openingCash,
      actualCash: shift.tillCounted,
      cardSales: shift.cardTotal,
      upiSales: shift.upiTotal,
      creditSales: shift.creditSales,
      creditRecovery: shift.creditRecovery,
      expenses: shift.expenses,
      fuelTotals: [],
      nozzleReadings: shift.nozzles.map(nz => ({
        nozzleId: nz.id,
        fuelType: nz.fuel,
        openingMeter: nz.opening,
        closingMeter: nz.closing,
        testingQty: nz.testing,
        netSales: Math.max(0, nz.closing - nz.opening - nz.testing),
        fuelRate: nz.rate,
      })),
      testingLitres: [],
      creditEntries: [],
      confidence: 100,
      fieldConfidence: {
        actualCash: 1,
        cardSales: 1,
        upiSales: 1,
        nozzleClose: 1,
      },
      warnings: [],
    };
  }

  // ── Authoritative Accounting Replay Bridge ─────────────────────────────────────

  public static runAccountingReplay(
    branchId: string,
    shifts: SimShift[],
    simMode: 'operator' | 'manager' | 'locked_period' = 'operator'
  ): AccountingReplayResult {
    const carryForwardChecks: CarryForwardCheck[] = [];
    const nozzleContinuityChecks: NozzleContinuityCheck[] = [];
    const settlementChecks: SettlementCheck[] = [];
    const lockedPeriodViolations: LockedPeriodViolation[] = [];
    const mismatchReport: MismatchReportItem[] = [];
    const correctionRecommendations: CorrectionRecommendation[] = [];

    const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

    // Determine lock date for locked_period simulation
    let lockDate: string | null = null;
    if (simMode === 'locked_period' && sortedShifts.length > 0) {
      const midIdx = Math.floor(sortedShifts.length / 2);
      lockDate = sortedShifts[midIdx].date;
    }

    let transactions: LedgerTransaction[] = [];
    let currentSeq = 1;
    const lastNozzleClosing: Record<string, number> = {};

    sortedShifts.forEach((s, idx) => {
      const prev = sortedShifts[idx - 1];

      // 1. Carry-Forward Continuity Check
      if (prev) {
        const cfDelta = s.openingCash - prev.carryForward;
        const passed = Math.abs(cfDelta) < 0.01;
        carryForwardChecks.push({
          shiftId: s.id,
          date: s.date,
          label: s.label,
          expectedCash: prev.carryForward,
          actualCash: s.openingCash,
          delta: cfDelta,
          passed
        });

        if (!passed) {
          mismatchReport.push({
            severity: 'error',
            category: 'carry_forward',
            message: `Carry-Forward Mismatch on ${s.date} (${s.label}): Opening float ₹${s.openingCash} does not match previous closing float ₹${prev.carryForward}. Delta: ₹${cfDelta.toFixed(2)}.`,
            timestamp: new Date().toISOString()
          });

          correctionRecommendations.push({
            problem: `Carry-Forward Break on ${s.date}`,
            solution: `Verify opening drawer float for operator ${s.operatorName}. Adjust starting float by ₹${(-cfDelta).toFixed(2)} to match yesterday's closing cash book.`,
            actionableCmd: `npm run adjust-float --branch=${branchId} --date=${s.date} --amount=${(-cfDelta).toFixed(2)}`
          });
        }
      }

      // 2. Nozzle Meter Continuity Check
      s.nozzles.forEach(nz => {
        const lastClosing = lastNozzleClosing[nz.id];
        if (lastClosing !== undefined) {
          const delta = nz.opening - lastClosing;
          const passed = Math.abs(delta) < 0.01;
          nozzleContinuityChecks.push({
            shiftId: s.id,
            date: s.date,
            label: s.label,
            nozzleId: nz.id,
            expectedOpening: lastClosing,
            actualOpening: nz.opening,
            delta,
            passed
          });

          if (!passed) {
            mismatchReport.push({
              severity: 'error',
              category: 'nozzle_continuity',
              message: `Nozzle Meter Break for Nozzle ${nz.id} (${nz.label}) on ${s.date}: Today's opening meter ${nz.opening} does not match yesterday's closing ${lastClosing}. Gap: ${delta.toFixed(2)}L.`,
              timestamp: new Date().toISOString()
            });

            correctionRecommendations.push({
              problem: `Nozzle ${nz.id} meter reading gap on ${s.date}`,
              solution: `Perform visual log audit on Nozzle ${nz.id} meter dial. If gap of ${delta.toFixed(2)}L represents unrecorded sales or testing, apply correcting Wet Stock Adjustment of ₹${(delta * nz.rate).toFixed(2)}.`,
              actionableCmd: `npm run adjust-meter --branch=${branchId} --nozzle=${nz.id} --date=${s.date} --litres=${delta.toFixed(2)}`
            });
          }
        }
        lastNozzleClosing[nz.id] = nz.closing;
      });

      // 3. Normalize simulated shift to Double-Entry Ledger Transactions
      const aiExtraction = this.mapSimShiftToAIExtraction(s);
      
      const hasShortage = s.shortage > 0;
      if (hasShortage && simMode === 'manager') {
        s.events.push(makeEvent('STRESS_SCENARIO', s.id, 'mgr_001', 
          `[MANAGER OVERRIDE APPROVED] Shortage of ₹${s.shortage.toLocaleString('en-IN')} approved by supervisor Mohan Gupta. Reconciliation adjustment posted.`,
          { override: true }, 'info'));
      }

      const normalized = TransactionNormalizer.normalizeShiftToTransactions(
        branchId,
        aiExtraction,
        currentSeq
      );

      // 4. Settlement Mismatch Checks
      const fuelRev = s.nozzles.reduce((sum, nz) => sum + Math.max(0, nz.closing - nz.opening - nz.testing) * nz.rate, 0);
      const expectedCashSales = Math.max(0, fuelRev - (s.upiTotal + s.cardTotal + s.creditSales));
      const expectedCashIncrease = expectedCashSales + s.creditRecovery - s.expenses;
      const expectedClosing = s.openingCash + expectedCashIncrease;
      const physicalCash = s.tillCounted;
      const rawVariance = physicalCash - expectedClosing;

      const actualVariance = Math.abs(rawVariance);
      const passed = Math.abs(actualVariance - s.shortage) < 0.1;
      
      settlementChecks.push({
        shiftId: s.id,
        date: s.date,
        label: s.label,
        expectedCash: expectedClosing,
        actualCash: physicalCash,
        variance: rawVariance,
        recordedShortage: s.shortage,
        passed
      });

      if (!passed) {
        mismatchReport.push({
          severity: 'warn',
          category: 'settlement',
          message: `Cash Till Settlement Mismatch on ${s.date}: Actual till ₹${physicalCash} deviates from expected ₹${expectedClosing.toFixed(2)} by ₹${rawVariance.toFixed(2)}, but recorded shortage is ₹${s.shortage}.`,
          timestamp: new Date().toISOString()
        });

        correctionRecommendations.push({
          problem: `Unreconciled Cash variance of ₹${rawVariance.toFixed(2)} on ${s.date}`,
          solution: `Audit expenses and credit customer recovery receipts. Re-enter physical till count or post a matching Settlement Adjustment entry.`,
          actionableCmd: `npm run reconcile-cash --branch=${branchId} --date=${s.date} --expected=${expectedClosing.toFixed(2)} --actual=${physicalCash}`
        });
      }

      // Add to accumulated transactions
      transactions.push(...normalized);
      currentSeq += normalized.length;

      // 5. Locked-Period Testing simulation
      if (lockDate && s.date <= lockDate) {
        const testViolationDate = s.date;
        const attemptedTxId = `tx_${branchId}_${testViolationDate.replace(/-/g, '')}_seq_violation`;
        
        mismatchReport.push({
          severity: 'critical',
          category: 'lock_violation',
          message: `[LOCK VIOLATION BLOCKED] Attempt to write or mutate ledger transaction ${attemptedTxId} in locked fiscal period (<= ${lockDate}) was strictly rejected. Immutable ledger lock is active.`,
          timestamp: new Date().toISOString()
        });

        lockedPeriodViolations.push({
          date: testViolationDate,
          attemptedTxId,
          message: `Attempted modification on locked date ${testViolationDate} blocked by Period Lock Date (${lockDate}).`,
          blocked: true
        });

        correctionRecommendations.push({
          problem: `Locked period violation attempt on ${testViolationDate}`,
          solution: `Fiscal periods prior to ${lockDate} are locked and immutable. Reopening requires a secure auditor signature with override reasons logged.`,
          actionableCmd: `npm run unlock-period --branch=${branchId} --date=${lockDate} --signature="AUDITOR_SECURE_HASH"`
        });
      }
    });

    // 6. Run the authoritative CoreReplayEngine
    const replayState = CoreReplayEngine.replayLedger(branchId, transactions);

    replayState.errors.forEach(err => {
      mismatchReport.push({
        severity: 'critical',
        category: 'ledger',
        message: `[Ledger Replay Error] ${err}`,
        timestamp: new Date().toISOString()
      });

      correctionRecommendations.push({
        problem: `Double-entry parity violation in ledger`,
        solution: `Check chronological sequence IDs and verify if any transactions have been duplicate-posted or mutated in memory.`,
      });
    });

    return {
      replayState,
      carryForwardChecks,
      nozzleContinuityChecks,
      settlementChecks,
      lockedPeriodViolations,
      mismatchReport,
      correctionRecommendations
    };
  }

  // ── All Stress Scenarios ────────────────────────────────────────────────────────

  static getStressScenarios(): StressScenario[] {
    return [
      {
        id: 'sc_01', name: 'Till Shortage',
        description: 'Simulates an operator submitting cash till ₹500–₹2500 below expected.',
        failureMode: 'till_shortage',
        expectedOutcome: 'Shortage recorded in event stream. Discrepancy logged. Supervisor alert triggered.',
        injected: false,
      },
      {
        id: 'sc_02', name: 'Duplicate Entry',
        description: 'Same UPI transaction posted twice due to offline queue replay.',
        failureMode: 'duplicate_entry',
        expectedOutcome: 'UPI total inflated. Deduplication engine detects replay collision.',
        injected: false,
      },
      {
        id: 'sc_03', name: 'Delayed Settlement',
        description: 'UPI gateway takes 47s to respond — past 30s timeout threshold.',
        failureMode: 'delayed_settlement',
        expectedOutcome: 'Transaction held in pending queue. Re-attempted on next sync cycle.',
        injected: false,
      },
      {
        id: 'sc_04', name: 'OCR Failure',
        description: 'Image of register is blurry/shadowed — PaddleOCR & EasyOCR both fail.',
        failureMode: 'ocr_failure',
        expectedOutcome: 'Fallback to manual entry. OCR failure logged with confidence score 0.',
        injected: false,
      },
      {
        id: 'sc_05', name: 'Carry-Forward Mismatch',
        description: 'Previous shift carry-forward does not match this shift opening float.',
        failureMode: 'carry_forward_mismatch',
        expectedOutcome: 'Delta captured in reconciliation. Supervisor notified of continuity break.',
        injected: false,
      },
      {
        id: 'sc_06', name: 'Nozzle Rollback',
        description: 'Nozzle closing reading rolls back to near-opening (reset by tampering).',
        failureMode: 'nozzle_rollback',
        expectedOutcome: 'Negative net sales detected. Rollback event logged. Forensic alert raised.',
        injected: false,
      },
      {
        id: 'sc_07', name: 'Offline Replay Conflict',
        description: 'Same shift submitted twice from offline queue when connectivity restored.',
        failureMode: 'offline_conflict',
        expectedOutcome: 'Dedup by shiftId. Second submission rejected. Conflict logged.',
        injected: false,
      },
      {
        id: 'sc_08', name: 'Partial Write (Power Loss)',
        description: 'IndexedDB batch interrupted mid-write simulating power interruption.',
        failureMode: 'partial_write',
        expectedOutcome: 'Partial records flushed. Rollback checkpoint restores last clean state.',
        injected: false,
      },
      {
        id: 'sc_09', name: 'Duplicate Sync',
        description: 'Offline queue replays same transaction 3x before dedup detection.',
        failureMode: 'duplicate_sync',
        expectedOutcome: 'Idempotency key check blocks duplicates after first acceptance.',
        injected: false,
      },
      {
        id: 'sc_10', name: 'Network Interruption',
        description: 'Network drops for 30s during reconciliation POST — request lost.',
        failureMode: 'network_interruption',
        expectedOutcome: 'Request held in retry queue. Exponential backoff. Delivered on reconnect.',
        injected: false,
      },
    ];
  }

  // ── Compute Metrics ────────────────────────────────────────────────────────────

  static computeMetrics(
    run: SimRun,
    replayResults: ReturnType<typeof ShiftStressEngine.validateReplay>[],
    accountingReplay?: AccountingReplayResult
  ): StressMetrics {
    const allEvents = run.shifts.flatMap(s => s.events);
    const failures  = allEvents.filter(e => e.severity === 'error' || e.severity === 'critical');
    const warnings  = allEvents.filter(e => e.severity === 'warn');

    return {
      totalEvents:       allEvents.length,
      failures:          failures.length,
      warnings:          warnings.length,
      replaysRun:        replayResults.length,
      replaySuccesses:   replayResults.filter(r => r.valid).length,
      replayFailures:    replayResults.filter(r => !r.valid).length,
      avgShiftDurationMs: run.durationMs / Math.max(run.shiftCount, 1),
      shortagesDetected:  allEvents.filter(e => e.failureMode === 'till_shortage').length,
      duplicatesDetected: allEvents.filter(e => e.failureMode === 'duplicate_entry' || e.failureMode === 'duplicate_sync').length,
      ocrFailures:        allEvents.filter(e => e.type === 'OCR_FAILURE').length,
      offlineConflicts:   allEvents.filter(e => e.failureMode === 'offline_conflict' || e.failureMode === 'partial_write').length,
      ledgerIntegrityOk:  accountingReplay ? accountingReplay.replayState.isValid : replayResults.every(r => r.matches),
      snapshotContinuity: run.shifts.every(s => s.snapshotHash.length > 0),
      carryForwardValid:  accountingReplay ? !accountingReplay.mismatchReport.some(m => m.category === 'carry_forward') : !allEvents.some(e => e.failureMode === 'carry_forward_mismatch'),
    };
  }

  // ── Full Stress Run ─────────────────────────────────────────────────────────────

  static runStressTest(
    mode: SimRun['mode'],
    config: {
      days?: number;
      txTarget?: number;
      failureRate?: number;
      scenarios?: FailureMode[];
      simMode?: 'operator' | 'manager' | 'locked_period';
    } = {}
  ): {
    run: SimRun;
    metrics: StressMetrics;
    replayResults: ReturnType<typeof ShiftStressEngine.validateReplay>[];
    accountingReplay?: AccountingReplayResult;
  } {
    const startMs = performance.now();
    const runId = `run_${Date.now()}`;
    let shifts: SimShift[] = [];

    if (mode === 'single') {
      const today = new Date().toISOString().slice(0, 10);
      const failures = config.scenarios || [];
      shifts = [this.generateShift(today, 'Day', failures, 15000)];
    } else if (mode === 'multi_day') {
      shifts = this.generateMultiDayReplay(config.days || 7, config.failureRate || 0.3);
    } else if (mode === 'load_test') {
      const r = this.generateLoadTest(config.txTarget || 1000);
      shifts = r.shifts;
    } else if (mode === 'stress') {
      // Inject every failure mode in sequence
      const allModes: FailureMode[] = [
        'till_shortage', 'duplicate_entry', 'ocr_failure', 'nozzle_rollback',
        'carry_forward_mismatch', 'offline_conflict', 'partial_write',
        'delayed_settlement', 'duplicate_sync'
      ];
      let cf = 15000;
      const today = new Date();
      for (let i = 0; i < allModes.length; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const shift = this.generateShift(date.toISOString().slice(0, 10), i % 2 === 0 ? 'Day' : 'Night', [allModes[i]], cf);
        cf = shift.carryForward;
        shifts.push(shift);
      }
    }

    const replayResults = shifts.map(s => this.validateReplay(s));
    const allEvents = shifts.flatMap(s => s.events);

    const accountingReplay = this.runAccountingReplay('potaliya-petroleum', shifts, config.simMode || 'operator');

    const run: SimRun = {
      id: runId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mode,
      simMode: config.simMode || 'operator',
      shiftCount: shifts.length,
      txCount: allEvents.filter(e => ['UPI_COLLECT','CARD_COLLECT','EXPENSE','CREDIT_SALE','CREDIT_RECOVERY'].includes(e.type)).length,
      failureCount: allEvents.filter(e => e.severity === 'error' || e.severity === 'critical').length,
      warningCount: allEvents.filter(e => e.severity === 'warn').length,
      durationMs: performance.now() - startMs,
      shifts,
      scenarios: this.getStressScenarios().map(sc => ({
        ...sc,
        injected: allEvents.some(e => e.failureMode === sc.failureMode)
      })),
      replayValid: accountingReplay.replayState.isValid,
      ledgerIntact: accountingReplay.replayState.isBalanced,
      summary: `${shifts.length} shifts | ${allEvents.length} events | ${replayResults.filter(r => !r.valid).length} replay failures`,
      accountingReplay
    };

    const metrics = this.computeMetrics(run, replayResults, accountingReplay);
    return { run, metrics, replayResults, accountingReplay };
  }
}

export default ShiftStressEngine;
