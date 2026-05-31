export interface PhonePeSettlementPayload {
  merchantId: string;
  payoutId: string;
  settlementDate: string;
  grossAmount: number;
  mdrCharge: number;
  gstOnMdr: number;
  netAmount: number;
  transactionCount: number;
  status: "SETTLED" | "PENDING" | "FAILED";
  bankReferenceId: string;
  transactionsList: Array<{
    phonePeTxId: string;
    merchantTxId: string;
    amount: number;
    commissionRatePercent: number;
    settledAt: string;
  }>;
}

export class PhonePeSettlementEngine {
  private static readonly MDR_PERCENT = 0.008; // 0.8% standard MDR
  private static readonly GST_ON_MDR_PERCENT = 0.18; // 18% GST on MDR charges

  constructor() {}

  /**
   * Process and validate a PhonePe payment settlement report
   */
  public processSettlementPayload(payload: PhonePeSettlementPayload): {
    isValid: boolean;
    calculatedGross: number;
    calculatedMdr: number;
    calculatedGst: number;
    calculatedNet: number;
    variance: number;
  } {
    let calculatedGross = 0;
    
    // Sum transactions
    payload.transactionsList.forEach(tx => {
      calculatedGross += tx.amount;
    });

    const calculatedMdr = parseFloat((calculatedGross * PhonePeSettlementEngine.MDR_PERCENT).toFixed(2));
    const calculatedGst = parseFloat((calculatedMdr * PhonePeSettlementEngine.GST_ON_MDR_PERCENT).toFixed(2));
    const calculatedNet = parseFloat((calculatedGross - (calculatedMdr + calculatedGst)).toFixed(2));

    const variance = parseFloat((payload.netAmount - calculatedNet).toFixed(2));
    const isValid = Math.abs(variance) < 0.01; // Allow sub-penny rounding variance

    return {
      isValid,
      calculatedGross,
      calculatedMdr,
      calculatedGst,
      calculatedNet,
      variance
    };
  }

  /**
   * Generates a mock settlement payload for testing/reconciliation runs
   */
  public generateMockSettlement(merchantId: string, baseSalesAmount: number, txCount: number): PhonePeSettlementPayload {
    const transactionsList = Array.from({ length: txCount }).map((_, idx) => {
      const amt = parseFloat((baseSalesAmount / txCount + (Math.random() - 0.5) * 10).toFixed(2));
      return {
        phonePeTxId: `PP_TX_${Math.floor(100000 + Math.random() * 900000)}`,
        merchantTxId: `PUMP_AI_UPI_${Date.now().toString().slice(-6)}_${idx}`,
        amount: amt,
        commissionRatePercent: PhonePeSettlementEngine.MDR_PERCENT * 100,
        settledAt: new Date().toISOString()
      };
    });

    const gross = transactionsList.reduce((acc, tx) => acc + tx.amount, 0);
    const mdr = parseFloat((gross * PhonePeSettlementEngine.MDR_PERCENT).toFixed(2));
    const gst = parseFloat((mdr * PhonePeSettlementEngine.GST_ON_MDR_PERCENT).toFixed(2));
    const net = parseFloat((gross - (mdr + gst)).toFixed(2));

    return {
      merchantId,
      payoutId: `PP_PAYOUT_${Math.floor(10000000 + Math.random() * 90000000)}`,
      settlementDate: new Date().toISOString().split("T")[0],
      grossAmount: parseFloat(gross.toFixed(2)),
      mdrCharge: mdr,
      gstOnMdr: gst,
      netAmount: net,
      transactionCount: txCount,
      status: "SETTLED",
      bankReferenceId: `SBI_UTR_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      transactionsList
    };
  }
}
