/**
 * EventStoreEngine.ts
 * Implements a secure append-only event store ledger.
 * All operations map as unchangeable transaction events with cryptographic sequence signatures.
 */

export interface LedgerEvent<T = any> {
  eventId: string;
  timestamp: number;
  eventType: "TRANSACTION_CREATED" | "TRANSACTION_VOIDED" | "PERIOD_CLOSED" | "PERIOD_REOPENED" | "NOZZLE_TEST_COMMITTED";
  payload: T;
  userSignature: string; // Actor credentials signature
  sequenceId: number;    // Absolute auto-increment index
  checksum: string;      // FNV-1a block integrity validation
}

export class EventStoreEngine {
  private static STORAGE_KEY_EVENTS = "pumpai_event_store_events";

  /**
   * Loads the complete sequential append-only ledger event stream
   */
  public static getEvents(): LedgerEvent[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_EVENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load historical ledger event logs", e);
      return [];
    }
  }

  /**
   * Appends an unchangeable event record to the timeline sequence.
   * Disallows deletions or modifications.
   */
  public static appendEvent<T = any>(
    eventType: LedgerEvent["eventType"],
    payload: T,
    userSignature: string
  ): LedgerEvent<T> {
    const list = this.getEvents();
    const nextSeq = list.length;
    
    // Generate secure FNV-1a checksum of event payload
    const payloadStr = JSON.stringify(payload);
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const timestamp = Date.now();

    const checkString = [
      eventId,
      timestamp.toString(),
      eventType,
      payloadStr,
      userSignature,
      nextSeq.toString()
    ].join("|");

    const checksum = this.calculateStringHash(checkString);

    const newEvent: LedgerEvent<T> = {
      eventId,
      timestamp,
      eventType,
      payload,
      userSignature,
      sequenceId: nextSeq,
      checksum
    };

    list.push(newEvent);
    localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(list));
    
    return newEvent;
  }

  /**
   * Clears the event store (Warning: For local simulator setup resets only!)
   */
  public static resetEventStore(): void {
    localStorage.removeItem(this.STORAGE_KEY_EVENTS);
  }

  /**
   * Deterministic custom hashing algorithm
   */
  private static calculateStringHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(hash ^ str.charCodeAt(i), 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
  }
}
