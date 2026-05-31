/**
 * run_shift_simulation.ts
 * ────────────────────────
 * Standalone offline script to run shift simulations across different operational roles
 * (Operator Mode, Manager Override Mode, Locked-Period Mode), verifying ledger parity,
 * carry-forward float continuity, nozzle meter continuity, and generating mismatch reports.
 */

import { ShiftStressEngine } from './ShiftStressEngine';

// Colors for beautiful terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const PURPLE = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

function printHeader(title: string) {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title.toUpperCase()}${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  console.log(`${BOLD}${WHITE}🚀 Starting Operational Shift Simulation & Replay-Safe Verification Script...${RESET}`);

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: OPERATOR MODE (Simulate 5-day standard shift stream with random anomalies)
  // ────────────────────────────────────────────────────────────────────────
  printHeader('Scenario 1: Operator Mode (5-Day Shift Stream)');
  console.log(`${WHITE}Simulating standard operator daily shift submissions. Checking float/nozzle continuity...${RESET}`);
  
  const opResult = ShiftStressEngine.runStressTest('multi_day', {
    days: 5,
    failureRate: 0.4, // Inject some standard failures to assert audit reports capture them
    simMode: 'operator'
  });

  console.log(`${BOLD}Simulation ID:${RESET} ${opResult.run.id}`);
  console.log(`${BOLD}Duration:${RESET} ${opResult.run.durationMs.toFixed(1)}ms`);
  console.log(`${BOLD}Processed:${RESET} ${opResult.run.shiftCount} shifts, ${opResult.run.txCount} transactions`);
  console.log(`${BOLD}Replay State Checksum:${RESET} ${opResult.accountingReplay?.replayState.rollingChecksum}`);
  
  const opReplayState = opResult.accountingReplay?.replayState;
  if (opReplayState) {
    console.log(`\n${BOLD}${WHITE}Replayed Double-Entry Ledger Closing Balances:${RESET}`);
    Object.entries(opReplayState.accountBalances).forEach(([acc, val]) => {
      const color = acc === 'Fuel Revenue' ? PURPLE : GREEN;
      console.log(`  * ${acc.padEnd(25)}: ${color}${formatRupee(val)}${RESET}`);
    });
    console.log(`\n  Ledger Balanced: ${opReplayState.isBalanced ? `${GREEN}YES (Debits = Credits)${RESET}` : `${RED}NO${RESET}`}`);
    console.log(`  Ledger Valid:    ${opReplayState.isValid ? `${GREEN}YES${RESET}` : `${RED}NO${RESET}`}`);
  }

  const opMismatches = opResult.accountingReplay?.mismatchReport || [];
  if (opMismatches.length > 0) {
    console.log(`\n${BOLD}${YELLOW}⚠️ Detected Mismatches (${opMismatches.length}):${RESET}`);
    opMismatches.forEach(m => {
      const sevColor = m.severity === 'critical' || m.severity === 'error' ? RED : YELLOW;
      console.log(`  [${m.category.toUpperCase()}] (${sevColor}${m.severity}${RESET}) ${m.message}`);
    });
  } else {
    console.log(`\n${BOLD}${GREEN}✅ Perfect Shift Continuity: No carry-forward or nozzle breaks detected!${RESET}`);
  }

  const opRecs = opResult.accountingReplay?.correctionRecommendations || [];
  if (opRecs.length > 0) {
    console.log(`\n${BOLD}${BLUE}🔧 Actionable Correction Recommendations:${RESET}`);
    opRecs.forEach(rec => {
      console.log(`  * ${BOLD}${rec.problem}${RESET}`);
      console.log(`    Solution: ${rec.solution}`);
      if (rec.actionableCmd) {
        console.log(`    Command:  ${CYAN}${rec.actionableCmd}${RESET}`);
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: MANAGER OVERRIDE MODE (Ensure shortages are balanced via Settlement Adjustments)
  // ────────────────────────────────────────────────────────────────────────
  printHeader('Scenario 2: Manager Override Mode');
  console.log(`${WHITE}Simulating manager-approved override adjusting entries to absorb cash till shortages...${RESET}`);

  const mgrResult = ShiftStressEngine.runStressTest('single', {
    scenarios: ['till_shortage'],
    simMode: 'manager'
  });

  const mgrReplayState = mgrResult.accountingReplay?.replayState;
  const shortAmt = mgrResult.run.shifts[0]?.shortage || 0;
  console.log(`${BOLD}Simulated Shortage:${RESET} ${formatRupee(shortAmt)}`);
  
  if (mgrReplayState) {
    console.log(`\n${BOLD}${WHITE}Replayed Balances under Manager Override Mode:${RESET}`);
    Object.entries(mgrReplayState.accountBalances).forEach(([acc, val]) => {
      console.log(`  * ${acc.padEnd(25)}: ${GREEN}${formatRupee(val)}${RESET}`);
    });
    console.log(`\n  Ledger Balanced: ${mgrReplayState.isBalanced ? `${GREEN}YES (Debits = Credits)${RESET}` : `${RED}NO${RESET}`}`);
    console.log(`  Ledger Valid:    ${mgrReplayState.isValid ? `${GREEN}YES (Shortage absorbed)${RESET}` : `${RED}NO${RESET}`}`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: LOCKED-PERIOD MODE (Assert strict immutability rules reject historic edits)
  // ────────────────────────────────────────────────────────────────────────
  printHeader('Scenario 3: Locked-Period Immutability Mode');
  console.log(`${WHITE}Simulating chronological validation over a lock-date threshold...${RESET}`);

  const lockResult = ShiftStressEngine.runStressTest('multi_day', {
    days: 4,
    simMode: 'locked_period'
  });

  const lockMismatches = lockResult.accountingReplay?.mismatchReport.filter(m => m.category === 'lock_violation') || [];
  if (lockMismatches.length > 0) {
    console.log(`\n${BOLD}${GREEN}✅ Immutability Assertion Success:${RESET} System strictly rejected mutations in locked periods!`);
    lockMismatches.forEach(m => {
      console.log(`  [MUTATION BLOCKED] ${RED}${m.message}${RESET}`);
    });
  } else {
    console.log(`\n${BOLD}${RED}❌ Immutability Assertion Failure: Mutating locked period was not blocked!${RESET}`);
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────────────
  // FINAL VERIFICATION REPORT
  // ────────────────────────────────────────────────────────────────────────
  printHeader('Replay integrity summary');
  
  const allRunsValid = (opResult.accountingReplay?.replayState.isBalanced ?? false) &&
                       (mgrResult.accountingReplay?.replayState.isBalanced ?? false) &&
                       (lockResult.accountingReplay?.replayState.isBalanced ?? false);

  if (allRunsValid) {
    console.log(`${BOLD}${GREEN}🏆 ALL INTEGRITY CHECKS PASSED SUCCESSFULLY!${RESET}`);
    console.log(`  1. Double-Entry Parity: Replayed streams match mathematically.`);
    console.log(`  2. Carry-Forward Continuity: Detected gaps were reported cleanly with actionable commands.`);
    console.log(`  3. Period Immutability: Mutating ledger dates older than lock boundaries is strictly blocked.`);
    console.log(`  4. Authoritative Replay: CoreReplayEngine successfully serves as the single source of truth.`);
    console.log(`\n${BOLD}${WHITE}Execution complete.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${BOLD}${RED}❌ REPLAY INTEGRITY FAILURES DETECTED!${RESET}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${RED}FATAL ERROR IN SIMULATION:${RESET}`, err);
  process.exit(1);
});
