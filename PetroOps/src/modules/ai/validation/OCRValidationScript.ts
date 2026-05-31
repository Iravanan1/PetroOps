import { SafeJSONRepair } from './SafeJSONRepair';
import { ConsensusScoringEngine } from '../services/ConsensusScoringEngine';
import { OCRLearningFeedbackService } from '../services/OCRLearningFeedbackService';
import { ConfidenceEngine } from '../services/ConfidenceEngine';
import { RegionSegmentationService } from '../../ocr/RegionSegmentationService';
import { ReplaySafeImportService } from '../../replay/ReplaySafeImportService';
import { OCRStructuringService } from '../services/OCRStructuringService';

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 STARTING HIGH-FIDELITY OCR RELIABILITY STABILIZATION TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(` ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // ==========================================
  // TEST CASE 1: AGGRESSIVE JSON RECOVERY
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("📝 TEST GROUP 1: MALFORMED JSON RECOVERY");
  console.log("--------------------------------------------------------");

  // A. Markdown Code block cleanup
  const mdBlock = "\n```json\n{\n  \"openingCash\": 12500,\n  \"actualCash\": 48900\n}\n```\n";
  const parsedMd = SafeJSONRepair.safeParse<any>(mdBlock, {});
  assert(parsedMd.openingCash === 12500 && parsedMd.actualCash === 48900, "Markdown triple backtick cleaning");

  // B. Unquoted keys
  const unquoted = "{ openingCash: 12500, actualCash: 48900 }";
  const parsedUnquoted = SafeJSONRepair.safeParse<any>(unquoted, {});
  assert(parsedUnquoted.openingCash === 12500 && parsedUnquoted.actualCash === 48900, "Unquoted JSON keys parsing");

  // C. Single quotes conversion
  const singleQuotes = "{ 'openingCash': 12500, 'actualCash': 48900 }";
  const parsedSingle = SafeJSONRepair.safeParse<any>(singleQuotes, {});
  assert(parsedSingle.openingCash === 12500 && parsedSingle.actualCash === 48900, "Single-to-double quote conversion");

  // D. Incomplete trailing commas and unclosed braces
  const incomplete = "{ \"openingCash\": 12500, \"actualCash\": 48900, ";
  const parsedIncomplete = SafeJSONRepair.safeParse<any>(incomplete, {});
  assert(parsedIncomplete.openingCash === 12500 && parsedIncomplete.actualCash === 48900, "Incomplete trailing commas & unclosed braces balancing");


  // ==========================================
  // TEST CASE 2: MULTI-MODEL CONSENSUS VOTING
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("🗳️ TEST GROUP 2: MULTI-MODEL CONSENSUS VOTING");
  console.log("--------------------------------------------------------");

  // A. Complete agreement
  const consensus1 = ConsensusScoringEngine.calculateFieldConsensus("actualCash", {
    claudeCloud: 48900,
    qwenLocal: 48900,
    paddleOcr: 48900,
    easyOcr: 48900
  });
  assert(consensus1.consensusValue === 48900, "Complete Agreement: consensus value matches");
  assert(consensus1.confidenceScore >= 98, "Complete Agreement: maximum confidence (>= 98)");
  assert(consensus1.disagreementFound === false, "Complete Agreement: no disagreement flagged");

  // B. Claude outvotes split local models (Claude weight 0.40 wins over single local models)
  const consensus2 = ConsensusScoringEngine.calculateFieldConsensus("actualCash", {
    claudeCloud: 48900,
    qwenLocal: 48000,
    paddleOcr: 48500,
    easyOcr: 48300
  });
  assert(consensus2.consensusValue === 48900, "Claude outvotes split local models");
  assert(consensus2.disagreementFound === true, "Disagreement flagged on model split");
  assert(consensus2.divergentEngines.includes("PaddleOCR"), "PaddleOCR correctly flagged as divergent");

  // C. Local models outvote Claude (Qwen 0.25 + Paddle 0.20 + Easy 0.15 = 0.60 > Claude 0.40)
  const consensus3 = ConsensusScoringEngine.calculateFieldConsensus("actualCash", {
    claudeCloud: 48000,
    qwenLocal: 48900,
    paddleOcr: 48900,
    easyOcr: 48900
  });
  assert(consensus3.consensusValue === 48900, "Local models successfully outvote Claude");
  assert(consensus3.divergentEngines.includes("ClaudeCloud"), "ClaudeCloud correctly flagged as divergent");

  // D. Significant Divergence Check (>5% difference)
  const consensus4 = ConsensusScoringEngine.calculateFieldConsensus("actualCash", {
    claudeCloud: 48900,
    qwenLocal: 48900,
    paddleOcr: 40000, // >5% away from 48900
    easyOcr: 48900
  });
  assert(consensus4.significantDivergence === true, "Significant divergence (>5%) correctly detected");


  // ==========================================
  // TEST CASE 3: SEGMENTATION & QUALITY GRADING
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("🔍 TEST GROUP 3: SEGMENTATION & QUALITY GRADING");
  console.log("--------------------------------------------------------");

  // A. Quality Grading
  const quality = RegionSegmentationService.gradeImageQuality(1200, 1800, 350000);
  assert(quality.overallGrade > 50, `Image quality grading executes (Overall: ${quality.overallGrade})`);
  assert(quality.blurScore === 92, "Image blur classification based on resolution");

  // B. Handwriting density
  const handAnalysis = RegionSegmentationService.analyzeHandwritingDensity("Shift correction sign verification OK");
  assert(handAnalysis.isHandwritten === true, "Handwriting annotations correctly classified");
  assert(handAnalysis.handwritingDensity > 20, "Handwriting density factor calculated");

  // C. Region segmenting and text chunking
  const ocrRegisterText = `
  PETROLEUM NOZZLE REGISTER
  nozzle-1 opening: 12450.50 closing: 12790.80 netSales: 335.30 rate: 104.50
  PAYMENT REGISTER
  upiSales: 18500 cardSales: 9000 creditSales: 7500 actualCash: 48900
  `;
  const regions = RegionSegmentationService.segmentImage(1200, 1800, ocrRegisterText);
  assert(regions.some(r => r.name === 'nozzle_block'), "Nozzle region bounding segmented");
  assert(regions.some(r => r.name === 'payment_block'), "Payment region bounding segmented");

  const focusedNozzleText = RegionSegmentationService.extractFocusedRegionText(ocrRegisterText, 'nozzle_block');
  assert(focusedNozzleText.includes("nozzle-1") && !focusedNozzleText.includes("upiSales"), "Selective layout text chunking and cleaning");


  // ==========================================
  // TEST CASE 4: REPLAY IMPORTS & CARRY-FORWARD
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("🔄 TEST GROUP 4: DUPLICATE CHECK & CASH CONTINUITY");
  console.log("--------------------------------------------------------");

  // A. Duplicate import detection
  const ocrContent = "Daily nozzle details: opening 12000 closing 15000 actual cash 50000";
  const firstCheck = await ReplaySafeImportService.isDuplicate(ocrContent);
  assert(firstCheck === false, "Fresh document classified as non-duplicate");

  const checksum = await ReplaySafeImportService.recordImport(ocrContent, "doc-123", 1, "test-runner");
  assert(checksum.startsWith("chk_"), "Record import generates safe replay checksum");

  const secondCheck = await ReplaySafeImportService.isDuplicate(ocrContent);
  assert(secondCheck === true, "Subsequent scan accurately classified as duplicate");


  // ==========================================
  // TEST CASE 5: LEARNING FEEDBACK & BIAS PENALTIES
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("🧠 TEST GROUP 5: ADAPTIVE FEEDBACK & BIAS ADJUSTMENTS");
  console.log("--------------------------------------------------------");

  // Log correction feedback
  await OCRLearningFeedbackService.logCorrectionFeedback("job-abc", "actualCash", "48000", "48900", "digit_confusion");
  await OCRLearningFeedbackService.logCorrectionFeedback("job-xyz", "actualCash", "48200", "48900", "digit_confusion");
  await OCRLearningFeedbackService.logCorrectionFeedback("job-123", "actualCash", "48500", "48900", "digit_confusion");

  const bias1 = OCRLearningFeedbackService.getFieldBiasModifier("actualCash");
  assert(bias1 === -0.05, "Correction count matches 3 -> applies -5% feedback modifier");

  // Log more corrections
  await OCRLearningFeedbackService.logCorrectionFeedback("job-456", "actualCash", "48000", "48900", "digit_confusion");
  await OCRLearningFeedbackService.logCorrectionFeedback("job-789", "actualCash", "48100", "48900", "digit_confusion");
  await OCRLearningFeedbackService.logCorrectionFeedback("job-000", "actualCash", "48800", "48900", "digit_confusion");

  const bias2 = OCRLearningFeedbackService.getFieldBiasModifier("actualCash");
  assert(bias2 === -0.15, "Correction count matches 6 -> applies -15% feedback modifier");

  // Overall Confidence adjustment inside ConfidenceEngine
  const baseConfMetrics = {
    ocrScore: 90,
    aiScore: 92,
    reconciliationScore: 95,
    correctionPenalty: 0,
    imageQualityScore: 85,
    handwritingDensity: 0
  };
  const conf1 = ConfidenceEngine.calculateOverallConfidence("shift-1", baseConfMetrics, "branch-1");

  // Trigger feedback modifier by running with feedback biases
  // Since actualCash modifier is -0.15, overall confidence should deduct 15 points (0.15 * 100)
  const expectedConfidence = Math.max(0, Math.min(100, (90 * 0.25 + 92 * 0.35 + 95 * 0.40) - 15));
  assert(Math.abs(conf1 - expectedConfidence) < 0.01, `ConfidenceEngine incorporates learning feedback biases (Result: ${conf1}, Expected: ${expectedConfidence})`);


  // ==========================================
  // TEST CASE 6: HYBRID PIPELINE ROUTING
  // ==========================================
  console.log("\n--------------------------------------------------------");
  console.log("🔀 TEST GROUP 6: HYBRID PIPELINE ROUTING");
  console.log("--------------------------------------------------------");

  // A. Perfect Local Run
  const nozzlesContext = [
    { nozzleId: "nozzle-1", openingMeter: 12450.50, closingMeter: 12790.80 },
    { nozzleId: "nozzle-2", openingMeter: 8520.10, closingMeter: 8710.60 }
  ];
  
  // Set yesterday cash to match today's opening cash so no carry-forward mismatch occurs
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem("yesterday_actual_cash", "12500");
  }

  // Base OCR contains numbers that align perfectly with business logics
  const perfectOcrText = `
  opening cash: 12500
  actual cash: 48900
  card sales: 9000
  upi sales: 18500
  credit sales: 7500
  credit recovery: 3200
  expenses: 1500
  `;

  const route1 = await OCRStructuringService.executeRouting(
    perfectOcrText,
    nozzlesContext,
    95, // High confidence
    false // Not handwritten
  );
  
  assert(route1.status === 'AUTO_EXTRACTED', `Perfect transaction automatically parsed locally without Claude (Status: ${route1.status})`);

  // B. Low confidence trigger escalation
  const route2 = await OCRStructuringService.executeRouting(
    perfectOcrText,
    nozzlesContext,
    60, // Low confidence -> triggers Claude escalation
    false
  );
  assert(route2.warnings.some(w => w.includes("Escalated to Claude")), "Escalation rules correctly trigger Anthropic API fallback under low confidence");

  // C. Disagreement/conflict routes to review required
  // PaddleOCR, EasyOCR, and QwenLocal simulated digit confusions in execution will flag a disagreement
  const divergentOcrText = `
  opening cash: 12500
  actual cash: 48900
  card sales: 9000
  upi sales: 18500
  credit sales: 7500
  credit recovery: 3200
  expenses: 1500
  `;
  
  // We trigger consensus conflict by passing a different text or forcing discrepancy
  // In OCRStructuringService:
  // Paddle actualCash = 48000 (disagrees with Qwen/Claude 48900 by 900 units - less than 5% and <1000)
  // Easy upiSales = 18000 (disagrees with Qwen/Claude 18500 by 500 units)
  // Let's pass a value that creates a significant discrepancy (>5% or >1000 INR)
  const conflictOcrText = `
  opening cash: 12500
  actual cash: 50000
  card sales: 9000
  upi sales: 30000  // Significant divergence!
  credit sales: 7500
  credit recovery: 3200
  expenses: 1500
  `;

  const route3 = await OCRStructuringService.executeRouting(
    conflictOcrText,
    nozzlesContext,
    95,
    false
  );
  assert(route3.status === 'REVIEW_REQUIRED', `Significant consensus conflicts automatically push sheet to manager Review Queue (Status: ${route3.status})`);
  assert(route3.errors.some(e => e.includes("Consensus Conflict")), "Review routing details include descriptive model voting split logs");

  // ==========================================
  // FINAL REPORT
  // ==========================================
  console.log("\n========================================================");
  console.log("🏁 OCR RELIABILITY STABILIZATION PHASE COMPLETED");
  console.log("========================================================");
  console.log(` Total Checks: ${passed + failed}`);
  console.log(` 🎉 Passed:   ${passed}`);
  console.log(` ⚠️ Failed:   ${failed}`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test execution encountered a fatal error:", err);
  process.exit(1);
});
