export interface PaytmSettlementPayload {
  mid: string;
  settlementId: string;
  utr: string;
  settlementDate: string;
  totalGrossAmount: number;
  totalCommissionCharges: number; // MDR + other fees
  taxCharges: number; // GST
  settlementAmount: number; // Net payout
  transactionCount: number;
  status: "DEPOSITED" | "PENDING" | "FAILED";
  transactions: Array<{
    paytmTxId: string;
    orderId: string;
    amount: number;
    fee: number;
    tax: number;
    net: number;
    transactionDate: string;
  }>;
}

export class PaytmSettlementEngine {
  private static readonly FEE_RATE = 0.0075; // 0.75% standard Paytm fee
  private static readonly GST_RATE = 0.18; // 18% GST

  constructor() {}

  /**
   * Evaluates and audits paytm settlement parameters
   */
  public evaluatePaytmPayload(payload: PaytmSettlementPayload): {
    reconciled: boolean;
    calculatedGross: number;
    calculatedCharges: number;
    calculatedTax: number;
    calculatedNet: number;
    discrepancy: number;
  } {
    let calculatedGross = 0;
    let calculatedCharges = 0;
    let calculatedTax = 0;
    let calculatedNet = 0;

    payload.transactions.forEach(t => {
      calculatedGross += t.amount;
      const expectedFee = parseFloat((t.amount * PaytmSettlementEngine.FEE_RATE).toFixed(2));
      const expectedTax = parseFloat((expectedFee * PaytmSettlementEngine.GST_RATE).toFixed(2));
      const expectedNet = parseFloat((t.amount - (expectedFee + expectedTax)).toFixed(2));

      calculatedCharges += expectedFee;
      calculatedTax += expectedTax;
      calculatedNet += expectedNet;
    });

    calculatedGross = parseFloat(calculatedGross.toFixed(2));
    calculatedCharges = parseFloat(calculatedCharges.toFixed(2));
    calculatedTax = parseFloat(calculatedTax.toFixed(2));
    calculatedNet = parseFloat(calculatedNet.toFixed(2));

    const discrepancy = parseFloat((payload.settlementAmount - calculatedNet).toFixed(2));
    const reconciled = Math.abs(discrepancy) < 0.01;

    return {
      reconciled,
      calculatedGross,
      calculatedCharges,
      calculatedTax,
      calculatedNet,
      discrepancy
    };
  }

  /**
   * Generates Paytm mock settlement report
   */
  public simulatePaytmSettlement(mid: string, targetGross: number, txCount: number): PaytmSettlementPayload {
    const transactions = Array.from({ length: txCount }).map((_, idx) => {
      const amt = parseFloat((targetGross / txCount + (Math.random() - 0.5) * 5).toFixed(2));
      const fee = parseFloat((amt * PaytmSettlementEngine.FEE_RATE).toFixed(2));
      const tax = parseFloat((fee * PaytmSettlementEngine.GST_RATE).toFixed(2));
      const net = parseFloat((amt - (fee + tax)).toFixed(2));

      return {
        paytmTxId: `PTM_TX_${Math.floor(1000000 + Math.random() * 9000000)}`,
        orderId: `PUMP_AI_UPI_${Date.now().toString().slice(-6)}_${idx}`,
        amount: amt,
        fee,
        tax,
        net,
        transactionDate: new Date().toISOString()
      };
    });

    const totalGross = transactions.reduce((acc, t) => acc + t.amount, 0);
    const totalCommission = transactions.reduce((acc, t) => acc + t.fee, 0);
    const taxCharges = transactions.reduce((acc, t) => acc + t.tax, 0);
    const netPayout = transactions.reduce((acc, t) => acc + t.net, 0);

    return {
      mid,
      settlementId: `PTM_SETTLE_${Math.floor(10000 + Math.random() * 90000)}`,
      utr: `PTM_UTR_${Math.floor(1000000000 + Math.random() * 900000000)}`,
      settlementDate: new Date().toISOString().split("T")[0],
      totalGrossAmount: parseFloat(totalGross.toFixed(2)),
      totalCommissionCharges: parseFloat(totalCommission.toFixed(2)),
      taxCharges: parseFloat(taxCharges.toFixed(2)),
      settlementAmount: parseFloat(netPayout.toFixed(2)),
      transactionCount: txCount,
      status: "DEPOSITED",
      transactions
    };
  }
}
