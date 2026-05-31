import { OCRLearningFeedbackService } from './OCRLearningFeedbackService';

export interface ModelExtractions {
  paddleOcr: number;
  easyOcr: number;
  qwenLocal: number;
  claudeCloud: number;
}

export interface FieldConsensusResult {
  fieldName: string;
  consensusValue: number;
  confidenceScore: number; // 0 to 100
  disagreementFound: boolean;
  significantDivergence: boolean;
  engineVotes: Record<string, number>;
  divergentEngines: string[];
}

export class ConsensusScoringEngine {
  /**
   * Resolves numerical extraction discrepancies across all OCR and VLM models using a weighted voting algorithm.
   * Claude (0.40) | Qwen2.5 (0.25) | PaddleOCR (0.20) | EasyOCR (0.15)
   */
  public static calculateFieldConsensus(fieldName: string, extractions: ModelExtractions): FieldConsensusResult {
    const weights: Record<keyof ModelExtractions, number> = {
      claudeCloud: 0.40,
      qwenLocal: 0.25,
      paddleOcr: 0.20,
      easyOcr: 0.15
    };

    const valWeights: Record<number, number> = {};
    const engines = Object.keys(extractions) as Array<keyof ModelExtractions>;

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
      } else if (Math.abs(weightSum - maxWeight) < 0.0001) {
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
    const engineMapping: Record<keyof ModelExtractions, string> = {
      claudeCloud: 'ClaudeCloud',
      qwenLocal: 'QwenLocal',
      paddleOcr: 'PaddleOCR',
      easyOcr: 'EasyOCR'
    };

    const divergentEngines: string[] = [];
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
    const biasModifier = OCRLearningFeedbackService.getFieldBiasModifier(fieldName);
    confidenceScore = Math.max(0, Math.min(100, confidenceScore + Math.round(biasModifier * 100)));

    const engineVotes: Record<string, number> = {
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
  public static compileDocumentConsensus(
    rawPaddle: Record<string, number>,
    rawEasy: Record<string, number>,
    rawQwen: Record<string, number>,
    rawClaude: Record<string, number>
  ): Record<string, FieldConsensusResult> {
    const keys = ['openingCash', 'actualCash', 'cardSales', 'upiSales', 'creditSales', 'creditRecovery', 'expenses'];
    const results: Record<string, FieldConsensusResult> = {};

    keys.forEach(key => {
      const extractions: ModelExtractions = {
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
