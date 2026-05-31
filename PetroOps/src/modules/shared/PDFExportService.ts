/**
 * PDFExportService
 * ─────────────────
 * Accountant-grade PDF layout engine.
 * Uses browser's native window.print() with pre-rendered, print-optimised HTML.
 * Supports:
 *  - Daily closing balance sheets
 *  - Shift logs with nozzle tables
 *  - Inventory adjustment reports
 *  - Thermal receipt (80mm) mini-print mode
 */
import { CanonicalSnapshot } from '../snapshots/CanonicalSnapshotEngine';

export interface PDFExportOptions {
  title?: string;
  branchName?: string;
  showNozzleTable?: boolean;
  thermalMode?: boolean;    // 80mm thermal printer layout
  footerNote?: string;
}

export class PDFExportService {
  private static readonly COMPANY_NAME = 'PumpAI ERP';

  /**
   * Renders and triggers a browser print of a daily closing sheet.
   */
  public static printDailyClosingSheet(
    snapshot: CanonicalSnapshot,
    nozzleReadings: Array<{
      nozzleId: string;
      fuelType: string;
      openingMeter: number;
      closingMeter: number;
      netSales: number;
      rate: number;
      value: number;
    }> = [],
    options: PDFExportOptions = {}
  ): void {
    const {
      title = 'Daily Closing Balance Sheet',
      branchName = 'Branch',
      showNozzleTable = true,
      thermalMode = false,
      footerNote = 'This is a system-generated report. Verify with physical records.'
    } = options;

    const html = this.buildHTML(snapshot, nozzleReadings, {
      title, branchName, showNozzleTable, thermalMode, footerNote
    });

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      console.error('[PDFExportService] Popup blocked. Allow popups for printing.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);
  }

  /**
   * Returns the full printable HTML string for embedding in an iframe.
   */
  public static buildHTML(
    snapshot: CanonicalSnapshot,
    nozzleReadings: Array<{
      nozzleId: string;
      fuelType: string;
      openingMeter: number;
      closingMeter: number;
      netSales: number;
      rate: number;
      value: number;
    }>,
    options: Required<PDFExportOptions>
  ): string {
    const pageWidth = options.thermalMode ? '80mm' : '210mm';
    const fontSize  = options.thermalMode ? '10px' : '12px';
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const fmtL = (n: number) => `${n.toFixed(2)} L`;

    const nozzleRows = nozzleReadings.map(nz => `
      <tr>
        <td>${nz.nozzleId}</td>
        <td>${nz.fuelType}</td>
        <td>${nz.openingMeter.toFixed(2)}</td>
        <td>${nz.closingMeter.toFixed(2)}</td>
        <td>${fmtL(nz.netSales)}</td>
        <td>${fmt(nz.rate)}</td>
        <td>${fmt(nz.value)}</td>
      </tr>`).join('');

    const statusBadge = snapshot.isLocked
      ? '<span style="color:#16a34a;font-weight:bold;">✓ LOCKED &amp; IMMUTABLE</span>'
      : '<span style="color:#dc2626;font-weight:bold;">⚠ DRAFT – NOT LOCKED</span>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${options.title} – ${snapshot.date}</title>
<style>
  @page {
    size: ${options.thermalMode ? '80mm auto' : 'A4'};
    margin: ${options.thermalMode ? '4mm' : '20mm 15mm'};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize};
    color: #111;
    width: ${pageWidth};
  }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: ${options.thermalMode ? '13px' : '18px'}; font-weight: bold; }
  .header p  { font-size: ${options.thermalMode ? '10px' : '12px'}; margin-top: 2px; }
  .section { margin-bottom: 14px; }
  .section-title {
    font-weight: bold;
    font-size: ${options.thermalMode ? '11px' : '13px'};
    border-bottom: 1px dashed #555;
    padding-bottom: 3px;
    margin-bottom: 6px;
  }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .row .label { color: #444; }
  .row .value { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: ${options.thermalMode ? '9px' : '11px'}; }
  th { background: #111; color: #fff; padding: 4px 6px; text-align: left; }
  td { padding: 3px 6px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) td { background: #f7f7f7; }
  .totals-row td { font-weight: bold; border-top: 2px solid #111; }
  .footer { margin-top: 20px; font-size: 9px; color: #666; text-align: center; border-top: 1px dashed #999; padding-top: 6px; }
  .status { text-align: center; margin: 8px 0; font-size: ${options.thermalMode ? '11px' : '13px'}; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${this.COMPANY_NAME}</h1>
  <p>${options.branchName} — ${options.title}</p>
  <p>Date: ${snapshot.date} | Generated: ${new Date().toLocaleString('en-IN')}</p>
</div>
<div class="status">${statusBadge}</div>

<div class="section">
  <div class="section-title">Cash Summary</div>
  <div class="row"><span class="label">Opening Cash</span><span class="value">${fmt(snapshot.openingCash)}</span></div>
  <div class="row"><span class="label">Closing Cash (Till)</span><span class="value">${fmt(snapshot.closingCash)}</span></div>
  <div class="row"><span class="label">Cash Collected</span><span class="value">${fmt(snapshot.totalCashCollected)}</span></div>
</div>

<div class="section">
  <div class="section-title">Sales &amp; Revenue</div>
  <div class="row"><span class="label">Total Fuel Revenue</span><span class="value">${fmt(snapshot.totalRevenue)}</span></div>
  <div class="row"><span class="label">UPI Settlements</span><span class="value">${fmt(snapshot.totalUPISettled)}</span></div>
  <div class="row"><span class="label">Card Settlements</span><span class="value">${fmt(snapshot.totalCardSettled)}</span></div>
  <div class="row"><span class="label">Credit Sales</span><span class="value">${fmt(snapshot.totalOutstandingCredit)}</span></div>
  <div class="row"><span class="label">Credit Recovered</span><span class="value">${fmt(snapshot.totalCreditRecovered)}</span></div>
</div>

<div class="section">
  <div class="section-title">Expenses &amp; Adjustments</div>
  <div class="row"><span class="label">Total Expenses</span><span class="value">${fmt(snapshot.totalExpensesPaid)}</span></div>
  <div class="row"><span class="label">Wet Stock Variance</span><span class="value">${snapshot.wetstockVariance.toFixed(2)} L</span></div>
  <div class="row"><span class="label">Carry-Forward Match</span><span class="value">${snapshot.carryForwardMatch ? 'YES ✓' : 'MISMATCH ⚠'}</span></div>
</div>

${options.showNozzleTable && nozzleReadings.length > 0 ? `
<div class="section">
  <div class="section-title">Nozzle Register</div>
  <table>
    <thead>
      <tr>
        <th>Nozzle</th><th>Fuel</th><th>Open (L)</th><th>Close (L)</th>
        <th>Net (L)</th><th>Rate</th><th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${nozzleRows}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="4">TOTALS</td>
        <td>${fmtL(nozzleReadings.reduce((s, n) => s + n.netSales, 0))}</td>
        <td>—</td>
        <td>${fmt(nozzleReadings.reduce((s, n) => s + n.value, 0))}</td>
      </tr>
    </tfoot>
  </table>
</div>` : ''}

<div class="section">
  <div class="section-title">Replay Integrity</div>
  <div class="row"><span class="label">Checksum</span><span class="value">${snapshot.replayChecksum}</span></div>
  <div class="row"><span class="label">Double-Entry Balanced</span><span class="value">${snapshot.isBalanced ? 'YES ✓' : 'NO ✗'}</span></div>
  <div class="row"><span class="label">Locked At</span><span class="value">${snapshot.lockedAt}</span></div>
</div>

<div class="footer">${options.footerNote}</div>
</body>
</html>`;
  }
}
