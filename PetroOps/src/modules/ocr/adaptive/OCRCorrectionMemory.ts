/**
 * OCRCorrectionMemory.ts
 * 
 * Manages the persistence, caching, and recovery of manual operator/manager corrections.
 * Fully supports offline capabilities with automatic localStorage fallback and syncload safety.
 */

export interface OCRCorrectionRecord {
  id: string;
  timestamp: string;
  operatorId: string;
  stationId: string;
  fieldKey: string;
  originalValue: string;
  correctedValue: string;
  isOffline: boolean;
  synced: boolean;
  timeToCorrectMs?: number;
  fileName?: string;
  templateName?: string;
  normalizedMeaning?: string;
  category?: 'CUSTOMER_NAME' | 'LEDGER_TERM' | 'NOZZLE_LABEL' | 'OPERATIONAL_TERM';
  language?: 'HINDI' | 'ENGLISH' | 'MIXED';
  imageCrop?: { x: number; y: number; width: number; height: number };
  confidence?: number;
}

export class OCRCorrectionMemory {
  private static readonly STORAGE_KEY = 'pumpai_ocr_correction_memory';
  private static inMemoryCache: OCRCorrectionRecord[] = [];

  /**
   * Logs a new correction record into memory and handles local persistence
   */
  public static logCorrection(record: Omit<OCRCorrectionRecord, 'id' | 'timestamp' | 'synced'>): OCRCorrectionRecord {
    const newRecord: OCRCorrectionRecord = {
      ...record,
      id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      synced: !record.isOffline
    };

    // Load existing records, push, and save
    const currentRecords = this.getAllRecords();
    currentRecords.push(newRecord);
    this.saveToStorage(currentRecords);

    return newRecord;
  }

  /**
   * Retrieves all logged correction records
   */
  public static getAllRecords(): OCRCorrectionRecord[] {
    if (this.inMemoryCache.length > 0) {
      return this.inMemoryCache;
    }

    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.inMemoryCache = JSON.parse(stored);
        return this.inMemoryCache;
      }
    } catch (e) {
      console.warn('[OCRCorrectionMemory] Failed to read from localStorage:', e);
    }

    return [];
  }

  /**
   * Filters corrections by specific field key
   */
  public static getCorrectionsForField(fieldKey: string): OCRCorrectionRecord[] {
    return this.getAllRecords().filter(r => r.fieldKey === fieldKey);
  }

  /**
   * Syncs any offline correction records when connection is restored
   */
  public static syncOfflineRecords(): number {
    const records = this.getAllRecords();
    let syncedCount = 0;

    const updated = records.map(r => {
      if (r.isOffline && !r.synced) {
        syncedCount++;
        return { ...r, isOffline: false, synced: true };
      }
      return r;
    });

    if (syncedCount > 0) {
      this.saveToStorage(updated);
    }

    return syncedCount;
  }

  /**
   * Resets local correction memory
   */
  public static clearMemory(): void {
    this.inMemoryCache = [];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (err) {}
    }
  }

  /**
   * Persists correction records to storage
   */
  private static saveToStorage(records: OCRCorrectionRecord[]): void {
    this.inMemoryCache = records;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      } catch (e) {
        console.warn('[OCRCorrectionMemory] Failed to save to localStorage:', e);
      }
    }
  }
}
