import { Injectable } from '@nestjs/common';
import { AnomalyAssessment } from './variance-auditor.service';

export interface ExplainableAIOutput {
  analysisSummary: string;
  recommendedAction: string;
  theftProbability: number;
  confidenceScore: number;
}

@Injectable()
export class AIOrchestrationService {
  /**
   * Orchestrates prompt compilations and mock OpenAI/ONNX parsing
   * to output structured operational summaries.
   */
  public async generateExplainableVarianceReport(
    stationId: string,
    assessment: AnomalyAssessment,
    atgLiters: number,
    salesLiters: number
  ): Promise<ExplainableAIOutput> {
    
    // Compile structured Prompt Template
    const promptTemplate = `
      [SYSTEM CONTEXT: PetroOps Anomaly Engine]
      You are auditing petrol station branch #${stationId}.
      
      [TELEMETRY TELEMETRY]
      - Automatic Tank Gauge (ATG) fuel height drop: ${atgLiters} Liters
      - Pump Nozzles Transactions total liters: ${salesLiters} Liters
      - Variance Discrepancy: ${(atgLiters - salesLiters).toFixed(1)} Liters
      - Telemetry Assessment Score: ${assessment.anomalyScore}
      - Core Classification: ${assessment.classification}
      - Initial Confidence Rating: ${assessment.confidenceRating}
      
      [AUDIT PROMPT]
      Write a concise, high-credibility operational summary of this event. 
      Outline if the drop represents standard dispenser drifts, a physical pipeline leak, or active forecourt siphoning theft.
    `;

    // Simulate structured LLM return mapping
    let analysisSummary = 'Forecourt wetstock levels operating in stable equilibrium bounds.';
    let recommendedAction = 'No physical action required. Keep monitoring automatic telemetry loops.';
    
    if (assessment.classification === 'THEFT_SUSPECTED') {
      analysisSummary = `Alert: High rate discrepancy recorded. ATG recorded ${atgLiters}L reduction while pump flow meters accounted for only ${salesLiters}L, leaving an unexplained drop of ${(atgLiters - salesLiters).toFixed(1)}L. Loss rate indicates high probability of active fuel siphoning.`;
      recommendedAction = 'Emergency Action Required: Secure all pump nozzle cabinets and check active CCTV recordings recorded during the shift timeframe.';
    } else if (assessment.classification === 'CRITICAL_LEAK') {
      analysisSummary = `Warning: Slow, chronic volumetric variance recorded over the period. Total discrepancy accounts for ${(atgLiters - salesLiters).toFixed(1)}L, indicating a high probability of a physical pipeline or storage tank leakage.`;
      recommendedAction = 'Action Recommended: Dispatch a certified forecourt pipeline technician to run pressure tests on Tank probe bounds.';
    }

    // Future Vector DB compatibility Hook
    this.registerVectorIndexStore(promptTemplate, assessment);

    return {
      analysisSummary,
      recommendedAction,
      theftProbability: assessment.anomalyScore,
      confidenceScore: assessment.confidenceRating
    };
  }

  private registerVectorIndexStore(prompt: string, assessment: AnomalyAssessment) {
    // Under SaaS deployment, this segment serialises prompt vectors and stores them
    // in an enterprise vector database (e.g. pgvector) for semantic audit searches.
    console.log(`[AI Orchestration] Registered prompt vector index for ${assessment.classification}`);
  }
}
