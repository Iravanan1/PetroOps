/**
 * GSTExportService.ts
 * ───────────────────
 * Structured CSV and spreadsheet exporter for GST, VAT, and excise reports.
 * Designed to generate clean, accountant-friendly tabular data.
 */

import { FuelSaleRecord, NonFuelSaleRecord, GSTR1Summary, GSTR3BSummary } from '../shared/GSTReportEngine';

export class GSTExportService {
  /**
   * Helper to trigger a direct browser file download for text/csv data
   */
  private static triggerDownload(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports GSTR-1 Outward Supplies Summary to CSV
   */
  public static exportGSTR1CSV(summary: GSTR1Summary, month: string) {
    let csv = 'GSTR-1 Outward Supplies Summary\n';
    csv += `Station ID,${summary.pumpId}\n`;
    csv += `GSTIN,${summary.gstin}\n`;
    csv += `Filing Month,${month}\n`;
    csv += `State Code,${summary.state}\n\n`;

    // Outward taxable supplies table
    csv += 'Category,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR)\n';
    csv += `B2C Retail Outward,${summary.b2cTaxableValue},${summary.b2cCgst},${summary.b2cSgst},${summary.b2cIgst},${summary.b2cCgst + summary.b2cSgst + summary.b2cIgst}\n`;
    csv += `B2B Registered Outward,${summary.b2bTaxableValue},${summary.b2bCgst},${summary.b2bSgst},${summary.b2bIgst},${summary.b2bCgst + summary.b2bSgst + summary.b2bIgst}\n`;
    csv += `Total Taxable Supplies,${summary.totalTaxableValue},${summary.b2cCgst + summary.b2bCgst},${summary.b2cSgst + summary.b2bSgst},${summary.b2cIgst + summary.b2bIgst},${summary.totalGst}\n\n`;

    // Fuel Sales (Non-GST, VAT and Excise)
    csv += 'Petroleum Products Out of GST (Excise & VAT Summary)\n';
    csv += `Total State VAT Component,${summary.vatOnFuel}\n`;
    csv += `Total Central Excise Component,${summary.exciseDutyOnFuel}\n`;
    csv += `Total Petroleum Revenue component,${summary.vatOnFuel + summary.exciseDutyOnFuel}\n\n`;

    // HSN Summary
    csv += 'HSN-wise Summary of Outward Supplies\n';
    csv += 'HSN Code,Description,UQC,Quantity,Taxable Value,CGST,SGST,IGST\n';
    summary.hsnSummary.forEach(h => {
      csv += `${h.hsnCode},${h.description},${h.uqc},${h.qty},${h.taxableValue},${h.cgst},${h.sgst},${h.igst}\n`;
    });

    const fileName = `GSTR1_Export_${summary.pumpId}_${month}.csv`;
    this.triggerDownload(csv, fileName);
  }

  /**
   * Exports GSTR-3B Monthly Return to CSV
   */
  public static exportGSTR3BCSV(summary: GSTR3BSummary, month: string) {
    let csv = 'GSTR-3B Self-Assessment Summary Return\n';
    csv += `Station ID,${summary.pumpId}\n`;
    csv += `GSTIN,${summary.gstin}\n`;
    csv += `Filing Month,${month}\n\n`;

    csv += '3.1 Details of Outward Supplies and inward supplies liable to reverse charge\n';
    csv += 'Nature of Supplies,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess\n';
    csv += `(a) Outward taxable supplies (other than zero rated nil rated and exempted),${summary.outwardTaxable},${summary.igstPayable},${summary.cgstPayable},${summary.sgstPayable},0\n`;
    csv += `(b) Outward taxable supplies (zero rated),0,0,0,0,0\n`;
    csv += `(c) Other outward supplies (Nil rated exempted),0,0,0,0,0\n`;
    csv += `(d) Inward supplies liable to reverse charge,0,0,0,0,0\n`;
    csv += `(e) Non-GST outward supplies (Fuel sales VAT/Excise components),${summary.outwardNonGst},0,0,0,0\n\n`;

    csv += '4. Eligible Input Tax Credit (ITC)\n';
    csv += 'ITC Details,Integrated Tax,Central Tax,State/UT Tax,Cess\n';
    csv += `(A) ITC Available (Import / Inward Services / Lubricants),${summary.itcIgst},${summary.itcCgst},${summary.itcSgst},0\n`;
    csv += `(B) Ineligible ITC (Section 17(5) / blocked credits),0,0,0,0\n\n`;

    csv += '5. Payment of Tax Liability & Fees\n';
    csv += `Net GST Tax Payable (Before Penalty),${summary.totalGstPayable}\n`;
    csv += `Late Filing Fees,${summary.lateFee}\n`;
    csv += `Interest on Delayed Liability,${summary.interestLiability}\n`;
    csv += `Net Treasury Cash Ledger Payment Required,${summary.totalNetLiability}\n`;

    const fileName = `GSTR3B_Export_${summary.pumpId}_${month}.csv`;
    this.triggerDownload(csv, fileName);
  }
}
