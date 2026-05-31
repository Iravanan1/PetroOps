"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftExtractionSchema = exports.NozzleReadingSchema = exports.CreditCustomerOcrEntrySchema = void 0;
const zod_1 = require("zod");
// Zod Validation Schemas (from Version 4)
exports.CreditCustomerOcrEntrySchema = zod_1.z.object({
    customerName: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative(),
    date: zod_1.z.string(),
    shiftId: zod_1.z.string().optional().nullable(),
    paymentStatus: zod_1.z.enum(['pending', 'paid']).default('pending'),
    notes: zod_1.z.string().optional().nullable(),
    confidence: zod_1.z.number().min(0).max(100),
    reviewStatus: zod_1.z.enum(['clean', 'needs_review']).default('clean'),
});
exports.NozzleReadingSchema = zod_1.z.object({
    nozzleId: zod_1.z.string().default(() => crypto.randomUUID()),
    fuelType: zod_1.z.enum(['MS', 'HSD', 'SPEED']),
    openingMeter: zod_1.z.number().nonnegative(),
    closingMeter: zod_1.z.number().nonnegative(),
    testingQty: zod_1.z.number().nonnegative().default(0),
    netSales: zod_1.z.number().nonnegative(),
    fuelRate: zod_1.z.number().positive().default(100),
}).refine(data => {
    const calculatedNet = Number((data.closingMeter - data.openingMeter - data.testingQty).toFixed(2));
    const expectedNet = Number(data.netSales.toFixed(2));
    return Math.abs(calculatedNet - expectedNet) <= 0.5;
}, { message: "Meter readings do not match net sales" });
exports.ShiftExtractionSchema = zod_1.z.object({
    shiftDate: zod_1.z.string(),
    shiftLabel: zod_1.z.string().min(2),
    openingCash: zod_1.z.number().nonnegative(),
    actualCash: zod_1.z.number().nonnegative(),
    expenses: zod_1.z.number().nonnegative().default(0),
    upiSales: zod_1.z.number().nonnegative().default(0),
    cardSales: zod_1.z.number().nonnegative().default(0),
    creditSales: zod_1.z.number().nonnegative().default(0),
    creditRecovery: zod_1.z.number().nonnegative().default(0),
    readings: zod_1.z.array(exports.NozzleReadingSchema),
    creditEntries: zod_1.z.array(exports.CreditCustomerOcrEntrySchema).default([]),
    confidenceScore: zod_1.z.number().min(0).max(100)
});
