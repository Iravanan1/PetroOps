/**
 * SmartReportingEngine.ts
 * ────────────────────────
 * Generates structured plain text or CSV formats for daily pump revenue summaries,
 * operator shortages, and wetstock shrinkage.
 */

export interface DailyReportSummary {
  date: string;
  totalRevenue: number;
  totalLitres: number;
  cashShortages: number;
  unpaidCredit: number;
  reconciliationStatus: string;
}

export class SmartReportingEngine {
  /**
   * Compiles daily summaries into plain text tables for thermal printing falls
   */
  public static compileTextSummary(data: DailyReportSummary): string {
    const dashes = '-'.repeat(40);
    return `
${dashes}
    PUMP DAILY OPERATIONAL SUMMARY
${dashes}
Date           : ${data.date}
Total Revenue  : ₹${data.totalRevenue.toLocaleString()}
Total Litres   : ${data.totalLitres.toLocaleString()}L
Till Shortages : ₹${data.cashShortages.toLocaleString()}
Unpaid Credit  : ₹${data.unpaidCredit.toLocaleString()}
Recon Status   : ${data.reconciliationStatus}
${dashes}
Generated: ${new Date().toLocaleTimeString()}
System: PumpAI ERP — pumpai.in
${dashes}
    `.trim();
  }

  /**
   * Generates CSV string for accounting ledger sync
   */
  public static generateAccountingCSV(records: DailyReportSummary[]): string {
    const header = 'Date,TotalRevenue,TotalLitres,CashShortages,UnpaidCredit,ReconStatus\n';
    const rows = records.map(r => 
      `${r.date},${r.totalRevenue},${r.totalLitres},${r.cashShortages},${r.unpaidCredit},${r.reconciliationStatus}`
    ).join('\n');
    return header + rows;
  }
}

export default SmartReportingEngine;
