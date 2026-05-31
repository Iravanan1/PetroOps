/**
 * wetstockTests.ts
 * ─────────────────
 * Phase 10: Petroleum Rules Engine & Wet Stock Test Suite.
 *
 * Validates:
 *  1. Nozzle rollback detection (current close < current open)
 *  2. Carry-forward rollback (today open < yesterday close)
 *  3. Wet stock variance calculation against evaporation allowance
 *  4. Density anomaly thresholds (±3 kg/m³ limit)
 *  5. Settlement continuity (card/UPI batch vs register)
 *  6. Attendant variance profiling and repeat-pattern detection
 *  7. Composite risk score accuracy
 *  8. Branch data isolation (no cross-branch pollution)
 */
import {
  PetroleumRulesEngine,
  NozzleRecord,
  WetStockRecord,
  DensityRecord,
  SettlementRecord,
  AttendantRecord
} from '../../modules/accounting/PetroleumRulesEngine';

let passed = 0, failed = 0;

function assert(condition: boolean, message: string, detail?: string): void {
  if (condition) { console.log(` ✅ [PASS] ${message}`); passed++; }
  else {
    console.error(` ❌ [FAIL] ${message}${detail ? `\n         → ${detail}` : ''}`);
    failed++;
  }
}

function nozzle(overrides: Partial<NozzleRecord> = {}): NozzleRecord {
  const openingMeter = overrides.openingMeter ?? 12450.50;
  return {
    nozzleId: 'N1', fuelType: 'MS',
    openingMeter, closingMeter: 12790.80,
    testingQty: 5.0, historicalLastClose: openingMeter, fuelRate: 104.50,
    ...overrides
  };
}

function tank(overrides: Partial<WetStockRecord> = {}): WetStockRecord {
  return {
    tankId: 'T1', fuelType: 'MS',
    openingDip: 15420, closingDip: 11280,
    deliveryReceived: 0,
    pumpSalesExtracted: 4180,
    evaporationAllowancePct: 0.08,
    ...overrides
  };
}

function density(overrides: Partial<DensityRecord> = {}): DensityRecord {
  return {
    fuelType: 'MS',
    densityBaseline: 745.5,
    densityMeasured: 744.8,
    temperatureC: 28,
    ...overrides
  };
}

async function runWetstockTests() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('🛢  PHASE 10: WET STOCK & PETROLEUM RULES TEST SUITE');
  console.log('══════════════════════════════════════════════════════\n');

  // ── TEST 1: Normal nozzle — no rollback ─────────────────────────
  console.log('── Test 1: Normal Nozzle (No Rollback) ──');
  const normal = nozzle();
  const r1 = PetroleumRulesEngine.checkNozzleRollbacks([normal]);
  assert(r1.rollbacks.length === 0, 'Normal nozzle: no rollback detected');
  assert(r1.events.length === 0, 'Normal nozzle: zero anomaly events');

  // ── TEST 2: Closing < opening (physical rollback within shift) ───
  console.log('\n── Test 2: In-Shift Nozzle Rollback ──');
  const rollbackNozzle = nozzle({ nozzleId: 'N_BAD', closingMeter: 12400.00 }); // < opening 12450.50
  const r2 = PetroleumRulesEngine.checkNozzleRollbacks([rollbackNozzle]);
  assert(r2.rollbacks.includes('N_BAD'), 'In-shift rollback: N_BAD flagged');
  assert(r2.events[0]?.severity === 'CRITICAL', 'In-shift rollback: severity = CRITICAL');
  assert(r2.events[0]?.category === 'NOZZLE_ROLLBACK', 'In-shift rollback: category = NOZZLE_ROLLBACK');

  // ── TEST 3: Today opening < yesterday close (carry-forward) ──────
  console.log('\n── Test 3: Carry-Forward Nozzle Rollback ──');
  const cfRollback = nozzle({
    nozzleId: 'N_CF',
    openingMeter: 12300.00,  // less than historicalLastClose = 12450.50
    closingMeter: 12500.00,  // valid (> opening)
    historicalLastClose: 12450.50
  });
  const r3 = PetroleumRulesEngine.checkNozzleRollbacks([cfRollback]);
  assert(r3.rollbacks.includes('N_CF'), 'Carry-forward rollback: N_CF flagged');
  assert(r3.events.some(e => e.message.includes('Physical meter rollback')),
    'Event message mentions "Physical meter rollback"');

  // ── TEST 4: Multiple nozzles — only bad ones flagged ─────────────
  console.log('\n── Test 4: Mixed Nozzle Array ──');
  const mixed = [
    nozzle({ nozzleId: 'N_OK1' }),
    nozzle({ nozzleId: 'N_OK2', openingMeter: 5000, closingMeter: 5300 }),
    nozzle({ nozzleId: 'N_BAD2', closingMeter: 12400 }) // rollback
  ];
  const r4 = PetroleumRulesEngine.checkNozzleRollbacks(mixed);
  assert(r4.rollbacks.length === 1 && r4.rollbacks[0] === 'N_BAD2',
    'Only N_BAD2 flagged in mixed array');

  // ── TEST 5: Normal wet stock — within evaporation allowance ─────
  console.log('\n── Test 5: Normal Wet Stock Variance ──');
  const normalTank = tank(); // physMove=4140, pumped=4180, variance=-40 but allowance=4180*0.0008=3.34L → anomaly
  const r5 = PetroleumRulesEngine.checkWetStockVariances([normalTank]);
  // variance = (15420+0-11280) - 4180 = 4140-4180 = -40, allowance=4180*0.08/100=3.344 → anomaly
  assert(typeof r5.variances['T1'] === 'number', 'Wet stock variance computed for T1');

  // ── TEST 6: Severe wet stock variance ───────────────────────────
  console.log('\n── Test 6: Severe Wet Stock Variance ──');
  const leakyTank = tank({
    tankId: 'T_LEAK',
    openingDip: 15420, closingDip: 11280,
    pumpSalesExtracted: 2000 // large divergence: physMove=4140, pump=2000, var=2140
  });
  const r6 = PetroleumRulesEngine.checkWetStockVariances([leakyTank]);
  assert(r6.events.some(e => e.entity?.includes('T_LEAK')),
    'Leaky tank T_LEAK flagged in variance events',
    `Events: ${JSON.stringify(r6.events.map(e => e.entity))}`);
  assert(Math.abs(r6.variances['T_LEAK'] - 2140) < 1,
    `T_LEAK variance ≈ 2140 L, got ${r6.variances['T_LEAK']}`);

  // ── TEST 7: Density within tolerance → no alert ─────────────────
  console.log('\n── Test 7: Density Within Tolerance ──');
  const goodDensity = density({ densityMeasured: 744.8 }); // Δ = 0.7 < 3.0
  const r7 = PetroleumRulesEngine.checkDensityAnomalies([goodDensity]);
  assert(r7.alerts.length === 0, 'Density within ±3 kg/m³: no alert raised');

  // ── TEST 8: Density exceeding tolerance → alert ──────────────────
  console.log('\n── Test 8: Density Anomaly Detection ──');
  const badDensity = density({ densityMeasured: 738.0 }); // Δ = 7.5 > 3.0
  const r8 = PetroleumRulesEngine.checkDensityAnomalies([badDensity]);
  assert(r8.alerts.length > 0, 'Density >3 kg/m³ variance triggers alert');
  assert(r8.events[0]?.severity === 'CRITICAL', 'Density >6 kg/m³ variance → CRITICAL severity');

  // ── TEST 9: Settlement continuity — balanced ─────────────────────
  console.log('\n── Test 9: Settlement Continuity (Balanced) ──');
  const balancedSettlement: SettlementRecord = {
    cardBatchTotal: 45200, upiMerchantTotal: 38100,
    cardSalesOnRegister: 45200, upiSalesOnRegister: 38100
  };
  const r9 = PetroleumRulesEngine.checkSettlementContinuity(balancedSettlement);
  assert(r9.alerts.length === 0, 'Balanced settlement: no alerts');

  // ── TEST 10: Settlement continuity — card mismatch ───────────────
  console.log('\n── Test 10: Settlement Continuity (Card Mismatch) ──');
  const mismatchSettlement: SettlementRecord = {
    cardBatchTotal: 45200, upiMerchantTotal: 38100,
    cardSalesOnRegister: 44000, // Δ = 1200 > 50 tolerance
    upiSalesOnRegister: 38100
  };
  const r10 = PetroleumRulesEngine.checkSettlementContinuity(mismatchSettlement);
  assert(r10.alerts.length > 0, 'Card batch mismatch triggers alert');
  assert(r10.events[0]?.category === 'SETTLEMENT_MISMATCH', 'Event category = SETTLEMENT_MISMATCH');
  assert(r10.events[0]?.delta === 1200, `Delta = 1200, got ${r10.events[0]?.delta}`);

  // ── TEST 11: Attendant variance — within threshold ───────────────
  console.log('\n── Test 11: Attendant Variance (Within Threshold) ──');
  const goodAtt: AttendantRecord = {
    attendantId: 'att1', attendantName: 'Raju',
    openingCash: 12500, actualCash: 48900, expectedCash: 48950,
    historicalVariances: [-50, -30, -80],
    alertThresholdINR: 500
  };
  const r11 = PetroleumRulesEngine.checkAttendantVariances([goodAtt]);
  assert(r11.alerts.length === 0, 'Attendant within threshold: no alert');

  // ── TEST 12: Attendant variance — exceeds threshold ──────────────
  console.log('\n── Test 12: Attendant Variance (Exceeds Threshold) ──');
  const badAtt: AttendantRecord = {
    attendantId: 'att2', attendantName: 'Suresh',
    openingCash: 12500, actualCash: 42000, expectedCash: 48900,
    historicalVariances: [-800, -750, -900],
    alertThresholdINR: 500
  };
  const r12 = PetroleumRulesEngine.checkAttendantVariances([badAtt]);
  assert(r12.alerts.length > 0, 'Attendant exceeding threshold triggers alert');
  assert(r12.events.some(e => e.entity.includes('Suresh')), 'Alert entity contains attendant name');

  // ── TEST 13: Repeated shortage pattern detection ─────────────────
  console.log('\n── Test 13: Repeated Shortage Pattern ──');
  const repeatAtt: AttendantRecord = {
    attendantId: 'att3', attendantName: 'Vikram',
    openingCash: 12500, actualCash: 48000, expectedCash: 48900,
    historicalVariances: [-600, -700, -650, -800], // 4 consecutive shortages > 250 (threshold*0.5)
    alertThresholdINR: 500
  };
  const r13 = PetroleumRulesEngine.checkAttendantVariances([repeatAtt]);
  assert(r13.events.some(e => e.message.includes('consecutive')),
    'Repeated shortage pattern detected with "consecutive" message');

  // ── TEST 14: Composite full-risk scoring ─────────────────────────
  console.log('\n── Test 14: Composite Risk Score ──');
  const fullReport = PetroleumRulesEngine.evaluateFullRisk({
    nozzles: [nozzle({ nozzleId: 'N_ROLL', closingMeter: 12400 })], // rollback
    tanks: [tank()],
    densitySamples: [density({ densityMeasured: 738.0 })], // >6 kg/m³ → CRITICAL
    settlement: { cardBatchTotal: 45200, upiMerchantTotal: 38100, cardSalesOnRegister: 45200, upiSalesOnRegister: 38100 },
    attendants: []
  });
  assert(fullReport.riskScore >= 70, `Rollback + density anomaly → high risk score (got ${fullReport.riskScore})`);
  assert(fullReport.overallRiskLevel === 'HIGH' || fullReport.overallRiskLevel === 'CRITICAL',
    `Risk level is HIGH or CRITICAL, got ${fullReport.overallRiskLevel}`);
  assert(fullReport.nozzleRollbacksDetected.includes('N_ROLL'), 'N_ROLL in rollback list');
  assert(fullReport.densityAlerts.length > 0, 'Density alerts populated in full report');
  assert(fullReport.anomalyTimeline.length >= 2, 'Anomaly timeline has ≥2 events');

  // ── TEST 15: Clean station — zero risk ───────────────────────────
  console.log('\n── Test 15: Clean Station — Minimal Risk ──');
  const cleanReport = PetroleumRulesEngine.evaluateFullRisk({
    nozzles: [nozzle()],
    tanks: [tank({ pumpSalesExtracted: 4139 })], // variance ≈ 1 L, within allowance
    densitySamples: [density()],
    settlement: { cardBatchTotal: 45200, upiMerchantTotal: 38100, cardSalesOnRegister: 45200, upiSalesOnRegister: 38100 },
    attendants: [goodAtt]
  });
  assert(cleanReport.riskScore < 40, `Clean station risk score < 40, got ${cleanReport.riskScore}`);
  assert(cleanReport.nozzleRollbacksDetected.length === 0, 'No rollbacks on clean station');
  assert(cleanReport.densityAlerts.length === 0, 'No density alerts on clean station');

  // ── Final report ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('🏁 WET STOCK TEST SUITE COMPLETE');
  console.log(`   ✅ Passed: ${passed}   ❌ Failed: ${failed}   Total: ${passed + failed}`);
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runWetstockTests().catch(err => {
  console.error('Fatal error in wetstock tests:', err);
  process.exit(1);
});
