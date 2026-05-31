import { ClientSyncQueue } from './client-sync-queue';
import { runAccountingTests } from '../../apps/cloud-backend/src/modules/accounting/accounting.spec';

async function runMasterTests() {
  console.log('======================================================================');
  console.log('         PETROOPS INTEGRATED SYSTEM-WIDE OPERATIONAL TEST SUITE       ');
  console.log('======================================================================\n');

  let passedTotal = 0;
  let failedTotal = 0;

  // Part 1: Ledger Accounting replay-safe tests
  const accountingRes = runAccountingTests();
  passedTotal += accountingRes.passed;
  failedTotal += accountingRes.failed;

  // Part 2: Offline Sync Engine client-side tests
  console.log('[Sync Engine Tests] Bootstrapping local mutation queue checks...');
  let syncPassed = 0;
  let syncFailed = 0;

  function assertSync(condition: boolean, message: string) {
    if (!condition) {
      syncFailed++;
      console.error(`  ❌ FAIL: ${message}`);
    } else {
      syncPassed++;
      console.log(`  ✅ PASS: ${message}`);
    }
  }

  // Test 1: Enqueue & Hash
  try {
    const queue = new ClientSyncQueue();
    const entry = queue.enqueue('Sale', 'INSERT', { litersSold: 25.5, amount: 2657.1 });
    
    assertSync(entry.uuid !== undefined, 'Generated unique UUID for offline transaction');
    assertSync(entry.checksum.length === 64, 'Calculated secure SHA-256 payload checksum signature');
    assertSync(queue.getPending().length === 1, 'Appended item successfully to pending queue');
  } catch (e: any) {
    syncFailed++;
    console.error(`  ❌ FAIL: Unexpected error during Sync Test 1: ${e.message}`);
  }

  // Test 2: Queue Clean
  try {
    const queue = new ClientSyncQueue();
    const entry1 = queue.enqueue('Sale', 'INSERT', { litersSold: 10.0 });
    const entry2 = queue.enqueue('DipReading', 'INSERT', { fuelLevelMm: 1200 });
    
    queue.clearIds([entry1.uuid]);
    const pending = queue.getPending();
    assertSync(pending.length === 1, 'Cleared completed items successfully');
    assertSync(pending[0].uuid === entry2.uuid, 'Retained the pending items correctly');
  } catch (e: any) {
    syncFailed++;
    console.error(`  ❌ FAIL: Unexpected error during Sync Test 2: ${e.message}`);
  }

  passedTotal += syncPassed;
  failedTotal += syncFailed;
  console.log(`[Sync Engine Tests] Summary: ${syncPassed} passed, ${syncFailed} failed.\n`);

  console.log('======================================================================');
  console.log(`  MASTER SUMMARY: ${passedTotal} Passed, ${failedTotal} Failed.`);
  console.log('======================================================================');

  if (failedTotal > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterTests();
