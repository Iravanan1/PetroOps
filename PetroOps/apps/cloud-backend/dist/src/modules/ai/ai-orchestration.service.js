"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIOrchestrationService = void 0;
const common_1 = require("@nestjs/common");
let AIOrchestrationService = class AIOrchestrationService {
    async generateExplainableVarianceReport(stationId, assessment, atgLiters, salesLiters) {
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
        let analysisSummary = 'Forecourt wetstock levels operating in stable equilibrium bounds.';
        let recommendedAction = 'No physical action required. Keep monitoring automatic telemetry loops.';
        if (assessment.classification === 'THEFT_SUSPECTED') {
            analysisSummary = `Alert: High rate discrepancy recorded. ATG recorded ${atgLiters}L reduction while pump flow meters accounted for only ${salesLiters}L, leaving an unexplained drop of ${(atgLiters - salesLiters).toFixed(1)}L. Loss rate indicates high probability of active fuel siphoning.`;
            recommendedAction = 'Emergency Action Required: Secure all pump nozzle cabinets and check active CCTV recordings recorded during the shift timeframe.';
        }
        else if (assessment.classification === 'CRITICAL_LEAK') {
            analysisSummary = `Warning: Slow, chronic volumetric variance recorded over the period. Total discrepancy accounts for ${(atgLiters - salesLiters).toFixed(1)}L, indicating a high probability of a physical pipeline or storage tank leakage.`;
            recommendedAction = 'Action Recommended: Dispatch a certified forecourt pipeline technician to run pressure tests on Tank probe bounds.';
        }
        this.registerVectorIndexStore(promptTemplate, assessment);
        return {
            analysisSummary,
            recommendedAction,
            theftProbability: assessment.anomalyScore,
            confidenceScore: assessment.confidenceRating
        };
    }
    registerVectorIndexStore(prompt, assessment) {
        console.log(`[AI Orchestration] Registered prompt vector index for ${assessment.classification}`);
    }
};
exports.AIOrchestrationService = AIOrchestrationService;
exports.AIOrchestrationService = AIOrchestrationService = __decorate([
    (0, common_1.Injectable)()
], AIOrchestrationService);
//# sourceMappingURL=ai-orchestration.service.js.map