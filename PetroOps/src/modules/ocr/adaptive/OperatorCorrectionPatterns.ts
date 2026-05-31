/**
 * OperatorCorrectionPatterns.ts
 * 
 * Analyzes operator correction behaviors, handwriting variances, and common digit confusions.
 * Identifies character confusion trends (e.g., 5 vs S, 7 vs 1, or 0 vs O) per operator.
 */

import { OCRCorrectionMemory } from './OCRCorrectionMemory';

export interface ConfusionPair {
  rawOCR: string;
  correctedValue: string;
  frequency: number;
}

export interface OperatorHandwritingProfile {
  operatorId: string;
  totalCorrections: number;
  averageLatencyMs: number;
  confusionPairs: ConfusionPair[];
  handwritingVarianceIndex: number; // 0.0 (highly neat) to 1.0 (highly messy/variable)
}

export class OperatorCorrectionPatterns {
  private static readonly MEMORY_KEY = 'pumpai_operator_handwriting_profiles';

  /**
   * Captures handwriting correction feedback and stores operator profiles
   */
  public static logHandwritingFeedback(
    operatorId: string,
    originalValue: string,
    correctedValue: string,
    latencyMs?: number
  ): void {
    if (!operatorId || !originalValue || !correctedValue || originalValue === correctedValue) return;

    // Only track short character substitutions typical of OCR confusion (e.g., length <= 3)
    if (originalValue.length > 3 || correctedValue.length > 3) return;

    const profiles = this.getAllProfiles();
    let profile = profiles.find(p => p.operatorId === operatorId);

    if (!profile) {
      profile = {
        operatorId,
        totalCorrections: 0,
        averageLatencyMs: 0,
        confusionPairs: [],
        handwritingVarianceIndex: 0.1
      };
      profiles.push(profile);
    }

    // Update latencies and overrides
    profile.totalCorrections += 1;
    if (latencyMs) {
      profile.averageLatencyMs = Math.round(
        (profile.averageLatencyMs * (profile.totalCorrections - 1) + latencyMs) / profile.totalCorrections
      );
    }

    // Update confusion frequency
    let pair = profile.confusionPairs.find(
      cp => cp.rawOCR === originalValue && cp.correctedValue === correctedValue
    );

    if (pair) {
      pair.frequency += 1;
    } else {
      profile.confusionPairs.push({
        rawOCR: originalValue,
        correctedValue,
        frequency: 1
      });
    }

    // Recalculate variance index based on frequency of corrections and unique confusion pairs
    profile.handwritingVarianceIndex = Math.min(
      0.95,
      Number((0.1 + (profile.confusionPairs.length * 0.05) + (profile.totalCorrections * 0.01)).toFixed(3))
    );

    this.saveProfiles(profiles);
  }

  /**
   * Suggests a probable handwriting substitution based on operator history
   */
  public static predictCorrection(operatorId: string, rawOcr: string): { suggestion: string; confidenceBoost: number } | null {
    const profile = this.getAllProfiles().find(p => p.operatorId === operatorId);
    if (!profile || profile.confusionPairs.length === 0) return null;

    let suggestion = rawOcr;
    let modified = false;
    let maxFrequency = 0;

    // Sort by frequency descending
    const sortedPairs = [...profile.confusionPairs].sort((a, b) => b.frequency - a.frequency);

    for (const pair of sortedPairs) {
      // Require at least 2 historical corrections to trust the suggestion
      if (pair.frequency >= 2 && suggestion.includes(pair.rawOCR)) {
        suggestion = suggestion.replace(new RegExp(pair.rawOCR, 'g'), pair.correctedValue);
        maxFrequency = Math.max(maxFrequency, pair.frequency);
        modified = true;
      }
    }

    if (modified) {
      // Scale dynamic confidence boost based on substitution frequency
      const confidenceBoost = Math.min(25, 5 + maxFrequency * 3);
      return { suggestion, confidenceBoost };
    }

    return null;
  }

  /**
   * Retrieves all registered operator handwriting profiles
   */
  public static getAllProfiles(): OperatorHandwritingProfile[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.MEMORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[OperatorCorrectionPatterns] Failed to load handwriting profiles:', e);
    }

    // Dynamic reconstruction from correction records if profile cache is empty
    return this.rebuildProfilesFromMemory();
  }

  /**
   * Rebuilds profiles on-the-fly from raw correction logs
   */
  private static rebuildProfilesFromMemory(): OperatorHandwritingProfile[] {
    const records = OCRCorrectionMemory.getAllRecords();
    const profilesMap: Record<string, OperatorHandwritingProfile> = {};

    records.forEach(r => {
      const op = r.operatorId;
      if (!op) return;

      if (!profilesMap[op]) {
        profilesMap[op] = {
          operatorId: op,
          totalCorrections: 0,
          averageLatencyMs: 2500,
          confusionPairs: [],
          handwritingVarianceIndex: 0.1
        };
      }

      const profile = profilesMap[op];
      profile.totalCorrections += 1;

      if (r.originalValue.length <= 3 && r.correctedValue.length <= 3 && r.originalValue !== r.correctedValue) {
        let pair = profile.confusionPairs.find(
          p => p.rawOCR === r.originalValue && p.correctedValue === r.correctedValue
        );
        if (pair) {
          pair.frequency += 1;
        } else {
          profile.confusionPairs.push({
            rawOCR: r.originalValue,
            correctedValue: r.correctedValue,
            frequency: 1
          });
        }
      }
    });

    const profiles = Object.values(profilesMap);
    profiles.forEach(p => {
      p.handwritingVarianceIndex = Math.min(
        0.95,
        Number((0.1 + (p.confusionPairs.length * 0.05) + (p.totalCorrections * 0.01)).toFixed(3))
      );
    });

    return profiles;
  }

  /**
   * Saves profiles to localStorage
   */
  private static saveProfiles(profiles: OperatorHandwritingProfile[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.MEMORY_KEY, JSON.stringify(profiles));
      } catch (e) {
        console.warn('[OperatorCorrectionPatterns] Failed to save handwriting profiles:', e);
      }
    }
  }
}
