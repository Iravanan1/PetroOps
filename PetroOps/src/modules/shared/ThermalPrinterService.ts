/**
 * ThermalPrinterService.ts
 * ─────────────────────────
 * 58mm / 80mm thermal printer support for shift closing receipts.
 *
 * Supports:
 *  - Electron native silent print (80mm paper page size)
 *  - 58mm compact receipt format
 *  - Browser window.print() fallback
 *  - Accountant A4 PDF report layout
 *  - Closing sheet, expense summary, credit ledger printouts
 */

import { DesktopBridgeService } from './DesktopBridgeService';

// ─── TYPES ───────────────────────────────────────────────────────────────────────

export type PaperWidth = 58 | 80 | 'A4';

export interface ShiftPrintData {
  stationName:   string;
  shiftLabel:    string;
  shiftDate:     string;
  operatorName:  string;
  openingCash:   number;
  expenses:      number;
  upiCollected:  number;
  cardCollected: number;
  creditSales:   number;
  creditRecovery:number;
  totalCashCounted: number;
  cashShortage:  number;
  nozzles: Array<{
    label:   string;
    fuel:    string;
    opening: number;
    closing: number;
    testing: number;
    rate:    number;
  }>;
  supervisorName?: string;
  printedAt?:     string;
  isLocked:       boolean;
}

export interface PrintJob {
  paperWidth:   PaperWidth;
  silent:       boolean;
  deviceName?:  string;
  copies?:      number;
}

// ─── FORMATTING HELPERS ──────────────────────────────────────────────────────────

const rupee = (n: number) => `\u20B9${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtL  = (n: number) => `${n.toFixed(2)}L`;
const dashes = (n: number) => '-'.repeat(n);

export class ThermalPrinterService {
  static readonly STATION_NAME = 'POTALIYA PETROLEUM';

  // ─── BUILD THERMAL HTML ───────────────────────────────────────────────────────

  static buildThermalHTML(data: ShiftPrintData, paperWidth: 58 | 80 = 80): string {
    const widthMM  = paperWidth;
    const isNarrow = paperWidth === 58;
    const colWidth = isNarrow ? 28 : 40;
    const hr       = dashes(colWidth);

    const nozzleRows = data.nozzles.map(nz => {
      const net  = Math.max(0, nz.closing - nz.opening - nz.testing);
      const val  = net * nz.rate;
      return `
        <tr>
          <td>${nz.label} (${nz.fuel})</td>
          <td class="r">${fmtL(net)}</td>
          <td class="r">${rupee(val)}</td>
        </tr>`;
    }).join('');

    const totalFuelRev = data.nozzles.reduce((s, nz) => {
      const net = Math.max(0, nz.closing - nz.opening - nz.testing);
      return s + (net * nz.rate);
    }, 0);

    const printedAt = data.printedAt || new Date().toLocaleString('en-IN');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Shift Closing Receipt</title>
<style>
  @page { size: ${widthMM}mm auto; margin: 2mm 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${isNarrow ? '9px' : '11px'};
    width: ${widthMM - 4}mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .hr     { border-top: 1px dashed #000; margin: 3px 0; }
  .row    { display: flex; justify-content: space-between; padding: 1px 0; }
  .r      { text-align: right; }
  table   { width: 100%; border-collapse: collapse; font-size: ${isNarrow ? '8px' : '10px'}; }
  th      { border-bottom: 1px solid #000; padding: 2px 3px; text-align: left; font-size: ${isNarrow ? '8px' : '9px'}; }
  td      { padding: 2px 3px; }
  .status-locked { color: #000; font-weight: bold; }
  .status-draft  { text-decoration: underline; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="center bold">${data.stationName || this.STATION_NAME}</div>
<div class="center">Shift Closing Receipt</div>
<div class="center">${data.shiftDate} — ${data.shiftLabel}</div>
<div class="hr"></div>

<div class="row"><span>Operator</span><span>${data.operatorName}</span></div>
<div class="row"><span>Status</span>
  <span class="${data.isLocked ? 'status-locked' : 'status-draft'}">
    ${data.isLocked ? '✓ LOCKED' : '⚠ DRAFT'}
  </span>
</div>
<div class="hr"></div>

<div class="bold" style="margin:2px 0">Nozzle Register</div>
<table>
  <thead>
    <tr>
      <th>Nozzle</th>
      <th class="r">Net (L)</th>
      <th class="r">Value</th>
    </tr>
  </thead>
  <tbody>${nozzleRows}</tbody>
  <tfoot>
    <tr>
      <td class="bold">TOTAL</td>
      <td class="r bold">${fmtL(data.nozzles.reduce((s, nz) => s + Math.max(0, nz.closing - nz.opening - nz.testing), 0))}</td>
      <td class="r bold">${rupee(totalFuelRev)}</td>
    </tr>
  </tfoot>
</table>
<div class="hr"></div>

<div class="bold" style="margin:2px 0">Cash Summary</div>
<div class="row"><span>Opening Float</span>  <span>${rupee(data.openingCash)}</span></div>
<div class="row"><span>UPI Collections</span><span>${rupee(data.upiCollected)}</span></div>
<div class="row"><span>Card Collections</span><span>${rupee(data.cardCollected)}</span></div>
<div class="row"><span>Expenses Paid</span>  <span>- ${rupee(data.expenses)}</span></div>
<div class="row"><span>Credit Extended</span><span>- ${rupee(data.creditSales)}</span></div>
<div class="row"><span>Credit Recovered</span><span>${rupee(data.creditRecovery)}</span></div>
<div class="hr"></div>
<div class="row bold"><span>Till Counted</span><span>${rupee(data.totalCashCounted)}</span></div>
<div class="row ${Math.abs(data.cashShortage) > 0 ? 'bold' : ''}">
  <span>${data.cashShortage > 0 ? 'SHORT ⚠' : data.cashShortage < 0 ? 'OVER ⚠' : 'BALANCED ✓'}</span>
  <span>${data.cashShortage !== 0 ? (data.cashShortage > 0 ? '-' : '+') + rupee(Math.abs(data.cashShortage)) : '₹0.00'}</span>
</div>
<div class="hr"></div>

${data.supervisorName ? `<div class="row"><span>Supervisor</span><span>${data.supervisorName}</span></div>` : ''}
<div class="center" style="margin-top:4px; font-size:8px;">Printed: ${printedAt}</div>
<div class="center" style="font-size:8px;">PumpAI ERP — pumpai.in</div>
<br/>
</body>
</html>`;
  }

  // ─── BUILD A4 ACCOUNTANT REPORT ────────────────────────────────────────────────

  static buildA4ReportHTML(data: ShiftPrintData): string {
    const totalFuelRev = data.nozzles.reduce((s, nz) => {
      const net = Math.max(0, nz.closing - nz.opening - nz.testing);
      return s + (net * nz.rate);
    }, 0);

    const nozzleRows = data.nozzles.map(nz => {
      const net = Math.max(0, nz.closing - nz.opening - nz.testing);
      return `<tr>
        <td>${nz.label}</td>
        <td>${nz.fuel}</td>
        <td>${nz.opening.toFixed(2)}</td>
        <td>${nz.closing.toFixed(2)}</td>
        <td>${nz.testing.toFixed(2)}</td>
        <td>${net.toFixed(2)}</td>
        <td>${rupee(nz.rate)}</td>
        <td>${rupee(net * nz.rate)}</td>
      </tr>`;
    }).join('');

    const printedAt = data.printedAt || new Date().toLocaleString('en-IN');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${data.stationName} — Shift Closing — ${data.shiftDate}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; }
  h1 { font-size: 18px; font-weight: bold; }
  h2 { font-size: 14px; font-weight: bold; margin: 14px 0 6px; border-bottom: 1px solid #333; padding-bottom: 3px; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
  .meta span { color: #555; }
  .badge-locked { color: #16a34a; font-weight: bold; }
  .badge-draft  { color: #dc2626; font-weight: bold; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .card { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; }
  .card-title { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .card-value { font-size: 15px; font-weight: bold; }
  .card-value.neg { color: #dc2626; }
  .card-value.pos { color: #16a34a; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #111; color: #fff; padding: 5px 8px; text-align: left; }
  td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .totals-row td { font-weight: bold; border-top: 2px solid #111; background: #f3f4f6 !important; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .label { color: #555; }
  .value { font-weight: bold; }
  .footer { margin-top: 20px; font-size: 9px; color: #888; text-align: center; border-top: 1px dashed #bbb; padding-top: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <h1>${data.stationName || this.STATION_NAME}</h1>
  <p>${data.shiftLabel} — ${data.shiftDate}</p>
  <p>Operator: <strong>${data.operatorName}</strong> &nbsp;|&nbsp;
     Status: <span class="${data.isLocked ? 'badge-locked' : 'badge-draft'}">${data.isLocked ? '✓ LOCKED & IMMUTABLE' : '⚠ DRAFT — NOT LOCKED'}</span>
  </p>
</div>

<div class="meta">
  <span>Report generated: ${printedAt}</span>
  ${data.supervisorName ? `<span>Authorized by: <strong>${data.supervisorName}</strong></span>` : ''}
</div>

<div class="grid">
  <div class="card"><div class="card-title">Opening Float</div><div class="card-value">${rupee(data.openingCash)}</div></div>
  <div class="card"><div class="card-title">Fuel Revenue (Computed)</div><div class="card-value">${rupee(totalFuelRev)}</div></div>
  <div class="card"><div class="card-title">Digital Collections</div><div class="card-value">${rupee(data.upiCollected + data.cardCollected)}</div></div>
  <div class="card"><div class="card-title">Cash Till Counted</div><div class="card-value">${rupee(data.totalCashCounted)}</div></div>
  <div class="card"><div class="card-title">Expenses</div><div class="card-value neg">- ${rupee(data.expenses)}</div></div>
  <div class="card">
    <div class="card-title">Cash ${data.cashShortage > 0 ? 'Shortage' : data.cashShortage < 0 ? 'Overage' : 'Balance'}</div>
    <div class="card-value ${data.cashShortage !== 0 ? 'neg' : 'pos'}">${data.cashShortage === 0 ? '✓ BALANCED' : (data.cashShortage > 0 ? '- ' : '+ ') + rupee(Math.abs(data.cashShortage))}</div>
  </div>
</div>

<h2>Nozzle Register</h2>
<table>
  <thead>
    <tr><th>Nozzle</th><th>Fuel</th><th>Opening</th><th>Closing</th><th>Testing</th><th>Net (L)</th><th>Rate/L</th><th>Revenue</th></tr>
  </thead>
  <tbody>${nozzleRows}</tbody>
  <tfoot>
    <tr class="totals-row">
      <td colspan="5">TOTALS</td>
      <td>${data.nozzles.reduce((s, nz) => s + Math.max(0, nz.closing - nz.opening - nz.testing), 0).toFixed(2)}L</td>
      <td>—</td>
      <td>${rupee(totalFuelRev)}</td>
    </tr>
  </tfoot>
</table>

<h2>Payment Breakdown</h2>
<div class="row"><span class="label">UPI Collected</span>      <span class="value">${rupee(data.upiCollected)}</span></div>
<div class="row"><span class="label">Card Settled</span>       <span class="value">${rupee(data.cardCollected)}</span></div>
<div class="row"><span class="label">Credit Extended (Udhari)</span><span class="value">- ${rupee(data.creditSales)}</span></div>
<div class="row"><span class="label">Udhari Recovered</span>   <span class="value">${rupee(data.creditRecovery)}</span></div>
<div class="row"><span class="label">Expenses Paid</span>      <span class="value">- ${rupee(data.expenses)}</span></div>

<div class="footer">
  This is a system-generated document from PumpAI ERP. Verify with physical records before filing.
  &nbsp;|&nbsp; PumpAI v1.0 &nbsp;|&nbsp; ${printedAt}
</div>

</body>
</html>`;
  }

  // ─── PRINT DISPATCHERS ─────────────────────────────────────────────────────────

  static printThermal(data: ShiftPrintData, job: PrintJob = { paperWidth: 80, silent: true }): void {
    const width = job.paperWidth === 'A4' ? 80 : (job.paperWidth as 58 | 80);
    const html  = this.buildThermalHTML(data, width);
    DesktopBridgeService.print(html, {
      silent:      job.silent,
      thermalMode: true,
      thermalWidth: width,
      deviceName:   job.deviceName
    });
  }

  static printA4(data: ShiftPrintData, job: PrintJob = { paperWidth: 'A4', silent: false }): void {
    const html = this.buildA4ReportHTML(data);
    DesktopBridgeService.print(html, {
      silent:      job.silent,
      thermalMode: false,
      deviceName:  job.deviceName
    });
  }

  static async exportA4PDF(data: ShiftPrintData): Promise<boolean> {
    const html     = this.buildA4ReportHTML(data);
    const filename = `shift_closing_${data.shiftDate}_${data.shiftLabel.replace(/\s+/g, '_')}.pdf`;
    const result   = await DesktopBridgeService.exportPDF(html, filename);
    return result.success;
  }
}

export default ThermalPrinterService;
