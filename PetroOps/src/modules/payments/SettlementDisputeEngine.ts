export interface PaymentDispute {
  disputeId: string;
  transactionId: string; // PhonePe/Paytm TX ID or Bank UTR
  amount: number;
  provider: "PhonePe" | "Paytm" | "SBI_Bank";
  disputeType: "MISSING_SETTLEMENT" | "DOUBLE_COMMISSION" | "MDR_FEES_MISMATCH" | "CHARGEBACK_ALERT";
  disputeStatus: "OPEN" | "UNDER_INVESTIGATION" | "RESOLVED" | "ESCALATED";
  reportedAt: number;
  lastUpdated: number;
  comments: string[];
  resolvedBy?: string;
  resolutionNotes?: string;
}

export class SettlementDisputeEngine {
  private disputes: Map<string, PaymentDispute> = new Map();

  constructor() {
    this.initializeDefaultDisputes();
  }

  private initializeDefaultDisputes() {
    this.disputes.set("DISP_1001", {
      disputeId: "DISP_1001",
      transactionId: "PP_TX_990142",
      amount: 4500.00,
      provider: "PhonePe",
      disputeType: "MISSING_SETTLEMENT",
      disputeStatus: "OPEN",
      reportedAt: Date.now() - 3600 * 24 * 1000, // 1 day ago
      lastUpdated: Date.now() - 3600 * 24 * 1000,
      comments: ["System flagged mismatch: UPI Sales recorded but missing from PhonePe settlement ID PP_PAYOUT_12."]
    });

    this.disputes.set("DISP_1002", {
      disputeId: "DISP_1002",
      transactionId: "PTM_TX_381249",
      amount: 12050.00,
      provider: "Paytm",
      disputeType: "MDR_FEES_MISMATCH",
      disputeStatus: "UNDER_INVESTIGATION",
      reportedAt: Date.now() - 3600 * 48 * 1000, // 2 days ago
      lastUpdated: Date.now() - 3600 * 12 * 1000,
      comments: [
        "Paytm deducted 1.2% commission fee instead of the contracted 0.75%.",
        "Dispute file escalated to Paytm merchant support account."
      ]
    });
  }

  public getDisputes(): PaymentDispute[] {
    return Array.from(this.disputes.values());
  }

  public logNewDispute(
    txId: string, 
    amount: number, 
    provider: "PhonePe" | "Paytm" | "SBI_Bank", 
    type: "MISSING_SETTLEMENT" | "DOUBLE_COMMISSION" | "MDR_FEES_MISMATCH" | "CHARGEBACK_ALERT",
    reason: string
  ): PaymentDispute {
    const id = `DISP_${Math.floor(1000 + Math.random() * 9000)}`;
    const dispute: PaymentDispute = {
      disputeId: id,
      transactionId: txId,
      amount,
      provider,
      disputeType: type,
      disputeStatus: "OPEN",
      reportedAt: Date.now(),
      lastUpdated: Date.now(),
      comments: [reason]
    };

    this.disputes.set(id, dispute);
    return dispute;
  }

  public updateDisputeStatus(disputeId: string, status: "UNDER_INVESTIGATION" | "RESOLVED" | "ESCALATED", user: string, notes: string): void {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute ${disputeId} not found`);
    }

    dispute.disputeStatus = status;
    dispute.lastUpdated = Date.now();
    dispute.comments.push(`[${user}] Status updated to ${status}. Details: ${notes}`);

    if (status === "RESOLVED") {
      dispute.resolvedBy = user;
      dispute.resolutionNotes = notes;
    }

    this.disputes.set(disputeId, { ...dispute });
  }
}
