"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const ReconciliationEngine_js_1 = require("../../src/lib/ReconciliationEngine.js");
class ValidationService {
    static validateShift(data) {
        let score = 100;
        const discrepancies = [];
        // 1. Validate Nozzle Meter Math (Pre-reconciliation check)
        for (const reading of data.readings) {
            const calculatedVolume = reading.closingMeter - reading.openingMeter - reading.testingQty;
            if (Math.abs(calculatedVolume - reading.netSales) > 0.5) {
                discrepancies.push(`Nozzle ${reading.nozzleId}: Volume mismatch. Expected ${calculatedVolume.toFixed(2)} but found ${reading.netSales.toFixed(2)}`);
                score -= 15;
            }
        }
        // 2. Map ShiftExtraction to ShiftRecord structures dynamically
        const hsdReadings = [];
        const msReadings = [];
        data.readings.forEach((r, idx) => {
            const nozzle = {
                id: idx + 1,
                nozzleId: r.nozzleId,
                fuel: r.fuelType === 'HSD' ? 'hsd' : 'ms',
                opening: r.openingMeter,
                closing: r.closingMeter,
                testing: r.testingQty,
                fuelRate: r.fuelRate,
                netSales: r.netSales,
                active: true
            };
            if (r.fuelType === 'HSD') {
                hsdReadings.push(nozzle);
            }
            else {
                msReadings.push(nozzle);
            }
        });
        const shiftRecord = {
            id: "validation-run",
            status: "pending",
            openingCash: data.openingCash,
            actualCash: data.actualCash,
            expenses: data.expenses,
            upiSales: data.upiSales,
            cardSales: data.cardSales,
            creditSales: data.creditSales,
            creditRecovery: data.creditRecovery,
            hsd: hsdReadings,
            ms: msReadings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // 3. Delegate to Centralized Business Reconciliation Engine
        const report = ReconciliationEngine_js_1.ReconciliationEngine.reconcile(shiftRecord);
        const cashDiff = Math.abs(report.metrics.cashMismatch);
        if (cashDiff > 100) {
            discrepancies.push(`Accounting mismatch: Expected till balance INR ${report.metrics.expectedCash.toFixed(2)}, but recorded INR ${report.metrics.actualCash.toFixed(2)} (Variance: INR ${report.metrics.cashMismatch.toFixed(2)})`);
            score -= 25;
        }
        // 4. Inject structural flags detected during reconciliation into validation feedback
        report.flags.forEach(flag => {
            if (flag.level === 'theft' || flag.level === 'error') {
                discrepancies.push(`Audit Violation (${flag.level.toUpperCase()}): ${flag.message}`);
                score -= 10;
            }
        });
        const isValid = score >= 90 && discrepancies.length === 0;
        return {
            isValid,
            score: Math.max(0, score),
            discrepancies
        };
    }
}
exports.ValidationService = ValidationService;
