import { AnomalyAssessment } from './variance-auditor.service';
export interface ExplainableAIOutput {
    analysisSummary: string;
    recommendedAction: string;
    theftProbability: number;
    confidenceScore: number;
}
export declare class AIOrchestrationService {
    generateExplainableVarianceReport(stationId: string, assessment: AnomalyAssessment, atgLiters: number, salesLiters: number): Promise<ExplainableAIOutput>;
    private registerVectorIndexStore;
}
