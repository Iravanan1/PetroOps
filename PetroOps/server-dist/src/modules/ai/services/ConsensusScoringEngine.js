"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusScoringEngine = void 0;
const OCRLearningFeedbackService_1 = require("./OCRLearningFeedbackService");
class ConsensusScoringEngine {
    /**
     * Resolves numerical extraction discrepancies across all OCR and VLM models using a weighted voting algorithm.
     * Claude (0.40) | Qwen2.5 (0.25) | PaddleOCR (0.20) | EasyOCR (0.15)
     */
    static calculateFieldConsensus(fieldName, extractions) {
        const weights = {
            claudeCloud: 0.40,
            qwenLocal: 0.25,
            paddleOcr: 0.20,
            easyOcr: 0.15
        };
        const valWeights = {};
        const engines = Object.keys(extractions);
        engines.forEach(engine => {
            const val = extractions[engine];
            valWeights[val] = (valWeights[val] || 0) + weights[engine];
        });
        // Find the value with the highest weight sum
        let consensusValue = extractions.claudeCloud;
        let maxWeight = 0;
        Object.keys(valWeights).forEach(keyStr => {
            const val = Number(keyStr);
            const weightSum = valWeights[val];
            if (weightSum > maxWeight) {
                maxWeight = weightSum;
                consensusValue = val;
            }
            else if (Math.abs(weightSum - maxWeight) < 0.0001) {
                // Tie-breaker hierarchy: Claude > Qwen > Paddle > Easy
                const currentWinnerEngine = engines.find(e => extractions[e] === consensusValue);
                const candidateEngine = engines.find(e => extractions[e] === val);
                if (currentWinnerEngine && candidateEngine) {
                    const hierarchy = ['claudeCloud', 'qwenLocal', 'paddleOcr', 'easyOcr'];
                    if (hierarchy.indexOf(candidateEngine) < hierarchy.indexOf(currentWinnerEngine)) {
                        consensusValue = val;
                    }
                }
            }
        });
        // Detect disagreements and track which engines diverged
        const engineMapping = {
            claudeCloud: 'ClaudeCloud',
            qwenLocal: 'QwenLocal',
            paddleOcr: 'PaddleOCR',
            easyOcr: 'EasyOCR'
        };
        const divergentEngines = [];
        let disagreementFound = false;
        let significantDivergence = false;
        engines.forEach(engine => {
            const val = extractions[engine];
            if (val !== consensusValue) {
                disagreementFound = true;
                divergentEngines.push(engineMapping[engine]);
                // Significant divergence: more than 5% or >1000 INR absolute variance
                const percentDiff = consensusValue === 0 ? 100 : (Math.abs(val - consensusValue) / consensusValue) * 100;
                const absDiff = Math.abs(val - consensusValue);
                if (percentDiff > 5 || absDiff > 1000) {
                    significantDivergence = true;
                }
            }
        });
        // Base confidence score is based on the consensus agreement weight ratio
        let confidenceScore = Math.round(maxWeight * 100);
        // Apply adaptive learning correction biases (feedback adjustments)
        const biasModifier = OCRLearningFeedbackService_1.OCRLearningFeedbackService.getFieldBiasModifier(fieldName);
        confidenceScore = Math.max(0, Math.min(100, confidenceScore + Math.round(biasModifier * 100)));
        const engineVotes = {
            PaddleOCR: extractions.paddleOcr,
            EasyOCR: extractions.easyOcr,
            Qwen: extractions.qwenLocal,
            Claude: extractions.claudeCloud
        };
        return {
            fieldName,
            consensusValue,
            confidenceScore,
            disagreementFound,
            significantDivergence,
            engineVotes,
            divergentEngines
        };
    }
    /**
     * Performs whole-document consensus compilation.
     */
    static compileDocumentConsensus(rawPaddle, rawEasy, rawQwen, rawClaude) {
        const keys = ['openingCash', 'actualCash', 'cardSales', 'upiSales', 'creditSales', 'creditRecovery', 'expenses'];
        const results = {};
        keys.forEach(key => {
            const extractions = {
                paddleOcr: rawPaddle[key] ?? 0,
                easyOcr: rawEasy[key] ?? 0,
                qwenLocal: rawQwen[key] ?? 0,
                claudeCloud: rawClaude[key] ?? 0
            };
            results[key] = this.calculateFieldConsensus(key, extractions);
        });
        return results;
    }
}
exports.ConsensusScoringEngine = ConsensusScoringEngine;
