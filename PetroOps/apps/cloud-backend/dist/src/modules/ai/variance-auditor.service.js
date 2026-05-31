"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VarianceAuditorService = void 0;
const common_1 = require("@nestjs/common");
let VarianceAuditorService = class VarianceAuditorService {
    evaluateTheftAnomalousScore(atgLossLiters, recordedSalesLiters, durationHours) {
        const variance = atgLossLiters - recordedSalesLiters;
        const lossPerHour = durationHours > 0 ? variance / durationHours : 0.0;
        let anomalyScore = 0.0;
        let classification = 'STABLE';
        let confidenceRating = 0.98;
        let message = 'Station telemetry indices operating inside safe bounds.';
        if (variance > 10.0) {
            anomalyScore = Math.min(1.0, (variance - 10.0) / 100.0);
            if (lossPerHour > 20.0) {
                classification = 'THEFT_SUSPECTED';
                confidenceRating = 0.88;
                message = `Alert: High rate fuel loss detected (${lossPerHour.toFixed(1)} L/hr). Fuel theft suspected.`;
            }
            else {
                classification = 'CRITICAL_LEAK';
                confidenceRating = 0.91;
                message = `Warning: Chronic slow fuel volume leakage detected (${lossPerHour.toFixed(1)} L/hr). Wetstock inspection recommended.`;
            }
        }
        return {
            anomalyScore,
            classification,
            confidenceRating,
            message
        };
    }
    evaluateSuspiciousShift(cashExpected, cashCollected) {
        const variance = Math.abs(cashExpected - cashCollected);
        let riskRating = 'NONE';
        let isSuspicious = false;
        let varianceScore = 0.0;
        if (variance > 500.0) {
            isSuspicious = true;
            riskRating = 'HIGH';
            varianceScore = Math.min(1.0, variance / 5000.0);
        }
        else if (variance > 100.0) {
            isSuspicious = true;
            riskRating = 'MEDIUM';
            varianceScore = Math.min(1.0, variance / 5000.0);
        }
        return {
            isSuspicious,
            varianceScore,
            riskRating
        };
    }
};
exports.VarianceAuditorService = VarianceAuditorService;
exports.VarianceAuditorService = VarianceAuditorService = __decorate([
    (0, common_1.Injectable)()
], VarianceAuditorService);
//# sourceMappingURL=variance-auditor.service.js.map