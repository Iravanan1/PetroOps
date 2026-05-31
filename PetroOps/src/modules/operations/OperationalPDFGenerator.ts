/**
 * OperationalPDFGenerator.ts
 * ──────────────────────────
 * High-fidelity printable stylesheet constructor.
 * Creates temporary printable pages or frames to trigger clean browser `window.print()` outputs.
 */

export class OperationalPDFGenerator {
  /**
   * Generates a printable layout of a Cashbook / Expense report
   */
  public static printCashbook(title: string, records: any[], openingBalance: number) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rowsHtml = '';
    let balance = openingBalance;

    records.forEach(r => {
      balance = balance + r.debit - r.credit;
      rowsHtml += `
        <tr>
          <td style="font-family: monospace; padding: 8px; border-bottom: 1px solid #EBEBEA;">${r.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #EBEBEA;">
            <strong>${r.description}</strong><br/>
            <small style="color: #666; font-size: 8px;">${r.type}</small>
          </td>
          <td style="color: green; padding: 8px; border-bottom: 1px solid #EBEBEA;">${r.debit > 0 ? `₹${r.debit.toLocaleString()}` : '-'}</td>
          <td style="color: red; padding: 8px; border-bottom: 1px solid #EBEBEA;">${r.credit > 0 ? `₹${r.credit.toLocaleString()}` : '-'}</td>
          <td style="font-family: monospace; text-align: right; padding: 8px; border-bottom: 1px solid #EBEBEA;">₹${balance.toLocaleString()}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1A1A1A; }
            h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
            p { font-size: 10px; color: #666; margin-top: 0; }
            table { w-full; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background: #F9F9F8; padding: 8px; text-align: left; border-bottom: 2px solid #EBEBEA; font-weight: 800; font-size: 9px; text-transform: uppercase; color: #666; }
            .totals { margin-top: 30px; font-size: 12px; border-top: 2px dashed #EBEBEA; padding-top: 15px; text-align: right; font-weight: 900; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>HINDUSTAN PETROLEUM AUTOMATED ERP COMPLIANCE LEDGER SUMMARY</p>
          <p>Initial Float Balance: ₹${openingBalance.toLocaleString()}</p>
          
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Details</th>
                <th>Debit (In)</th>
                <th>Credit (Out)</th>
                <th style="text-align: right;">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            Final Certified Balance: ₹${balance.toLocaleString()}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  /**
   * Generates a printable statement of a Customer recovery ledger
   */
  public static printCustomerStatement(customerName: string, balance: number, records: any[]) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rowsHtml = '';
    records.forEach(r => {
      rowsHtml += `
        <tr>
          <td style="font-family: monospace; padding: 8px; border-bottom: 1px solid #EBEBEA;">${r.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #EBEBEA;">${r.description || 'Credit purchase'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #EBEBEA; color: red;">${r.debit > 0 ? `₹${r.debit.toLocaleString()}` : '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #EBEBEA; color: green;">${r.credit > 0 ? `₹${r.credit.toLocaleString()}` : '-'}</td>
          <td style="font-family: monospace; text-align: right; padding: 8px; border-bottom: 1px solid #EBEBEA;">₹${r.balance.toLocaleString()}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Statement - ${customerName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1A1A1A; }
            h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
            p { font-size: 10px; color: #666; margin-top: 0; }
            table { w-full; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background: #F9F9F8; padding: 8px; text-align: left; border-bottom: 2px solid #EBEBEA; font-weight: 800; font-size: 9px; text-transform: uppercase; color: #666; }
            .totals { margin-top: 30px; font-size: 12px; border-top: 2px dashed #EBEBEA; padding-top: 15px; text-align: right; font-weight: 900; }
          </style>
        </head>
        <body>
          <h1>Customer Ledger Statement</h1>
          <p>Customer: <strong>${customerName}</strong></p>
          <p>HINDUSTAN PETROLEUM ERP OUTSTANDING RECOVERY LEDGER SHEET</p>
          
          <table style="width: 100%;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit (Outstanding)</th>
                <th>Credit (Recovered)</th>
                <th style="text-align: right;">Cumulative Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            Net Unrecovered Outstanding Balance: ₹${balance.toLocaleString()}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
