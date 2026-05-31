export interface SBIRecord {
  utr: string;
  transactionDate: string;
  valueDate: string;
  description: string;
  depositAmount: number;
  withdrawalAmount: number;
  balanceAfter: number;
  referenceNo: string;
}

export interface ReconciledSalesMatch {
  utr: string;
  bankRecordDate: string;
  salesRecordDate: string;
  amountBank: number;
  amountSales: number;
  discrepancy: number;
  status: "MATCHED" | "DISCREPANT" | "UNMATCHED_BANK" | "UNMATCHED_SALES";
}

export class SBIReconciliationEngine {
  constructor() {}

  /**
   * Performs dual-matching logic between bank SBI deposits and recorded sales transaction logs
   */
  public reconcileSBIStatement(
    bankRecords: SBIRecord[], 
    salesRecords: Array<{ rrnOrTxId: string; amount: number; date: string }>
  ): ReconciledSalesMatch[] {
    const matches: ReconciledSalesMatch[] = [];
    const matchedBankUtrs: Set<string> = new Set();
    const matchedSalesTxIds: Set<string> = new Set();

    // Loop through SBI statements deposits
    bankRecords.forEach(bank => {
      // Find matching sales log
      // Bank UTR matches sales references (RRN or Transaction ID)
      const exactSalesMatch = salesRecords.find(sales => 
        (sales.rrnOrTxId === bank.utr || bank.description.includes(sales.rrnOrTxId)) && 
        !matchedSalesTxIds.has(sales.rrnOrTxId)
      );

      if (exactSalesMatch) {
        matchedBankUtrs.add(bank.utr);
        matchedSalesTxIds.add(exactSalesMatch.rrnOrTxId);

        const discrepancy = parseFloat((bank.depositAmount - exactSalesMatch.amount).toFixed(2));
        matches.push({
          utr: bank.utr,
          bankRecordDate: bank.transactionDate,
          salesRecordDate: exactSalesMatch.date,
          amountBank: bank.depositAmount,
          amountSales: exactSalesMatch.amount,
          discrepancy,
          status: Math.abs(discrepancy) < 0.01 ? "MATCHED" : "DISCREPANT"
        });
      } else {
        // Unmatched deposit in SBI statement
        matches.push({
          utr: bank.utr,
          bankRecordDate: bank.transactionDate,
          salesRecordDate: "N/A",
          amountBank: bank.depositAmount,
          amountSales: 0,
          discrepancy: bank.depositAmount,
          status: "UNMATCHED_BANK"
        });
      }
    });

    // Capture sales records unmatched in SBI statement
    salesRecords.forEach(sales => {
      if (!matchedSalesTxIds.has(sales.rrnOrTxId)) {
        matches.push({
          utr: sales.rrnOrTxId,
          bankRecordDate: "N/A",
          salesRecordDate: sales.date,
          amountBank: 0,
          amountSales: sales.amount,
          discrepancy: -sales.amount,
          status: "UNMATCHED_SALES"
        });
      }
    });

    return matches;
  }

  /**
   * Generates mock SBI ledger transactions records
   */
  public generateMockSBIRecords(baseSales: Array<{ utr: string; amount: number }>): SBIRecord[] {
    let balance = 1504281.35;
    return baseSales.map((sales, idx) => {
      balance += sales.amount;
      return {
        utr: sales.utr,
        transactionDate: new Date().toISOString().split("T")[0],
        valueDate: new Date().toISOString().split("T")[0],
        description: `IMPS/UPI-OUT/PAYOUT/${sales.utr}/PUMPAI`,
        depositAmount: sales.amount,
        withdrawalAmount: 0,
        balanceAfter: parseFloat(balance.toFixed(2)),
        referenceNo: `SBI_REF_${Math.floor(100000000 + Math.random() * 900000000)}`
      };
    });
  }
}
