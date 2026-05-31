"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIExtractionSchema = exports.CreditCustomerOcrEntrySchema = exports.FieldConfidenceSchema = exports.TestingLitreSchema = exports.NozzleReadingSchema = exports.FuelTotalSchema = void 0;
const zod_1 = require("zod");
exports.FuelTotalSchema = zod_1.z.object({
    fuelType: zod_1.z.string(),
    totalLitres: zod_1.z.number().nonnegative(),
});
exports.NozzleReadingSchema = zod_1.z.object({
    nozzleId: zod_1.z.string(),
    fuelType: zod_1.z.string().default('MS'),
    openingMeter: zod_1.z.number().nonnegative(),
    closingMeter: zod_1.z.number().nonnegative(),
    testingQty: zod_1.z.number().nonnegative().default(0),
    netSales: zod_1.z.number().nonnegative(),
    fuelRate: zod_1.z.number().positive(),
});
exports.TestingLitreSchema = zod_1.z.object({
    fuelType: zod_1.z.string(),
    litres: zod_1.z.number().nonnegative(),
});
exports.FieldConfidenceSchema = zod_1.z.object({
    actualCash: zod_1.z.number().min(0).max(1).default(1),
    cardSales: zod_1.z.number().min(0).max(1).default(1),
    upiSales: zod_1.z.number().min(0).max(1).default(1),
    nozzleClose: zod_1.z.number().min(0).max(1).default(1),
});
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
exports.AIExtractionSchema = zod_1.z.object({
    shiftDate: zod_1.z.string(),
    operatorName: zod_1.z.string(),
    openingCash: zod_1.z.number().nonnegative(),
    actualCash: zod_1.z.number().nonnegative(),
    cardSales: zod_1.z.number().nonnegative().default(0),
    upiSales: zod_1.z.number().nonnegative().default(0),
    creditSales: zod_1.z.number().nonnegative().default(0),
    creditRecovery: zod_1.z.number().nonnegative().default(0),
    creditRecoverySplits: zod_1.z.object({
        cash: zod_1.z.number().nonnegative().default(0),
        upi: zod_1.z.number().nonnegative().default(0),
        card: zod_1.z.number().nonnegative().default(0)
    }).optional(),
    expenses: zod_1.z.number().nonnegative().default(0),
    fuelTotals: zod_1.z.array(exports.FuelTotalSchema).default([]),
    nozzleReadings: zod_1.z.array(exports.NozzleReadingSchema),
    testingLitres: zod_1.z.array(exports.TestingLitreSchema).default([]),
    creditEntries: zod_1.z.array(exports.CreditCustomerOcrEntrySchema).default([]),
    confidence: zod_1.z.number().min(0).max(100),
    fieldConfidence: exports.FieldConfidenceSchema,
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
});
