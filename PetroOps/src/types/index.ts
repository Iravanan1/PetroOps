import { z } from 'zod';

export type UserRole = 'customer' | 'employee' | 'operator' | 'manager' | 'admin' | 'super_admin' | 'owner';

export interface UserProfile {
  uid: string;
  tenantId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phoneNumber?: string | null;
  createdAt: string;
  lastLogin: string;
  pumpId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketType = 'support' | 'access_request' | 'billing' | 'technical';

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  assignedTo?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  accessDuration?: number;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecordStatus = 'pending' | 'PROCESSING' | 'extracted' | 'validated' | 'reconciled' | 'archived' | 'flagged' | 'APPROVED' | 'NEEDS_REVIEW' | 'FAILED';

export type FuelType = 'hsd' | 'ms' | 'SPEED' | 'HSD' | 'MS';
export type ShiftType = 'D' | 'N';
export type AlertLevel = 'info' | 'warn' | 'error' | 'theft' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NozzleReading {
  id: number;
  nozzleId?: string;
  fuel: FuelType;
  opening: string | number;
  closing: string | number;
  testing: string | number;
  active?: boolean;
  fuelRate?: number;
  netSales?: number;
}

export interface MoneyEntry {
  _id: string | number;
  desc: string;
  amount: string | number;
}

export interface ShiftRecord {
  id: string;
  userId?: string;
  operatorId?: string;
  tenantId?: string;
  pumpId?: string;
  date?: string;
  shiftDate?: string;
  shift?: ShiftType;
  shiftLabel?: string;
  status: RecordStatus;
  
  // Fuel Data
  hsd?: NozzleReading[];
  ms?: NozzleReading[];
  readings?: NozzleReading[];
  hsdTestingExpense?: string;
  msTestingExpense?: string;
  
  // Sales Data
  paytm?: string[];
  card?: string[];
  upiSales?: number;
  upiSplits?: Record<string, number>;
  cardSales?: number;
  creditSales?: number;
  credit?: MoneyEntry[];
  creditRecovery?: MoneyEntry[] | number;
  creditRecoverySplits?: { cash?: number; upi?: number; card?: number };
  expenses?: MoneyEntry[] | number;
  creditEntries?: CreditCustomerOcrEntry[];
  
  // Cash Data
  openingCash: string | number;
  actualCash: string | number;
  cashShortage?: number;
  
  // Tank/Dip Data
  tankHsdOpening?: string;
  tankHsdReceived?: string;
  tankHsdClosing?: string;
  tankMsOpening?: string;
  tankMsReceived?: string;
  tankMsClosing?: string;
  
  // Rates
  hsdSellRate?: string;
  msSellRate?: string;
  hsdBuyRate?: string;
  msBuyRate?: string;
  
  // Metadata
  imageUrl?: string;
  rawImageUrls?: string[];
  confidenceScore?: number;
  ocrConfidence?: number;
  aiConfidence?: number;
  validationScore?: number;
  validationDiscrepancies?: string[];
  notes?: string;
  auditHistory?: {
    editor: string;
    timestamp: string;
    previousValues: Record<string, any>;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditIssue {
  id?: string;
  tenantId?: string;
  level: AlertLevel;
  date: string;
  shift?: ShiftType;
  message: string;
  anomalyType?: string;
  severity?: string;
  description?: string;
}

// Zod Validation Schemas (from Version 4)
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
export type CreditCustomerOcrEntry = z.infer<typeof CreditCustomerOcrEntrySchema>;

export const NozzleReadingSchema = z.object({
  nozzleId: z.string().default(() => crypto.randomUUID()),
  fuelType: z.enum(['MS', 'HSD', 'SPEED']),
  openingMeter: z.number().nonnegative(),
  closingMeter: z.number().nonnegative(),
  testingQty: z.number().nonnegative().default(0),
  netSales: z.number().nonnegative(),
  fuelRate: z.number().positive().default(100),
}).refine(data => {
  const calculatedNet = Number((data.closingMeter - data.openingMeter - data.testingQty).toFixed(2));
  const expectedNet = Number(data.netSales.toFixed(2));
  return Math.abs(calculatedNet - expectedNet) <= 0.5;
}, { message: "Meter readings do not match net sales" });

export const ShiftExtractionSchema = z.object({
  shiftDate: z.string(),
  shiftLabel: z.string().min(2),
  openingCash: z.number().nonnegative(),
  actualCash: z.number().nonnegative(),
  expenses: z.number().nonnegative().default(0),
  upiSales: z.number().nonnegative().default(0),
  cardSales: z.number().nonnegative().default(0),
  creditSales: z.number().nonnegative().default(0),
  creditRecovery: z.number().nonnegative().default(0),
  readings: z.array(NozzleReadingSchema),
  creditEntries: z.array(CreditCustomerOcrEntrySchema).default([]),
  confidenceScore: z.number().min(0).max(100)
});

export type ShiftExtraction = z.infer<typeof ShiftExtractionSchema>;
export type NozzleReadingOcr = z.infer<typeof NozzleReadingSchema>;

export interface DailyRecord {
  date: string;
  hsdL: number;
  msL: number;
  revenue: number;
  paytm: number;
  credit: number;
  recovery: number;
  expenses: number;
  profit: number;
  cashDiff: number;
  hsdTankDiff: number | null;
  msTankDiff: number | null;
  hasDay: boolean;
  hasNight: boolean;
  alerts: AuditIssue[];
  netCredit: number;
}
