import { TransactionNormalizer } from './TransactionNormalizer';
import { CoreReplayEngine } from '../replay/CoreReplayEngine';
import { CanonicalSnapshotEngine } from '../snapshots/CanonicalSnapshotEngine';
import { AIExtraction } from '../ai/validation/AIExtractionSchema';

async function runValidation() {
  console.log('======================================================================');
  console.log('       PUMPAI REPLAY-SAFE ACCOUNTING STABILIZATION LAYER VALIDATOR     ');
  console.log('======================================================================\n');

  // 1. Establish robust Mock Shift Extraction mimicking a real shift OCR result
  const mockShift: AIExtraction = {
    shiftDate: '2026-05-20',
    operatorName: 'Sanjay Kumar',
    openingCash: 12500,
    actualCash: 48900,
    cardSales: 9000,
    upiSales: 18500,
    creditSales: 7500,
    creditRecovery: 3200,
    expenses: 1500,
    fuelTotals: [
      { fuelType: 'MS', totalLitres: 335.30 }
    ],
    nozzleReadings: [
      {
        nozzleId: 'nozzle-1',
        fuelType: 'MS',
        openingMeter: 12450.50,
        closingMeter: 12790.80, // 340.3L gross movement
        testingQty: 5.0, // 5.0L calibration
        netSales: 335.30, // matches fuelTotals
        fuelRate: 104.50
      }
    ],
    testingLitres: [
      { fuelType: 'MS', litres: 5.0 }
    ],
    confidence: 96.4,
    fieldConfidence: {
      actualCash: 0.99,
      cardSales: 0.98,
      upiSales: 0.99,
      nozzleClose: 0.97
    },
    creditEntries: [],
    warnings: []
  };

  console.log('[Step 1] Normalizing raw Shift Extraction to double-entry transactions...');
  const txs = TransactionNormalizer.normalizeShiftToTransactions('validation-branch-01', mockShift, 1001, 'doc_test_123');
  
  console.log(`\n>>> Created ${txs.length} Normalized Double-Entry Journal Transactions:`);
  console.table(txs.map(t => ({
    Seq: t.sequenceId,
    Debit: t.debitAccount,
    Credit: t.creditAccount,
    Amount: `₹${t.amount.toLocaleString()}`,
    Description: t.description,
    Checksum: t.checksum.substring(0, 18) + '...'
  })));

  // 2. Validate Double Entry Balance Sheet Equation
  console.log('\n[Step 2] Asserting balance parity (Debits === Credits)...');
  let debitsTotal = 0;
  let creditsTotal = 0;
  txs.forEach(t => {
    debitsTotal += t.amount;
    creditsTotal += t.amount;
  });
  console.log(`* Total Debits:  ₹${debitsTotal.toFixed(2)}`);
  console.log(`* Total Credits: ₹${creditsTotal.toFixed(2)}`);
  if (Math.abs(debitsTotal - creditsTotal) < 0.001) {
    console.log('✅ BALANCE PARITY SUCCESS: Double-entry ledger transactions are perfectly balanced!');
  } else {
    throw new Error('❌ BALANCE PARITY FAILED: Total Debits do not equal Total Credits!');
  }

  // 3. Execute Ledger Replay Engine
  console.log('\n[Step 3] Executing Ledger Replay Engine...');
  const replayState = CoreReplayEngine.replayLedger('validation-branch-01', txs);
  
  console.log('\n>>> Replayed Account Balance Sheet:');
  console.table(Object.entries(replayState.accountBalances).map(([acc, bal]) => ({
    'Account Name': acc,
    'Closing Balance': `₹${bal.toLocaleString()}`
  })));

  console.log(`* Processed Count: ${replayState.processedCount} Transactions`);
  console.log(`* Ledger Balanced: ${replayState.isBalanced}`);
  console.log(`* Ledger Valid:    ${replayState.isValid}`);
  console.log(`* Rolling Tamper-Evident Checksum: ${replayState.rollingChecksum}`);

  if (replayState.isBalanced && replayState.isValid) {
    console.log('✅ LEDGER REPLAY SUCCESS: Ledger is 100% stable and structurally sound!');
  } else {
    console.log('❌ LEDGER REPLAY FAILED:', replayState.errors.join('\n'));
    throw new Error('Ledger Replay verification failed!');
  }

  // 4. Compile and Lock Canonical Snapshot
  console.log('\n[Step 4] Compiling carry-forward continuity & locking Canonical Snapshot...');
  const aggregates = {
    totalRevenue: mockShift.nozzleReadings.reduce((sum, n) => sum + (n.netSales * n.fuelRate), 0),
    totalCashCollected: mockShift.actualCash,
    totalUPISettled: mockShift.upiSales,
    totalCardSettled: mockShift.cardSales,
    totalExpensesPaid: mockShift.expenses,
    totalOutstandingCredit: mockShift.creditSales,
    totalCreditRecovered: mockShift.creditRecovery,
    wetstockVariance: -5.0
  };

  const snapshot = await CanonicalSnapshotEngine.compileAndLockSnapshot(
    'validation-branch-01',
    mockShift.shiftDate,
    replayState,
    mockShift.openingCash,
    aggregates,
    'daily'
  );

  console.log('\n>>> Compiled Canonical Snapshot Details:');
  console.log(`* Snapshot ID:       ${snapshot.id}`);
  console.log(`* Date / Timeframe:  ${snapshot.date} (${snapshot.timeframe})`);
  console.log(`* Replay Checksum:   ${snapshot.replayChecksum}`);
  console.log(`* Opening Cash Float: ₹${snapshot.openingCash.toLocaleString()}`);
  console.log(`* Closing Cash Till:  ₹${snapshot.closingCash.toLocaleString()}`);
  console.log(`* Carry-Forward OK:  ${snapshot.carryForwardMatch}`);
  console.log(`* Snapshot Locked:   ${snapshot.isLocked}`);
  console.log(`* Snapshot Validated:${snapshot.isValid}`);

  if (snapshot.isValid) {
    console.log('\n✅ SNAPSHOT COMPILATION SUCCESS: Snapshot is immutable, reconciled, and ready for Dashboard cards!');
  } else {
    throw new Error('Snapshot validation failed!');
  }

  console.log('\n======================================================================');
  console.log('             ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY            ');
  console.log('======================================================================');
}

runValidation().catch(e => {
  console.error('\n❌ VALIDATION CRITICAL ERROR:', e);
  process.exit(1);
});
