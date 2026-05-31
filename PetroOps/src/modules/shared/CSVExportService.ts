/**
 * CSVExportService
 * ─────────────────
 * Tabular exporter for accountant-grade data downloads.
 *
 * Exports:
 *  1. Ledger transaction journal (double-entry format)
 *  2. Daily snapshot summary
 *  3. GST-compliant fuel sales summary
 *  4. Nozzle register log
 */
import { LedgerTransaction } from '../accounting/TransactionNormalizer';
import { CanonicalSnapshot } from '../snapshots/CanonicalSnapshotEngine';

export class CSVExportService {
  // ── Helpers ────────────────────────────────────────────────────────
  private static escape(value: string | number | boolean): string {
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private static buildCSV(headers: string[], rows: (string | number | boolean)[][]): string {
    const lines = [
      headers.map(h => this.escape(h)).join(','),
      ...rows.map(row => row.map(v => this.escape(v)).join(','))
    ];
    return lines.join('\r\n');
  }

  private static downloadCSV(csv: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── 1. Transaction Journal ─────────────────────────────────────────
  public static exportTransactionJournal(
    transactions: LedgerTransaction[],
    branchName: string
  ): void {
    const headers = [
      'Transaction ID', 'Date', 'Seq ID', 'Branch',
      'Debit Account', 'Credit Account', 'Amount (INR)',
      'Description', 'Source Document', 'OCR Confidence (%)', 'Checksum'
    ];
    const rows = transactions
      .sort((a, b) => a.date.localeCompare(b.date) || a.sequenceId - b.sequenceId)
      .map(tx => [
        tx.id, tx.date, tx.sequenceId, tx.branchId,
        tx.debitAccount, tx.creditAccount,
        tx.amount.toFixed(2), tx.description,
        tx.sourceDocumentId ?? '', tx.ocrConfidence ?? 100,
        tx.checksum
      ] as (string | number)[]
    );
    const csv = this.buildCSV(headers, rows);
    this.downloadCSV(csv, `${branchName}_journal_${Date.now()}.csv`);
  }

  // ── 2. Daily Snapshot Summary ──────────────────────────────────────
  public static exportSnapshotSummary(
    snapshots: CanonicalSnapshot[],
    branchName: string
  ): void {
    const headers = [
      'Date', 'Timeframe', 'Opening Cash (INR)', 'Closing Cash (INR)',
      'Total Revenue (INR)', 'Cash Collected (INR)',
      'UPI Settled (INR)', 'Card Settled (INR)',
      'Credit Outstanding (INR)', 'Credit Recovered (INR)',
      'Expenses (INR)', 'Wet Stock Variance (L)',
      'Balanced', 'Valid', 'Carry Forward Match',
      'Replay Checksum', 'Locked At'
    ];
    const rows = snapshots.map(s => [
      s.date, s.timeframe,
      s.openingCash.toFixed(2), s.closingCash.toFixed(2),
      s.totalRevenue.toFixed(2), s.totalCashCollected.toFixed(2),
      s.totalUPISettled.toFixed(2), s.totalCardSettled.toFixed(2),
      s.totalOutstandingCredit.toFixed(2), s.totalCreditRecovered.toFixed(2),
      s.totalExpensesPaid.toFixed(2), s.wetstockVariance.toFixed(2),
      s.isBalanced ? 'YES' : 'NO',
      s.isValid ? 'YES' : 'NO',
      s.carryForwardMatch ? 'YES' : 'NO',
      s.replayChecksum, s.lockedAt
    ] as (string | number)[]
    );
    const csv = this.buildCSV(headers, rows);
    this.downloadCSV(csv, `${branchName}_snapshots_${Date.now()}.csv`);
  }

  // ── 3. GST Fuel Sales Summary ──────────────────────────────────────
  public static exportGSTSummary(params: {
    branchName: string;
    gstin: string;
    period: string;  // YYYY-MM
    fuelSales: Array<{
      fuelType: string;
      litresSold: number;
      ratePerLitre: number;
      totalValue: number;
      gstRate: number;   // e.g. 28 for 28%
      gstAmount: number;
      taxableValue: number;
    }>;
  }): void {
    const { branchName, gstin, period, fuelSales } = params;

    const headers = [
      'GSTIN', 'Branch', 'Period',
      'Fuel Type', 'Litres Sold', 'Rate/Litre (INR)',
      'Taxable Value (INR)', 'GST Rate (%)', 'GST Amount (INR)',
      'Total Invoice Value (INR)'
    ];

    const rows = fuelSales.map(s => [
      gstin, branchName, period,
      s.fuelType,
      s.litresSold.toFixed(3),
      s.ratePerLitre.toFixed(2),
      s.taxableValue.toFixed(2),
      s.gstRate,
      s.gstAmount.toFixed(2),
      s.totalValue.toFixed(2)
    ] as (string | number)[]
    );

    // Totals row
    rows.push([
      '', '', 'TOTAL',
      '',
      fuelSales.reduce((s, r) => s + r.litresSold, 0).toFixed(3),
      '',
      fuelSales.reduce((s, r) => s + r.taxableValue, 0).toFixed(2),
      '',
      fuelSales.reduce((s, r) => s + r.gstAmount, 0).toFixed(2),
      fuelSales.reduce((s, r) => s + r.totalValue, 0).toFixed(2)
    ] as (string | number)[]
    );

    const csv = this.buildCSV(headers, rows);
    this.downloadCSV(csv, `${branchName}_GST_${period}_${Date.now()}.csv`);
  }

  // ── 4. Raw CSV string (for server-side / test use) ─────────────────
  public static buildTransactionCSV(transactions: LedgerTransaction[]): string {
    const headers = [
      'Transaction ID', 'Date', 'Seq ID', 'Branch',
      'Debit Account', 'Credit Account', 'Amount (INR)',
      'Description', 'Checksum'
    ];
    const rows = transactions.map(tx => [
      tx.id, tx.date, tx.sequenceId, tx.branchId,
      tx.debitAccount, tx.creditAccount,
      tx.amount.toFixed(2), tx.description, tx.checksum
    ] as (string | number)[]);
    return this.buildCSV(headers, rows);
  }
}
