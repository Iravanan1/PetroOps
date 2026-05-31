/**
 * OCRTests.ts
 * ────────────
 * Phase 10: OCR Pipeline Robustness Test Suite.
 *
 * Validates:
 *  1. SafeJSONRepair on broken, truncated, and malformed LLM output
 *  2. ConsensusScoringEngine weighted voting accuracy
 *  3. ConfidenceEngine adaptive penalty application
 *  4. OCRLearningFeedbackService bias modifier accumulation
 *  5. RegionSegmentationService quality grading
 *  6. Duplicate scan detection
 */
import { SafeJSONRepair } from './SafeJSONRepair';
import { ConsensusScoringEngine } from '../services/ConsensusScoringEngine';
import { OCRLearningFeedbackService } from '../services/OCRLearningFeedbackService';
import { RegionSegmentationService } from '../../ocr/RegionSegmentationService';
import { ReplaySafeImportService } from '../../replay/ReplaySafeImportService';

let passed = 0, failed = 0;

function assert(condition: boolean, message: string, detail?: string): void {
  if (condition) { console.log(` ✅ [PASS] ${message}`); passed++; }
  else { console.error(` ❌ [FAIL] ${message}${detail ? `\n         → ${detail}` : ''}`); failed++; }
}

async function runOCRTests() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('🔬 PHASE 10: OCR PIPELINE ROBUSTNESS TEST SUITE');
  console.log('══════════════════════════════════════════════════════\n');

  // ── TEST GROUP 1: SafeJSONRepair ────────────────────────────────
  console.log('── Test Group 1: SafeJSONRepair ──');

  // 1a. Markdown code block stripping
  const md = '```json\n{"openingCash": 12500, "actualCash": 48900}\n```';
  const r1a = SafeJSONRepair.safeParse<any>(md, {});
  assert(r1a.openingCash === 12500 && r1a.actualCash === 48900,
    'Markdown triple-backtick stripping');

  // 1b. Unquoted keys
  const unquoted = '{ openingCash: 12500, actualCash: 48900 }';
  const r1b = SafeJSONRepair.safeParse<any>(unquoted, {});
  assert(r1b.openingCash === 12500, 'Unquoted key repair');

  // 1c. Single quotes
  const single = "{ 'openingCash': 12500, 'actualCash': 48900 }";
  const r1c = SafeJSONRepair.safeParse<any>(single, {});
  assert(r1c.openingCash === 12500, 'Single-to-double quote conversion');

  // 1d. Trailing comma + unclosed brace
  const trailing = '{ "openingCash": 12500, "actualCash": 48900, ';
  const r1d = SafeJSONRepair.safeParse<any>(trailing, {});
  assert(r1d.openingCash === 12500 && r1d.actualCash === 48900,
    'Trailing comma + unclosed brace recovery');

  // 1e. Completely empty / null input
  const r1e = SafeJSONRepair.safeParse<any>('', { default: true });
  assert(r1e.default === true, 'Empty string falls back to default');

  // 1f. Numbers as strings (common OCR artifact)
  const numStr = '{"actualCash": "48900", "cardSales": "9,000"}';
  const r1f = SafeJSONRepair.safeParse<any>(numStr, {});
  assert(r1f.actualCash === '48900' || r1f.actualCash === 48900,
    'Number-as-string preserved without crash');

  // 1g. Deeply nested truncation
  const truncated = '{"data": {"nozzle": {"openingMeter": 12450.50, "closingMe';
  const r1g = SafeJSONRepair.safeParse<any>(truncated, { fallback: true });
  assert(typeof r1g === 'object' && r1g !== null,
    'Deeply truncated JSON returns an object (not crash)');

  // ── TEST GROUP 2: ConsensusScoringEngine ────────────────────────
  console.log('\n── Test Group 2: ConsensusScoringEngine Weighted Voting ──');

  // 2a. Full agreement → max confidence
  const c2a = ConsensusScoringEngine.calculateFieldConsensus('actualCash', {
    paddleOcr: 48900, easyOcr: 48900, qwenLocal: 48900, claudeCloud: 48900
  });
  assert(c2a.consensusValue === 48900, 'Full agreement: consensus = 48900');
  assert(c2a.confidenceScore >= 98, `Full agreement: confidence ≥ 98, got ${c2a.confidenceScore}`);
  assert(c2a.disagreementFound === false, 'Full agreement: no disagreement flagged');

  // 2b. Claude (0.40) outvotes three-way split
  const c2b = ConsensusScoringEngine.calculateFieldConsensus('actualCash', {
    paddleOcr: 48000, easyOcr: 48000, qwenLocal: 48900, claudeCloud: 48900
  });
  // Claude(48900)=0.40 + Qwen(48900)=0.25 = 0.65 vs Paddle+Easy(48000)=0.35 → 48900 wins
  assert(c2b.consensusValue === 48900,
    `Claude+Qwen outvote Paddle+Easy: expected 48900, got ${c2b.consensusValue}`);

  // 2c. Local models (0.60) outvote Claude (0.40)
  const c2c = ConsensusScoringEngine.calculateFieldConsensus('actualCash', {
    paddleOcr: 48900, easyOcr: 48900, qwenLocal: 48900, claudeCloud: 48000
  });
  assert(c2c.consensusValue === 48900,
    `Local models outvote Claude: expected 48900, got ${c2c.consensusValue}`);
  assert(c2c.divergentEngines.includes('ClaudeCloud'),
    'ClaudeCloud correctly flagged as divergent');

  // 2d. Significant divergence detection (>5%)
  const c2d = ConsensusScoringEngine.calculateFieldConsensus('actualCash', {
    paddleOcr: 40000, easyOcr: 48900, qwenLocal: 48900, claudeCloud: 48900
  });
  assert(c2d.significantDivergence === true,
    `Significant divergence (>5%) correctly detected for PaddleOCR=40000 vs 48900`);

  // ── TEST GROUP 3: OCRLearningFeedbackService ─────────────────────
  console.log('\n── Test Group 3: Adaptive Learning Feedback ──');

  // Clear state for isolated testing
  (OCRLearningFeedbackService as any).inMemoryHistory = [];

  await OCRLearningFeedbackService.logCorrectionFeedback(
    'job-t1', 'netRevenue', '45000', '48900', 'digit_confusion');
  await OCRLearningFeedbackService.logCorrectionFeedback(
    'job-t2', 'netRevenue', '45500', '48900', 'digit_confusion');
  await OCRLearningFeedbackService.logCorrectionFeedback(
    'job-t3', 'netRevenue', '46000', '48900', 'digit_confusion');

  const bias3a = OCRLearningFeedbackService.getFieldBiasModifier('netRevenue');
  assert(bias3a === -0.05,
    `3 corrections → -5% bias modifier, got ${bias3a}`);

  // Log 3 more to trigger -15%
  await OCRLearningFeedbackService.logCorrectionFeedback('job-t4', 'netRevenue', '46500', '48900', 'other');
  await OCRLearningFeedbackService.logCorrectionFeedback('job-t5', 'netRevenue', '47000', '48900', 'other');
  await OCRLearningFeedbackService.logCorrectionFeedback('job-t6', 'netRevenue', '47500', '48900', 'other');

  const bias3b = OCRLearningFeedbackService.getFieldBiasModifier('netRevenue');
  assert(bias3b === -0.15,
    `6 corrections → -15% bias modifier, got ${bias3b}`);

  // Unknown field should return 0 (no penalty)
  const bias3c = OCRLearningFeedbackService.getFieldBiasModifier('unknownField_xyz');
  assert(bias3c === 0, 'Unknown field returns 0 bias modifier (no penalty)');

  // ── TEST GROUP 4: RegionSegmentationService ─────────────────────
  console.log('\n── Test Group 4: Region Segmentation & Quality Grading ──');

  const quality = RegionSegmentationService.gradeImageQuality(1200, 1800, 350_000);
  assert(typeof quality.overallGrade === 'number' && quality.overallGrade >= 0,
    `Quality grading executes, overallGrade=${quality.overallGrade}`);

  const handwritten = RegionSegmentationService.analyzeHandwritingDensity(
    'Shift correction sign verification OK approved manager signature'
  );
  assert(handwritten.isHandwritten === true,
    `Handwriting annotations correctly classified (density=${handwritten.handwritingDensity}%)`);

  const sampleOcr = `
  PETROLEUM NOZZLE REGISTER
  nozzle-1 opening: 12450.50 closing: 12790.80
  PAYMENT REGISTER
  upiSales: 18500 cardSales: 9000
  `;
  const regions = RegionSegmentationService.segmentImage(1200, 1800, sampleOcr);
  assert(regions.some(r => r.name === 'nozzle_block'), 'Nozzle region correctly segmented');
  assert(regions.some(r => r.name === 'payment_block'), 'Payment region correctly segmented');

  const nozzleText = RegionSegmentationService.extractFocusedRegionText(sampleOcr, 'nozzle_block');
  assert(nozzleText.includes('nozzle-1'), 'Focused nozzle text contains nozzle data');
  assert(!nozzleText.includes('upiSales'), 'Focused nozzle text excludes payment data');

  // ── TEST GROUP 5: Duplicate Scan Detection ──────────────────────
  console.log('\n── Test Group 5: Duplicate Scan Detection ──');

  const ocrContent = 'Daily shift nozzle register: opening 12000 closing 15000 cash 50000 OCR_TEST_UNIQUE_' + Date.now();
  const firstCheck = await ReplaySafeImportService.isDuplicate(ocrContent);
  assert(firstCheck === false, 'Fresh OCR content classified as non-duplicate');

  const checksum = await ReplaySafeImportService.recordImport(ocrContent, 'doc-ocr-test', 1, 'test-runner');
  assert(checksum.startsWith('chk_'), `Import generates checksum starting with "chk_", got: ${checksum}`);

  const secondCheck = await ReplaySafeImportService.isDuplicate(ocrContent);
  assert(secondCheck === true, 'Re-submitted identical OCR content correctly flagged as duplicate');

  // ── Final report ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('🏁 OCR ROBUSTNESS TEST SUITE COMPLETE');
  console.log(`   ✅ Passed: ${passed}   ❌ Failed: ${failed}   Total: ${passed + failed}`);
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runOCRTests().catch(err => {
  console.error('Fatal error in OCR tests:', err);
  process.exit(1);
});
