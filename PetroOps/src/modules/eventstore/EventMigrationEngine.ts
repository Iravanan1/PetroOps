/**
 * EventMigrationEngine.ts
 * Implements structural database transformers enabling smooth schema adjustments.
 * Migrates old legacy transaction payloads up to the newest enterprise compliance standards.
 */

import { LedgerEvent } from "./EventStoreEngine";

export interface SchemaMigrator {
  targetSchemaVersion: number;
  transform: (payload: any) => any;
}

export class EventMigrationEngine {
  private static SCHEMA_VERSION = 2; // Current system target schema version

  // Sequential schema migration transforms list
  private static migrations: SchemaMigrator[] = [
    {
      targetSchemaVersion: 1,
      // Seeding baseline structure with decimal conversions
      transform: (payload: any) => {
        return {
          ...payload,
          amount: parseFloat(payload.amount || "0"),
          schemaVer: 1
        };
      }
    },
    {
      targetSchemaVersion: 2,
      // Upgrades payload to include active tax rates and compliance indicators
      transform: (payload: any) => {
        return {
          ...payload,
          taxRate: payload.taxRate !== undefined ? payload.taxRate : 18.0, // Default India GST (18%)
          taxAmount: payload.taxAmount !== undefined 
            ? payload.taxAmount 
            : Number(((payload.amount || 0) * 0.18).toFixed(2)),
          operatorRole: payload.operatorRole || "operator",
          schemaVer: 2
        };
      }
    }
  ];

  /**
   * Processes a single event payload through active transformers to compile newest schemas
   */
  public static migrateEventPayload(event: LedgerEvent): LedgerEvent {
    const payload = { ...event.payload };
    const currentVersion = payload.schemaVer || 0;

    let migratedPayload = payload;

    // Apply migrations sequentially
    this.migrations
      .filter((m) => m.targetSchemaVersion > currentVersion)
      .sort((a, b) => a.targetSchemaVersion - b.targetSchemaVersion)
      .forEach((migrator) => {
        migratedPayload = migrator.transform(migratedPayload);
      });

    return {
      ...event,
      payload: migratedPayload
    };
  }

  /**
   * Batch migrates an array of events
   */
  public static migrateBatch(events: LedgerEvent[]): LedgerEvent[] {
    return events.map((e) => this.migrateEventPayload(e));
  }
}
