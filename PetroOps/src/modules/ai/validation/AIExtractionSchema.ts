import { z } from 'zod';

export const FuelTotalSchema = z.object({
  fuelType: z.string(),
  totalLitres: z.number().nonnegative(),
});

export const NozzleReadingSchema = z.object({
  nozzleId: z.string(),
  fuelType: z.string().default('MS'),
  openingMeter: z.number().nonnegative(),
  closingMeter: z.number().nonnegative(),
  testingQty: z.number().nonnegative().default(0),
  netSales: z.number().nonnegative(),
  fuelRate: z.number().positive(),
});

export const TestingLitreSchema = z.object({
  fuelType: z.string(),
  litres: z.number().nonnegative(),
});

export const FieldConfidenceSchema = z.object({
  actualCash: z.number().min(0).max(1).default(1),
  cardSales: z.number().min(0).max(1).default(1),
  upiSales: z.number().min(0).max(1).default(1),
  nozzleClose: z.number().min(0).max(1).default(1),
});

export const CreditCustomerOcrEntrySchema = z.object({
  customerName: z.string(),
  amount: z.number().nonnegative(),
  date: z.string(),
  shiftId: z.string().optional().nullable(),
  paymentStatus: z.enum(['pending', 'paid']).default('pending'),
  notes: z.string().optional().nullable(),
  confidence: z.number().min(0).max(100),
  reviewStatus: z.enum(['clean', 'needs_review']).default('clean'),
});

export const AIExtractionSchema = z.object({
  shiftDate: z.string(),
  operatorName: z.string(),
  openingCash: z.number().nonnegative(),
  actualCash: z.number().nonnegative(),
  cardSales: z.number().nonnegative().default(0),
  upiSales: z.number().nonnegative().default(0),
  creditSales: z.number().nonnegative().default(0),
  creditRecovery: z.number().nonnegative().default(0),
  creditRecoverySplits: z.object({
    cash: z.number().nonnegative().default(0),
    upi: z.number().nonnegative().default(0),
    card: z.number().nonnegative().default(0)
  }).optional(),
  expenses: z.number().nonnegative().default(0),
  fuelTotals: z.array(FuelTotalSchema).default([]),
  nozzleReadings: z.array(NozzleReadingSchema),
  testingLitres: z.array(TestingLitreSchema).default([]),
  creditEntries: z.array(CreditCustomerOcrEntrySchema).default([]),
  confidence: z.number().min(0).max(100),
  fieldConfidence: FieldConfidenceSchema,
  warnings: z.array(z.string()).default([]),
});

export type AIExtraction = z.infer<typeof AIExtractionSchema>;
export type FuelTotal = z.infer<typeof FuelTotalSchema>;
export type NozzleReading = z.infer<typeof NozzleReadingSchema>;
export type TestingLitre = z.infer<typeof TestingLitreSchema>;
export type FieldConfidence = z.infer<typeof FieldConfidenceSchema>;
export type CreditCustomerOcrEntry = z.infer<typeof CreditCustomerOcrEntrySchema>;


