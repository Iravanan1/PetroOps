import { LedgerVerifierService, JournalEntry } from './ledger-verifier.service';

export function runAccountingTests() {
  console.log('[Accounting Tests] Bootstrapping ledger replay verifier suite...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      failed++;
      console.error(`  ❌ FAIL: ${message}`);
    } else {
      passed++;
      console.log(`  ✅ PASS: ${message}`);
    }
  }

  const verifier = new LedgerVerifierService(null as any); // Prisma is not needed for pure function replaying

  // Test 1: Successful Replay of Uncorrupted Ledgers
  try {
    const entries: JournalEntry[] = [
      { sequenceNo: 1, accountDebit: 'CASH', accountCredit: 'SALES', amount: 1200.00, prevHash: 'GENESIS_HASH_PETROOPS' },
      { 
        sequenceNo: 2, 
        accountDebit: 'BANK', 
        accountCredit: 'CASH', 
        amount: 800.00, 
        prevHash: 'd2d64a5113d07e60228362ea70024479e0a05a8d9a15b395d820c74f51e9a2d8' // Simulated valid hash 1
      }
    ];

    // Compute expected correct hashes dynamically to ensure valid comparison
    const crypto = require('crypto');
    let hash1 = 'GENESIS_HASH_PETROOPS';
    
    // Hash 1
    let sha = crypto.createHash('sha256');
    sha.update(`tenant-01:1:CASH:SALES:1200:${hash1}`);
    hash1 = sha.digest('hex');
    entries[0].prevHash = 'GENESIS_HASH_PETROOPS';

    // Hash 2
    entries[1].prevHash = hash1;
    sha = crypto.createHash('sha256');
    sha.update(`tenant-01:2:BANK:CASH:800:${hash1}`);
    const hash2 = sha.digest('hex');

    const res = verifier.verifyAndReplayLedger('tenant-01', entries);
    
    assert(res.isValid === true, 'Successfully verified clean double-entry ledger sequence');
    assert(res.verifiedRunningHash === hash2, 'Verified correct final running hash value');
    assert(res.tamperedSequenceIndices.length === 0, 'No tampered sequence indices recorded');
  } catch (e: any) {
    failed++;
    console.error(`  ❌ FAIL: Unexpected error during Test 1: ${e.message}`);
  }

  // Test 2: Detection of retroactively modified transactions
  try {
    const entries: JournalEntry[] = [
      { sequenceNo: 1, accountDebit: 'CASH', accountCredit: 'SALES', amount: 1200.00, prevHash: 'GENESIS_HASH_PETROOPS' },
      { sequenceNo: 2, accountDebit: 'BANK', accountCredit: 'CASH', amount: 800.00, prevHash: 'TAMPERED_PREV_HASH' }
    ];

    const res = verifier.verifyAndReplayLedger('tenant-01', entries);
    
    assert(res.isValid === false, 'Successfully flagged modified transaction sequence as invalid');
    assert(res.failedIndex === 1, 'Correctly flagged the index of the first failed transaction');
    assert(res.tamperedSequenceIndices.includes(2), 'Correctly recorded the sequence index of the modified entry');
  } catch (e: any) {
    failed++;
    console.error(`  ❌ FAIL: Unexpected error during Test 2: ${e.message}`);
  }

  console.log(`[Accounting Tests] Summary: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}
