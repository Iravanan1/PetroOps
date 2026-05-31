export interface TransactionEvent {
  eventId: string;
  sequenceNumber: number;
  timestamp: number;
  accountId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  authorizedBy: string;
}

export interface ReconstructedState {
  timestampTarget: number;
  balances: Record<string, number>;
  eventsCountProcessed: number;
  activeAccountsList: string[];
}

export class TimelineReconstructionEngine {
  constructor() {}

  /**
   * Reconstructs precise historical balance states by reducing transaction events up to the target millisecond
   */
  public reconstructStateAtTimestamp(
    events: TransactionEvent[], 
    timestampTarget: number
  ): ReconstructedState {
    const balances: Record<string, number> = {};
    let eventsCountProcessed = 0;
    const activeAccounts: Set<string> = new Set();

    // Sort events chronologically to guarantee deterministic reduction pathway
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (const evt of sortedEvents) {
      if (evt.timestamp > timestampTarget) {
        break; // Stop reduction upon reaching target boundary
      }

      eventsCountProcessed++;
      activeAccounts.add(evt.accountId);

      if (!balances[evt.accountId]) {
        balances[evt.accountId] = 0;
      }

      if (evt.type === "CREDIT") {
        balances[evt.accountId] = parseFloat((balances[evt.accountId] + evt.amount).toFixed(2));
      } else {
        balances[evt.accountId] = parseFloat((balances[evt.accountId] - evt.amount).toFixed(2));
      }
    }

    return {
      timestampTarget,
      balances,
      eventsCountProcessed,
      activeAccountsList: Array.from(activeAccounts)
    };
  }

  /**
   * Generates mock chronological ledger events for timeline trials
   */
  public generateMockTimelineEvents(accounts: string[], count: number): TransactionEvent[] {
    const events: TransactionEvent[] = [];
    const baseTime = Date.now() - 3600 * 24 * 7 * 1000; // 7 days ago

    for (let i = 0; i < count; i++) {
      const accId = accounts[Math.floor(Math.random() * accounts.length)];
      const isCredit = Math.random() > 0.4;
      const amt = parseFloat((Math.random() * 8000 + 100).toFixed(2));

      events.push({
        eventId: `EVT_${100000 + i}`,
        sequenceNumber: i + 1,
        timestamp: baseTime + i * (3600 * 2 * 1000), // staggered by 2 hours
        accountId: accId,
        type: isCredit ? "CREDIT" : "DEBIT",
        amount: amt,
        description: isCredit ? `Reconciled UPI Settlement clearing block #${i}` : `Credit override expense card payment #${i}`,
        authorizedBy: i % 10 === 0 ? "System-Manager" : "Operator-Auto"
      });
    }

    return events;
  }
}
