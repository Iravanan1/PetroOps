export interface AnomalyAssessment {
    anomalyScore: number;
    classification: 'THEFT_SUSPECTED' | 'CRITICAL_LEAK' | 'STABLE';
    confidenceRating: number;
    message: string;
}
export declare class VarianceAuditorService {
    evaluateTheftAnomalousScore(atgLossLiters: number, recordedSalesLiters: number, durationHours: number): AnomalyAssessment;
    evaluateSuspiciousShift(cashExpected: number, cashCollected: number): {
        isSuspicious: boolean;
        varianceScore: number;
        riskRating: 'HIGH' | 'MEDIUM' | 'NONE';
    };
}
