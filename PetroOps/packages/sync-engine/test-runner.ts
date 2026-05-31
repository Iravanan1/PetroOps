import { ClientSyncQueue } from './client-sync-queue';

async function runTests() {
  console.log('[Test Runner] Starting Sync Engine Integration tests...');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      testsFailed++;
      console.error(`  ❌ FAIL: ${message}`);
    } else {
      testsPassed++;
      console.log(`  ✅ PASS: ${message}`);
    }
  }

  // Test 1: Enqueue & Checksum
  try {
    const queue = new ClientSyncQueue();
    const payload = {
      shiftId: 'd664e5fa-14cb-4d43-9878-3a218fca8301',
      nozzleId: '57dbef1a-3a22-48cf-812e-9d2a3194bc02',
      litersSold: 25.5,
      pricePerLiter: 104.2,
      amount: 2657.1,
      paymentMethod: 'UPI',
      startTotalizer: 14820.5,
      endTotalizer: 14846.0
    };
    
    const entry = queue.enqueue('Sale', 'INSERT', payload);
    
    assert(entry.uuid !== undefined, 'Generated unique UUID for transaction');
    assert(entry.checksum.length === 64, 'Calculated secure SHA-256 payload signature');
    assert(queue.getPending().length === 1, 'Appended item successfully to pending queue');
    assert(queue.getPending()[0].payload.amount === 2657.1, 'Verified correct payload storage mapping');
  } catch (e: any) {
    testsFailed++;
    console.error(`  ❌ FAIL: Unexpected error during Test 1: ${e.message}`);
  }

  // Test 2: Clear Completed IDs
  try {
    const queue = new ClientSyncQueue();
    const entry1 = queue.enqueue('Sale', 'INSERT', { litersSold: 10.0 });
    const entry2 = queue.enqueue('DipReading', 'INSERT', { fuelLevelMm: 1200 });
    
    assert(queue.getPending().length === 2, 'Queued 2 telemetry elements successfully');
    
    queue.clearIds([entry1.uuid]);
    const pending = queue.getPending();
    assert(pending.length === 1, 'Cleared completed items successfully');
    assert(pending[0].uuid === entry2.uuid, 'Retained the pending items correctly');
  } catch (e: any) {
    testsFailed++;
    console.error(`  ❌ FAIL: Unexpected error during Test 2: ${e.message}`);
  }

  // Test 3: Clear All
  try {
    const queue = new ClientSyncQueue();
    queue.enqueue('Sale', 'INSERT', { litersSold: 10.0 });
    queue.enqueue('DipReading', 'INSERT', { fuelLevelMm: 1200 });
    
    assert(queue.getPending().length === 2, 'Queued 2 elements successfully');
    queue.clearQueue();
    assert(queue.getPending().length === 0, 'Cleared full queues successfully');
  } catch (e: any) {
    testsFailed++;
    console.error(`  ❌ FAIL: Unexpected error during Test 3: ${e.message}`);
  }

  console.log(`\n[Test Runner] Summary: ${testsPassed} passed, ${testsFailed} failed.`);
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
