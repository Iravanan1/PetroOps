import { ShiftRecord } from '../modules/shared/hooks/useReconciledShifts';
import { JournalService, LedgerService } from '../modules/shared/services/AccountingServices';
import { 
  IdempotencyService, 
  ConflictResolverService, 
  PeriodClosingService, 
  DisasterRecoveryService,
  VersionedShift
} from '../modules/shared/services/FinancialIntegrityEngine';

export interface TestSuiteResult {
  success: boolean;
  passedCount: number;
  failedCount: number;
  logs: string[];
}

export function runAutomatedIntegrityTests(): TestSuiteResult {
  const logs: string[] = [];
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passedCount++;
      logs.push(`✅ [PASSED] ${testName}`);
    } else {
      failedCount++;
      logs.push(`❌ [FAILED] ${testName}`);
    }
  }

  logs.push("Starting PumpAI ERP Financial Integrity Verification Test Suite...");

  // Mock Shift Record
  const mockShift: ShiftRecord = {
    id: "shift_test_001",
    pumpId: "potaliya-petroleum",
    shiftDate: "2026-05-18",
    shiftLabel: "Test Shift 18-May",
    status: "APPROVED",
    openingCash: 5000,
    actualCash: 6200,
    cardSales: 4500,
    upiSales: 8200,
    creditSales: 2100,
    creditRecovery: 1500,
    expenses: 300,
    cashShortage: 0,
    ocrConfidence: 95,
    aiConfidence: 98,
    readings: [
      { id: 1, fuel: 'HSD', opening: 1000, closing: 1200, testing: 5, rate: 92.30 }
    ],
    auditHistory: []
  };

  // Test 1: Journal Double-Entry Generation
  try {
    const txs = JournalService.generateJournal(mockShift);
    assert(txs.length > 0, "Journal generation creates ledger records");
    
    // Total Debit must match Total Credit inside our double-entry model
    const debitSum = txs.reduce((sum, t) => sum + (t.debitAccount ? t.amount : 0), 0);
    const creditSum = txs.reduce((sum, t) => sum + (t.creditAccount ? t.amount : 0), 0);
    assert(debitSum === creditSum, "Double-entry rules: debits match credits exactly");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 1 crashed: ${err.message}`);
  }

  // Test 2: Idempotency & Replay Attack Prevention
  try {
    IdempotencyService.clearRegistry();
    const txs = JournalService.generateJournal(mockShift);
    const singleTx = txs[0];

    const deduplicated = IdempotencyService.registerAndValidate(singleTx, "Vite Ingest");
    assert(deduplicated.deduplicationHash.length > 0, "Idempotency hash generated successfully");

    // Attempting to register the exact same transaction again must trigger a replay protection violation exception
    let duplicateCaught = false;
    try {
      IdempotencyService.registerAndValidate(singleTx, "Duplicate Ingest");
    } catch {
      duplicateCaught = true;
    }
    assert(duplicateCaught, "Replay prevention: Duplicate transaction register triggers protection violation error");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 2 crashed: ${err.message}`);
  }

  // Test 3: Optimistic Offline Conflict Resolution
  try {
    const localVersion: VersionedShift = {
      ...mockShift,
      version: 2,
      lastUpdatedBy: "Operator-03"
    };

    const serverVersion: VersionedShift = {
      ...mockShift,
      version: 3,
      actualCash: 6500, // Someone edited server cash till value
      lastUpdatedBy: "Manager-09"
    };

    const resolved = ConflictResolverService.reconcileOfflineSync(localVersion, serverVersion);
    assert(resolved.version === 4, "Offline sync: Version correctly incremented post merge");
    assert(resolved.actualCash === 6500, "Offline sync: Server-side latest cash edits successfully kept");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 3 crashed: ${err.message}`);
  }

  // Test 4: Financial Period Close locks
  try {
    PeriodClosingService.clearClosedPeriods();
    
    // Close Rajasthan NH-62 station monthly period for 2026-05
    PeriodClosingService.closePeriod("2026-05", "Auditor-Chief", 250000);
    
    // Period assert on an active shift inside 2026-05-18 should throw closed lock exception
    let closeViolationCaught = false;
    try {
      PeriodClosingService.assertPeriodOpen("2026-05-18");
    } catch {
      closeViolationCaught = true;
    }
    assert(closeViolationCaught, "Period locking: Re-editing closing summaries triggers closed block exception");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 4 crashed: ${err.message}`);
  }

  // Test 5: Disaster Recovery Rollbacks
  try {
    const activeList = [mockShift];
    const checkpoint = DisasterRecoveryService.createCheckpoint(activeList);
    assert(checkpoint.checkpointId.startsWith("chk_"), "DR Snapshot Checkpoint successfully initialized");

    const rolledBack = DisasterRecoveryService.rollbackToCheckpoint(checkpoint);
    assert(rolledBack[0].actualCash === 6200, "DR Rollback: Checkpoint snapshots restore historical states accurately");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 5 crashed: ${err.message}`);
  }

  // Test 6: Event-Sourced Monotonic Replays & Checksums
  try {
    const { JournalReplayEngine, DatabaseCorruptionScanner, EventSourcedTransaction } = require('../modules/shared/services/HardenedResilienceEngine');
    
    const events: any[] = [
      {
        transactionId: "evt_001",
        shiftId: "shift_test_001",
        timestamp: new Date().toISOString(),
        debitAccount: "Cash Till",
        creditAccount: "Fuel Revenue",
        amount: 12000,
        operatorId: "Op-01",
        status: "reconciled",
        schemaVersion: 1,
        sequenceId: 1,
        branchId: "potaliya-petroleum-Rajasthan"
      },
      {
        transactionId: "evt_002",
        shiftId: "shift_test_001",
        timestamp: new Date().toISOString(),
        debitAccount: "Expense Accounts",
        creditAccount: "Cash Till",
        amount: 2000,
        operatorId: "Op-01",
        status: "reconciled",
        schemaVersion: 1,
        sequenceId: 2,
        branchId: "potaliya-petroleum-Rajasthan"
      }
    ];

    // Add checksums
    events.forEach(evt => {
      evt.checksum = JournalReplayEngine.calculateChecksum(evt, evt.sequenceId, evt.branchId);
    });

    const sheet = JournalReplayEngine.replayJournal(events, "potaliya-petroleum-Rajasthan");
    assert(sheet.totalReplayedCount === 2, "Event Sourcing: 2 events successfully replayed");
    assert(sheet.balances["Cash Till"] === 10000, "Event Sourcing: Debits/Credits T-Account balance matches mathematically");

    // Scan for corruption
    const report = DatabaseCorruptionScanner.scanEvents(events);
    assert(report.isCorrupt === false, "Corruption Scanner: Undamaged append-only journals pass clean");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 6 crashed: ${err.message}`);
  }

  // Test 7: ERP Observability, SLIs, and Branch Health Scores
  try {
    const { HardenedObservabilityEngine } = require('../modules/shared/services/HardenedObservabilityEngine');

    // Check SLI Warning triggers
    const sli = HardenedObservabilityEngine.checkSLI("Firestore query latency", 600);
    assert(sli.status === "WARNING", "SLI Telemetry: High Firestore query latencies successfully trigger Warning alerts");

    // Evaluate branch health metrics
    const card = HardenedObservabilityEngine.evaluateBranchHealth("potaliya-petroleum-Rajasthan", 6, 82, 4);
    assert(card.score < 80, "Health Scoring: Degraded telemetry accurately impacts branch health card index");
    assert(card.reasons.length > 0, "Health Scoring: Correctly itemizes active operational alerts");
  } catch (err: any) {
    failedCount++;
    logs.push(`❌ [ERROR] Test 7 crashed: ${err.message}`);
  }

  const success = failedCount === 0;
  logs.push(`\nTest Verification Completed. Result: ${success ? "SUCCESS" : "FAILURE"} (${passedCount} passed, ${failedCount} failed)`);

  return {
    success,
    passedCount,
    failedCount,
    logs
  };
}
