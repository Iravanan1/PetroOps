export type CustomerCategory = 'FLEET' | 'BUSINESS' | 'MONTHLY' | 'STAFF';

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  gstNumber?: string;
  vehicles: string[];
  creditLimit: number;
  outstandingBalance: number; // Stored computed balance
  category: CustomerCategory;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'FUEL_SALE' | 'PAYMENT_RECOVERY' | 'ADJUSTMENT';
  amount: number;
  date: string;
  vehicleNumber?: string;
  fuelType?: string;
  litres?: number;
  paymentMode?: 'CASH' | 'CARD' | 'UPI' | 'SPLIT'; // Applicable for recoveries or split transactions
  splitDetails?: { cash?: number; upi?: number; card?: number };
  referenceId?: string; // Shift ID or Receipt Slip ID
  remarks?: string;
  isImmutable?: boolean; // True if shift is reconciled/locked
}
