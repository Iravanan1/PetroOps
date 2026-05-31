/**
 * SupplierLedgerEngine.ts
 * ───────────────────────
 * Tracks spares, lubricants, and utility suppliers accounts payables.
 * Computes accounts payable aging profiles (15 days, 30 days, 30+ days).
 */

export interface SupplierRecord {
  id: string;
  name: string;
  gstin: string;
  contact: string;
  outstandingBalance: number;
  aging: {
    under15: number;
    under30: number;
    over30: number;
  };
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNo: string;
  date: string;
  taxableAmount: number;
  gstRate: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export class SupplierLedgerEngine {
  /**
   * Generates mock baseline suppliers roster and contact book
   */
  public static getMockSuppliers(selectedMonth: string): SupplierRecord[] {
    return [
      {
        id: 'sup-001',
        name: 'Castrol Lubricants Distributor MH',
        gstin: '27CST1122K1Z9',
        contact: '+91 98221 44021',
        outstandingBalance: 88500,
        aging: { under15: 45000, under30: 25000, over30: 18500 }
      },
      {
        id: 'sup-002',
        name: 'HPCL Fuel Refinery Division',
        gstin: '27HPC9900L1Z3',
        contact: '+91 22 2286 3900',
        outstandingBalance: 420000,
        aging: { under15: 420000, under30: 0, over30: 0 }
      },
      {
        id: 'sup-003',
        name: 'Mahavir Electricals & Power',
        gstin: '27MAH3311N1Z5',
        contact: '+91 94220 88214',
        outstandingBalance: 12500,
        aging: { under15: 12500, under30: 0, over30: 0 }
      },
      {
        id: 'sup-004',
        name: 'Speedy Spare Parts & Spares',
        gstin: '27SPD4400J1Z6',
        contact: '+91 99600 33100',
        outstandingBalance: 24500,
        aging: { under15: 12000, under30: 8500, over30: 4000 }
      }
    ];
  }

  /**
   * Generates mock invoices for supplier list
   */
  public static getMockInvoices(selectedMonth: string): SupplierInvoice[] {
    return [
      { id: 'inv-101', supplierId: 'sup-001', invoiceNo: 'INV/2026/051', date: `${selectedMonth}-05`, taxableAmount: 38135.59, gstRate: 18, totalAmount: 45000, paymentStatus: 'UNPAID' },
      { id: 'inv-102', supplierId: 'sup-001', invoiceNo: 'INV/2026/039', date: `${selectedMonth}-14`, taxableAmount: 21186.44, gstRate: 18, totalAmount: 25000, paymentStatus: 'UNPAID' },
      { id: 'inv-103', supplierId: 'sup-002', invoiceNo: 'HP/REF/99201', date: `${selectedMonth}-10`, taxableAmount: 420000.00, gstRate: 0, totalAmount: 420000, paymentStatus: 'PARTIAL' },
      { id: 'inv-104', supplierId: 'sup-003', invoiceNo: 'ME/UTIL/881', date: `${selectedMonth}-12`, taxableAmount: 10593.22, gstRate: 18, totalAmount: 12500, paymentStatus: 'UNPAID' }
    ];
  }
}
