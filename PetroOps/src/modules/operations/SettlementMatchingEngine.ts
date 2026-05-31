/**
 * SettlementMatchingEngine.ts
 * ────────────────────────────
 * Reconciles cashier collections book with portal logs and actual bank deposit credits.
 * Automatically flags digital settlement transits, delays, and transaction value mismatches.
 */

export interface BankTransaction {
  id: string;
  date: string;
  description: string; // e.g. "SETTLEMENT PAYTM PUMP 1"
  creditAmount: number;
  referenceNo: string;
}

export interface ShiftDigitalSale {
  id: string;
  shiftId: string;
  date: string;
  gateway: 'paytm' | 'phonepe' | 'bharatpe' | 'card_pos' | 'gpay';
  cashierAmount: number;
  portalAmount?: number;
  settlementStatus: 'MATCHED' | 'PENDING_SETTLEMENT' | 'MISMATCH' | 'OVERRIDDEN';
  delayDays?: number;
  matchingTxId?: string;
  auditComment?: string;
}

export class SettlementMatchingEngine {
  /**
   * Evaluates collections ledger against bank credits to match settlements.
   */
  public static matchSettlements(
    sales: ShiftDigitalSale[],
    bankTx: BankTransaction[]
  ): ShiftDigitalSale[] {
    return sales.map(sale => {
      // Find matching transaction in bank records
      // Look for a transaction that occurred on the same day or up to 2 days later,
      // with a description matching the gateway and amount matching cashier value
      const matching = bankTx.find(tx => {
        const isSameAmount = Math.abs(tx.creditAmount - sale.cashierAmount) < 1.0;
        const matchesGateway = tx.description.toLowerCase().includes(sale.gateway.toLowerCase());
        
        const saleDate = new Date(sale.date);
        const txDate = new Date(tx.date);
        const diffTime = txDate.getTime() - saleDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return isSameAmount && matchesGateway && diffDays >= 0 && diffDays <= 2;
      });

      if (matching) {
        const saleDate = new Date(sale.date);
        const txDate = new Date(matching.date);
        const diffDays = Math.max(0, Math.ceil((txDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          ...sale,
          portalAmount: matching.creditAmount,
          settlementStatus: 'MATCHED',
          delayDays: diffDays,
          matchingTxId: matching.id
        };
      }

      // Check if portal has it recorded but bank hasn't received it yet (simulated logic)
      if (sale.portalAmount && Math.abs(sale.portalAmount - sale.cashierAmount) >= 1.0) {
        return {
          ...sale,
          settlementStatus: 'MISMATCH',
          auditComment: `Variance of ₹${Math.abs(sale.portalAmount - sale.cashierAmount)} detected between Cashier register & Gateway Portal.`
        };
      }

      return {
        ...sale,
        settlementStatus: 'PENDING_SETTLEMENT',
        auditComment: 'Transaction pending credit settlement in Bank Account (Transit).'
      };
    });
  }

  /**
   * Generates mock bank ledger transactions for reconciliation demo
   */
  public static generateMockTransactions(selectedMonth: string): BankTransaction[] {
    return [
      { id: 'tx-001', date: `${selectedMonth}-10`, description: 'SETTLEMENT PAYTM CREDIT', creditAmount: 24500, referenceNo: 'REF-PAYTM-9921' },
      { id: 'tx-002', date: `${selectedMonth}-11`, description: 'PHONEPE SETTLEMENT PUMP', creditAmount: 18200, referenceNo: 'REF-PPE-1294' },
      { id: 'tx-003', date: `${selectedMonth}-12`, description: 'BHARATPE SETTLEMENT STN', creditAmount: 14500, referenceNo: 'REF-BPE-8831' },
      { id: 'tx-004', date: `${selectedMonth}-13`, description: 'SBI CARD SETTLE POS', creditAmount: 31200, referenceNo: 'REF-POS-4401' },
      { id: 'tx-005', date: `${selectedMonth}-14`, description: 'SETTLEMENT PAYTM CREDIT', creditAmount: 28800, referenceNo: 'REF-PAYTM-3112' },
      { id: 'tx-006', date: `${selectedMonth}-15`, description: 'PHONEPE SETTLEMENT PUMP', creditAmount: 19100, referenceNo: 'REF-PPE-9031' }
    ];
  }

  /**
   * Generates mock shift cashier registers
   */
  public static generateMockCashierRegisters(selectedMonth: string): ShiftDigitalSale[] {
    return [
      { id: 'sale-001', shiftId: 'shift-101', date: `${selectedMonth}-09`, gateway: 'paytm', cashierAmount: 24500, portalAmount: 24500, settlementStatus: 'PENDING_SETTLEMENT' },
      { id: 'sale-002', shiftId: 'shift-101', date: `${selectedMonth}-10`, gateway: 'phonepe', cashierAmount: 18200, portalAmount: 18200, settlementStatus: 'PENDING_SETTLEMENT' },
      { id: 'sale-003', shiftId: 'shift-102', date: `${selectedMonth}-11`, gateway: 'bharatpe', cashierAmount: 14500, portalAmount: 14500, settlementStatus: 'PENDING_SETTLEMENT' },
      { id: 'sale-004', shiftId: 'shift-102', date: `${selectedMonth}-12`, gateway: 'card_pos', cashierAmount: 31200, portalAmount: 31200, settlementStatus: 'PENDING_SETTLEMENT' },
      // Paytm mismatch
      { id: 'sale-005', shiftId: 'shift-103', date: `${selectedMonth}-13`, gateway: 'paytm', cashierAmount: 28920, portalAmount: 28800, settlementStatus: 'PENDING_SETTLEMENT' },
      // PhonePe transit pending
      { id: 'sale-006', shiftId: 'shift-104', date: `${selectedMonth}-16`, gateway: 'phonepe', cashierAmount: 22000, portalAmount: undefined, settlementStatus: 'PENDING_SETTLEMENT' }
    ];
  }
}
