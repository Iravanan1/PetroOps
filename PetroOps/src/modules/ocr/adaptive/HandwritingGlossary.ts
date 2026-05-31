/**
 * HandwritingGlossary.ts
 * 
 * Manages the offline-first repository of operator-confirmed handwriting translations.
 * Stores mappings from messy raw OCR guesses to clean corrected names, categories, and meanings.
 */

export interface GlossaryEntry {
  id: string;
  rawOCR: string;
  correctedValue: string;
  normalizedMeaning: string;
  category: 'CUSTOMER_NAME' | 'LEDGER_TERM' | 'NOZZLE_LABEL' | 'OPERATIONAL_TERM';
  language: 'HINDI' | 'ENGLISH' | 'MIXED';
  stationTemplate: 'HPCL' | 'BPCL' | 'IOCL' | 'Nayara' | 'Jio-bp' | 'custom';
  operatorId: string;
  timestamp: string;
  confidence: number;
  useCount: number;
}

export class HandwritingGlossary {
  private static readonly STORAGE_KEY = 'pumpai_handwriting_glossary';
  private static cache: GlossaryEntry[] = [];

  /**
   * Calculates Levenshtein distance between two string arrays to allow fuzzy maps
   */
  private static levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // deletion
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[len1][len2];
  }

  /**
   * Finds a translation match in the glossary for the specific station template
   */
  public static findMatch(rawOCR: string, stationTemplate: string): GlossaryEntry | null {
    if (!rawOCR) return null;
    
    const entries = this.getAllEntries();
    const cleanOCR = rawOCR.trim().toLowerCase();
    const cleanTemplate = stationTemplate.trim().toUpperCase();

    // Match exact rawOCR (case-insensitive) under the target template
    let match = entries.find(e => 
      e.rawOCR.trim().toLowerCase() === cleanOCR &&
      (e.stationTemplate.toUpperCase() === cleanTemplate || e.stationTemplate === 'custom')
    );

    // If no exact match, apply fuzzy Levenshtein distance matching (allowing up to 2 edits)
    if (!match && cleanOCR.length >= 3) {
      let bestMatch: GlossaryEntry | null = null;
      let minDistance = 3; // Must be strictly less than 3 edits (max 2 edits)

      entries.forEach(e => {
        const entryRaw = e.rawOCR.trim().toLowerCase();
        if (e.stationTemplate.toUpperCase() === cleanTemplate || e.stationTemplate === 'custom') {
          if (Math.abs(entryRaw.length - cleanOCR.length) <= 2) {
            const distance = this.levenshteinDistance(cleanOCR, entryRaw);
            if (distance < minDistance) {
              minDistance = distance;
              bestMatch = e;
            }
          }
        }
      });
      
      if (bestMatch) {
        console.log(`[HandwritingGlossary] Fuzzy Match Trapped: '${rawOCR}' matched to '${(bestMatch as GlossaryEntry).rawOCR}' (Distance: ${minDistance})`);
        match = bestMatch;
      }
    }

    if (match) {
      // Increment use count
      this.incrementUseCount(match.id);
      return match;
    }

    return null;
  }

  /**
   * Registers a new trained word or name into the glossary
   */
  public static addEntry(entry: Omit<GlossaryEntry, 'id' | 'timestamp' | 'useCount'>): GlossaryEntry {
    const entries = this.getAllEntries();
    
    // De-duplicate: check if identical rawOCR mapping already exists for this template
    const existingIdx = entries.findIndex(e => 
      e.rawOCR.trim().toLowerCase() === entry.rawOCR.trim().toLowerCase() &&
      e.stationTemplate.toUpperCase() === entry.stationTemplate.toUpperCase()
    );

    const newEntry: GlossaryEntry = {
      ...entry,
      id: `gloss_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      useCount: 1
    };

    if (existingIdx !== -1) {
      // Overwrite/update existing mapping with new confidence or corrections
      entries[existingIdx] = {
        ...entries[existingIdx],
        correctedValue: entry.correctedValue,
        normalizedMeaning: entry.normalizedMeaning,
        category: entry.category,
        language: entry.language,
        operatorId: entry.operatorId,
        confidence: entry.confidence,
        timestamp: new Date().toISOString()
      };
      this.saveToStorage(entries);
      return entries[existingIdx];
    }

    entries.push(newEntry);
    this.saveToStorage(entries);
    return newEntry;
  }

  /**
   * Retrieves all glossary entries
   */
  public static getAllEntries(): GlossaryEntry[] {
    if (this.cache.length > 0) {
      return this.cache;
    }

    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        return this.cache;
      }
    } catch (e) {
      console.warn('[HandwritingGlossary] Failed to load glossary:', e);
    }

    return [];
  }

  /**
   * Removes a glossary entry (Reversible audit safety)
   */
  public static removeEntry(id: string): void {
    const entries = this.getAllEntries().filter(e => e.id !== id);
    this.saveToStorage(entries);
  }

  /**
   * Increments the suggestion use counter
   */
  private static incrementUseCount(id: string): void {
    const entries = this.getAllEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.useCount += 1;
      // Confidence improves by 5% per reuse, capped at 99%
      entry.confidence = Math.min(99, entry.confidence + 5);
      this.saveToStorage(entries);
    }
  }

  /**
   * Saves glossary to localStorage
   */
  private static saveToStorage(entries: GlossaryEntry[]): void {
    this.cache = entries;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      } catch (e) {
        console.warn('[HandwritingGlossary] Failed to save glossary:', e);
      }
    }
  }
}
