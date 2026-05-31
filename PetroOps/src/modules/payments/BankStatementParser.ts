import { SBIRecord } from "./SBIReconciliationEngine";

export class BankStatementParser {
  constructor() {}

  /**
   * Parses standard MT940 banking messaging logs into structured internal record models
   */
  public parseMT940(fileContent: string): SBIRecord[] {
    const lines = fileContent.split("\n");
    const records: SBIRecord[] = [];
    let currentRecord: Partial<SBIRecord> = {};
    let runningBalance = 100000.00;

    lines.forEach(line => {
      // Parse MT940 Tags
      // Tag :61: Statement Line (Date, Value Date, Amount, Transaction Type, Reference)
      if (line.startsWith(":61:")) {
        const parts = line.substring(4).match(/^(\d{6})(\d{4})?(C|D)(\d+,\d{2})([A-Z]{4})?([A-Z0-9\/\/]+)/);
        if (parts) {
          const yy = parts[1].substring(0, 2);
          const mm = parts[1].substring(2, 4);
          const dd = parts[1].substring(4, 6);
          const dateStr = `20${yy}-${mm}-${dd}`;
          
          const isDeposit = parts[3] === "C";
          const amount = parseFloat(parts[4].replace(",", "."));

          currentRecord.transactionDate = dateStr;
          currentRecord.valueDate = dateStr;
          if (isDeposit) {
            currentRecord.depositAmount = amount;
            currentRecord.withdrawalAmount = 0;
            runningBalance += amount;
          } else {
            currentRecord.depositAmount = 0;
            currentRecord.withdrawalAmount = amount;
            runningBalance -= amount;
          }
          currentRecord.balanceAfter = parseFloat(runningBalance.toFixed(2));
        }
      } 
      // Tag :86: Information to Account Owner (UTR details, reference description)
      else if (line.startsWith(":86:") && currentRecord.transactionDate) {
        const desc = line.substring(4);
        currentRecord.description = desc;
        
        // Try parsing UTR e.g. /SBI/UTR/12984920
        const utrMatch = desc.match(/UTR\/([A-Z0-9]+)/i) || desc.match(/RRN:([A-Z0-9]+)/i);
        currentRecord.utr = utrMatch ? utrMatch[1] : `MOCK_UTR_${Math.random().toString().slice(-8)}`;
        currentRecord.referenceNo = `SBI_REF_${Math.floor(100000 + Math.random() * 900000)}`;

        records.push(currentRecord as SBIRecord);
        currentRecord = {};
      }
    });

    return records;
  }

  /**
   * Parses unstructured CSV bank records into structured ledger arrays
   */
  public parseCSV(csvContent: string): SBIRecord[] {
    const lines = csvContent.split("\n");
    const records: SBIRecord[] = [];

    // Skip headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // split by comma, ignoring commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length >= 6) {
        const utr = parts[0].replace(/"/g, "").trim();
        const txDate = parts[1].replace(/"/g, "").trim();
        const desc = parts[2].replace(/"/g, "").trim();
        const deposit = parseFloat(parts[3]) || 0;
        const withdraw = parseFloat(parts[4]) || 0;
        const bal = parseFloat(parts[5]) || 0;

        records.push({
          utr,
          transactionDate: txDate,
          valueDate: txDate,
          description: desc,
          depositAmount: deposit,
          withdrawalAmount: withdraw,
          balanceAfter: bal,
          referenceNo: `REF_${utr}`
        });
      }
    }

    return records;
  }

  /**
   * Mock raw spreadsheet format generator
   */
  public generateMockMT940Content(salesList: Array<{ utr: string; amount: number }>): string {
    let raw = ":20:PUMPAIMT940\n:25:SBI_A/C_9908124213\n:28C:00042\n:60F:C260521INR1504281,35\n";
    salesList.forEach((s) => {
      raw += `:61:${new Date().toISOString().slice(2, 10).replace(/-/g, "")}C${s.amount.toFixed(2).replace(".", ",")}NIMPUPI\n`;
      raw += `:86:UPI DEPOSIT/SBI/UTR/${s.utr}/PUMPAI INGEST\n`;
    });
    raw += `:62F:C260521INR1892518,85\n`;
    return raw;
  }
}
