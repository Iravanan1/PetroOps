"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationEngine = exports.THRESHOLDS = exports.DEFAULT_RATES = void 0;
exports.DEFAULT_RATES = {
    hsdSell: 92.30,
    msSell: 104.50,
    hsdBuy: 89.50,
    msBuy: 99.80
};
exports.THRESHOLDS = {
    CASH_WARN: 100,
    CASH_THEFT: 500,
    TANK_WARN: 5,
    TANK_THEFT: 15,
    PATTERN_DAYS: 3,
    METER_GAP_WARN: 10,
    SALE_OUTLIER_X: 3
};
class ReconciliationEngine {
    static reconcile(shift) {
        const hS = exports.DEFAULT_RATES.hsdSell;
        const mS = exports.DEFAULT_RATES.msSell;
        const hB = exports.DEFAULT_RATES.hsdBuy;
        const mB = exports.DEFAULT_RATES.msBuy;
        // Extract nozzles securely
        const hsdNozzles = shift.hsd || shift.readings?.filter(r => r.fuel === 'hsd' || r.fuel === 'HSD') || [];
        const msNozzles = shift.ms || shift.readings?.filter(r => r.fuel === 'ms' || r.fuel === 'MS') || [];
        // Audit nozzle sales volumes
        const hsdAudit = this.auditNozzles(hsdNozzles);
        const msAudit = this.auditNozzles(msNozzles);
        // Financial Reconciliation calculations
        const revenue = (hsdAudit.totalSales * hS) + (msAudit.totalSales * mS);
        // Support either unified store number or list objects
        const paytmTotal = typeof shift.upiSales === 'number' ? shift.upiSales : this.sumEntries(shift.paytm || []);
        const cardTotal = typeof shift.cardSales === 'number' ? shift.cardSales : this.sumEntries(shift.card || []);
        const creditTotal = typeof shift.creditSales === 'number' ? shift.creditSales : this.sumMoneyEntries(shift.credit || []);
        const recoveryTotal = typeof shift.creditRecovery === 'number' ? shift.creditRecovery : this.sumMoneyEntries(shift.creditRecovery || []);
        let expenseTotal = 0;
        if (typeof shift.expenses === 'number') {
            expenseTotal = shift.expenses;
        }
        else if (Array.isArray(shift.expenses)) {
            expenseTotal = this.sumMoneyEntries(shift.expenses);
        }
        const recoveryCash = shift.creditRecoverySplits ? (+shift.creditRecoverySplits.cash || 0) : recoveryTotal;
        const expectedCash = (+shift.openingCash || 0) + (revenue - creditTotal - paytmTotal - cardTotal + recoveryCash) - expenseTotal;
        const actualCash = +shift.actualCash || 0;
        const cashMismatch = actualCash - expectedCash;
        // Profit auditing
        const hsdCost = hsdAudit.totalSales * hB;
        const msCost = msAudit.totalSales * mB;
        const netProfit = revenue - (hsdCost + msCost) - expenseTotal;
        // Tank reconciliation (Physical Closing dip vs Book calculation)
        const hsdExpectedTank = (+shift.tankHsdOpening || 0) + (+shift.tankHsdReceived || 0) - hsdAudit.totalSales;
        const msExpectedTank = (+shift.tankMsOpening || 0) + (+shift.tankMsReceived || 0) - msAudit.totalSales;
        const hsdTankMismatch = (+shift.tankHsdClosing || hsdExpectedTank) - hsdExpectedTank;
        const msTankMismatch = (+shift.tankMsClosing || msExpectedTank) - msExpectedTank;
        // Generate smart operational flags
        const flags = this.generateFlags(cashMismatch, hsdTankMismatch, msTankMismatch);
        return {
            timestamp: new Date().toISOString(),
            shiftId: shift.id || "demo-shift",
            metrics: {
                totalLitres: { hsd: hsdAudit.totalSales, ms: msAudit.totalSales },
                revenue,
                expectedCash,
                actualCash,
                cashMismatch,
                paytmTotal,
                creditTotal,
                recoveryTotal,
                expenseTotal,
                netProfit
            },
            variances: {
                nozzles: [...hsdAudit.variances, ...msAudit.variances],
                tanks: { hsd: hsdTankMismatch, ms: msTankMismatch }
            },
            flags
        };
    }
    static auditNozzles(nozzles) {
        let totalSales = 0;
        const variances = nozzles.map(n => {
            const closing = typeof n.closing === 'string' ? parseFloat(n.closing) : (n.closing || 0);
            const opening = typeof n.opening === 'string' ? parseFloat(n.opening) : (n.opening || 0);
            const testing = typeof n.testing === 'string' ? parseFloat(n.testing) : (n.testing || 0);
            const sale = Math.max(0, closing - opening) - testing;
            totalSales += sale;
            return {
                id: n.id || 0,
                fuel: n.fuel,
                saleLitres: sale,
                expectedSale: sale,
                variance: 0
            };
        });
        return { totalSales, variances };
    }
    static sumEntries(entries) {
        return entries.reduce((sum, val) => sum + (+val || 0), 0);
    }
    static sumMoneyEntries(entries) {
        return entries.reduce((sum, e) => sum + (+e.amount || 0), 0);
    }
    static generateFlags(cashDiff, hDiff, mDiff) {
        const flags = [];
        const absCash = Math.abs(cashDiff);
        if (absCash >= exports.THRESHOLDS.CASH_THEFT) {
            flags.push({ level: 'theft', message: `Critical Cash Mismatch: INR ${absCash.toLocaleString()}` });
        }
        else if (absCash >= exports.THRESHOLDS.CASH_WARN) {
            flags.push({ level: 'warn', message: `Cash Variance detected: INR ${absCash.toLocaleString()}` });
        }
        if (Math.abs(hDiff) >= exports.THRESHOLDS.TANK_WARN) {
            flags.push({ level: 'warn', message: `HSD Tank Mismatch: ${hDiff.toFixed(2)}L` });
        }
        if (Math.abs(mDiff) >= exports.THRESHOLDS.TANK_WARN) {
            flags.push({ level: 'warn', message: `MS Tank Mismatch: ${mDiff.toFixed(2)}L` });
        }
        return flags;
    }
}
exports.ReconciliationEngine = ReconciliationEngine;
