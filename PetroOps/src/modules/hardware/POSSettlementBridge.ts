export interface POSSettlement {
  terminalId: string;
  batchId: string;
  totalTransactions: number;
  totalAmount: number;
  failedTransactions: number;
  settlementTime: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'OFFLINE';
}

export class POSSettlementBridge {
  private isConnected: boolean = false;
  private commPort: string;

  constructor(commPort: string = 'COM3') {
    this.commPort = commPort;
  }

  public connect(): void {
    console.log(`[POSBridge] Opening serial communication on ${this.commPort}...`);
    this.isConnected = true;
  }

  public disconnect(): void {
    console.log(`[POSBridge] Closing serial port ${this.commPort}.`);
    this.isConnected = false;
  }

  public getStatus(): string {
    return this.isConnected ? 'ONLINE' : 'OFFLINE';
  }

  /**
   * Polls the POS machine for the End of Day / Shift batch settlement report.
   */
  public pollSettlement(terminalId: string): POSSettlement | null {
    if (!this.isConnected) return null;

    // Simulate serial parse of settlement receipt
    const hasFailures = Math.random() > 0.85;

    return {
      terminalId,
      batchId: `BCH-${Math.floor(Math.random() * 10000)}`,
      totalTransactions: 45 + Math.floor(Math.random() * 20),
      totalAmount: 45000 + (Math.random() * 5000),
      failedTransactions: hasFailures ? Math.floor(Math.random() * 3) + 1 : 0,
      settlementTime: new Date().toISOString(),
      status: hasFailures ? 'PARTIAL' : 'SUCCESS'
    };
  }
}
