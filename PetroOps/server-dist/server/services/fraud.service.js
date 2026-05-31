"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
class FraudDetectionService {
    static async analyzeShift(shiftId, data) {
        const anomalies = [];
        // Rule 1: Cash Shortage based on rigorous accounting
        let totalCalculatedSales = 0;
        for (const reading of data.readings) {
            totalCalculatedSales += reading.netSales * (reading.fuelRate || 0);
        }
        const expectedCash = data.openingCash
            + (totalCalculatedSales - data.upiSales - data.cardSales - data.creditSales)
            - data.expenses
            + data.creditRecovery;
        const shortage = expectedCash - data.actualCash;
        if (shortage > 500) {
            anomalies.push({ severity: "CRITICAL", anomalyType: "SEVERE_CASH_SHORTAGE", description: `Shortage of INR ${shortage.toFixed(2)} detected in till audit.` });
        }
        else if (shortage > 100) {
            anomalies.push({ severity: "MEDIUM", anomalyType: "CASH_SHORTAGE", description: `Shortage of INR ${shortage.toFixed(2)} detected in till audit.` });
        }
        else if (shortage < -100) {
            anomalies.push({ severity: "MEDIUM", anomalyType: "CASH_SURPLUS", description: `Unexplained surplus of INR ${Math.abs(shortage).toFixed(2)} detected in till audit.` });
        }
        // Rule 2: Meter Tampering (Closing < Opening)
        for (const reading of data.readings) {
            if (reading.closingMeter < reading.openingMeter) {
                anomalies.push({
                    severity: "CRITICAL",
                    anomalyType: "METER_REVERSAL",
                    description: `Meter reversal detected on Nozzle ${reading.nozzleId}. Opening: ${reading.openingMeter}, Closing: ${reading.closingMeter}`
                });
            }
            // Rule 3: Abnormal Testing Quantities
            if (reading.testingQty > 15) {
                anomalies.push({
                    severity: "HIGH",
                    anomalyType: "EXCESSIVE_TESTING",
                    description: `Abnormal testing quantity of ${reading.testingQty}L on Nozzle ${reading.nozzleId}.`
                });
            }
            // Rule 4: Suspicious Rounding (Exactly 00 or 000 sales volumes)
            if (reading.netSales > 0 && reading.netSales % 100 === 0) {
                anomalies.push({
                    severity: "LOW",
                    anomalyType: "SUSPICIOUS_ROUNDING",
                    description: `Suspiciously round volume sold (${reading.netSales}L) on Nozzle ${reading.nozzleId}.`
                });
            }
        }
        // Rule 5: Negative Balances
        if (data.actualCash < 0 || data.openingCash < 0) {
            anomalies.push({
                severity: "CRITICAL",
                anomalyType: "NEGATIVE_BALANCE",
                description: `Cash balances cannot be negative.`
            });
        }
        return anomalies;
    }
}
exports.FraudDetectionService = FraudDetectionService;
