/**
 * OperationalTrendWarehouse.ts
 * Implements a local analytical data warehouse consolidation layer.
 * Pre-aggregates time-series ledger journals into daily summary rows for premium dashboard performance.
 */

export interface RawLedgerTransaction {
  tenantId: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  accountHead: "CASH_SALE" | "CARD_SALE" | "UPI_SALE" | "FUEL_EXPENSE" | "WAGES";
  timestamp: number;
}

export interface ConsolidatedDailyTrend {
  dateString: string; // YYYY-MM-DD
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesUpi: number;
  totalOperatingExpense: number;
  netClearingLiters: number;
}

export class OperationalTrendWarehouse {
  /**
   * Transforms raw ledger arrays into consolidated daily trend data points
   */
  public static consolidateLedgerToDailyTrends(
    transactions: RawLedgerTransaction[],
    averageRetailLiterPrice: number = 96.50
  ): ConsolidatedDailyTrend[] {
    const dailyMap = new Map<string, ConsolidatedDailyTrend>();

    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          dateString: dateStr,
          totalSalesCash: 0,
          totalSalesCard: 0,
          totalSalesUpi: 0,
          totalOperatingExpense: 0,
          netClearingLiters: 0
        });
      }

      const summary = dailyMap.get(dateStr)!;

      if (tx.type === "CREDIT") {
        // Sales inflows
        if (tx.accountHead === "CASH_SALE") {
          summary.totalSalesCash += tx.amount;
        } else if (tx.accountHead === "CARD_SALE") {
          summary.totalSalesCard += tx.amount;
        } else if (tx.accountHead === "UPI_SALE") {
          summary.totalSalesUpi += tx.amount;
        }
      } else {
        // Expenses outflows
        if (tx.accountHead === "FUEL_EXPENSE" || tx.accountHead === "WAGES") {
          summary.totalOperatingExpense += tx.amount;
        }
      }

      // Convert cash volume into approximate cleared liters for wetstock visualization
      const totalSalesRevenue = summary.totalSalesCash + summary.totalSalesCard + summary.totalSalesUpi;
      summary.netClearingLiters = parseFloat((totalSalesRevenue / averageRetailLiterPrice).toFixed(2));
    });

    // Convert map to sorted list based on date
    return Array.from(dailyMap.values()).sort((a, b) => 
      a.dateString.localeCompare(b.dateString)
    );
  }
}
