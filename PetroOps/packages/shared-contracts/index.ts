import { z } from 'zod';

export const SaleContractSchema = z.object({
  id: z.string().uuid().optional(),
  shiftId: z.string().uuid(),
  nozzleId: z.string().uuid(),
  litersSold: z.number().positive(),
  pricePerLiter: z.number().positive(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CREDIT_CARD', 'FLEET_CARD']),
  startTotalizer: z.number(),
  endTotalizer: z.number(),
  timestamp: z.string().datetime().optional()
});

export const DipReadingContractSchema = z.object({
  id: z.string().uuid().optional(),
  tankId: z.string().uuid(),
  readingType: z.enum(['MANUAL', 'AUTOMATIC']),
  fuelLevelMm: z.number().nonnegative(),
  waterLevelMm: z.number().nonnegative(),
  litersCalculated: z.number().nonnegative(),
  timestamp: z.string().datetime().optional()
});

export const ShiftContractSchema = z.object({
  id: z.string().uuid().optional(),
  stationId: z.string().uuid(),
  supervisorId: z.string().uuid(),
  shiftName: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  isClosed: z.boolean().default(false),
  cashExpected: z.number().nonnegative(),
  cashCollected: z.number().nonnegative(),
  variance: z.number()
});

export const SyncMutationSchema = z.object({
  id: z.string().uuid(),
  table: z.enum(['Sale', 'DipReading', 'Shift', 'LedgerBook']),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  data: z.any(),
  timestamp: z.string().datetime(),
  sequenceNo: z.number()
});

export const SyncPayloadSchema = z.object({
  stationId: z.string().uuid(),
  clientId: z.string(),
  lastSyncTimestamp: z.string().datetime(),
  mutationsQueue: z.array(SyncMutationSchema)
});

export type SaleContract = z.infer<typeof SaleContractSchema>;
export type DipReadingContract = z.infer<typeof DipReadingContractSchema>;
export type ShiftContract = z.infer<typeof ShiftContractSchema>;
export type SyncMutation = z.infer<typeof SyncMutationSchema>;
export type SyncPayload = z.infer<typeof SyncPayloadSchema>;
