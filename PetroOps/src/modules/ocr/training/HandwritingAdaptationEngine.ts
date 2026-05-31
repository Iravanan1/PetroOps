/**
 * HandwritingAdaptationEngine.ts
 * Implements a dynamic weight scoring engine that tracks and adapts to unique operator handwriting anomalies.
 * Profiles recurring character stroke overrides, mapping biases, and adjustments to optimize layout matching.
 */

export interface CharacterMappingAnomaly {
  sourceChar: string;
  targetChar: string;
  occurrences: number;
  confidencePenaltyBias: number; // Adjustment to confidence score (e.g. -0.15)
}

export interface OperatorStrokeProfile {
  operatorId: string;
  lastUpdated: number;
  totalCorrectionsProcessed: number;
  anomalies: CharacterMappingAnomaly[];
  writingStyleTag: "NEAT" | "SLANTED" | "CROWDED" | "UNKNOWN";
  fieldCorrectionRates: Record<string, number>; // Maps field name to correction frequency
}

export class HandwritingAdaptationEngine {
  private static STORAGE_KEY_PROFILES = "pumpai_handwriting_profiles";

  /**
   * Loads all active handwriting profiles from local storage
   */
  public static getAllProfiles(): OperatorStrokeProfile[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load operator handwriting profiles", e);
      return [];
    }
  }

  /**
   * Retrieves a specific operator's handwriting stroke profile
   */
  public static getOperatorProfile(operatorId: string): OperatorStrokeProfile {
    const profiles = this.getAllProfiles();
    const existing = profiles.find((p) => p.operatorId === operatorId);

    if (existing) {
      return existing;
    }

    // Return empty default profile if none exists
    return {
      operatorId,
      lastUpdated: Date.now(),
      totalCorrectionsProcessed: 0,
      anomalies: [],
      writingStyleTag: "UNKNOWN",
      fieldCorrectionRates: {},
    };
  }

  /**
   * Commits an operator profile back to storage
   */
  public static saveOperatorProfile(profile: OperatorStrokeProfile): void {
    try {
      const profiles = this.getAllProfiles();
      const index = profiles.findIndex((p) => p.operatorId === profile.operatorId);

      if (index >= 0) {
        profiles[index] = {
          ...profile,
          lastUpdated: Date.now(),
        };
      } else {
        profiles.push({
          ...profile,
          lastUpdated: Date.now(),
        });
      }

      localStorage.setItem(this.STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error("Failed to persist operator stroke profile", e);
    }
  }

  /**
   * Analyzes a single correction event to update the handwriting profile weights
   */
  public static registerCorrectionEvent(
    operatorId: string,
    fieldName: string,
    originalText: string,
    correctedText: string
  ): OperatorStrokeProfile {
    const profile = this.getOperatorProfile(operatorId);
    profile.totalCorrectionsProcessed += 1;

    // Track correction rate by field
    if (!profile.fieldCorrectionRates[fieldName]) {
      profile.fieldCorrectionRates[fieldName] = 0;
    }
    profile.fieldCorrectionRates[fieldName] += 1;

    // Compare characters sequentially to locate letter-to-letter translation gaps (anomalies)
    const cleanOrig = originalText.trim();
    const cleanCorr = correctedText.trim();

    if (cleanOrig.length === cleanCorr.length) {
      for (let i = 0; i < cleanOrig.length; i++) {
        const oChar = cleanOrig[i];
        const cChar = cleanCorr[i];

        if (oChar !== cChar) {
          this.upsertAnomaly(profile, oChar, cChar);
        }
      }
    } else {
      // For string length mismatches, we perform soft substring alignment triggers
      // E.g., if "88" corrected to "B8" or similar
      const oSet = new Set(cleanOrig.split(""));
      const cSet = new Set(cleanCorr.split(""));
      oSet.forEach((oChar) => {
        if (!cSet.has(oChar)) {
          // Identify characters frequently modified or deleted
          cSet.forEach((cChar) => {
            if (this.isCharacterPairSimilar(oChar, cChar)) {
              this.upsertAnomaly(profile, oChar, cChar);
            }
          });
        }
      });
    }

    // Determine writing style tag dynamically
    profile.writingStyleTag = this.deduceWritingStyle(profile);

    this.saveOperatorProfile(profile);
    return profile;
  }

  /**
   * Integrates an anomaly correction count and updates structural confidence penalty biases
   */
  private static upsertAnomaly(profile: OperatorStrokeProfile, source: string, target: string): void {
    const existing = profile.anomalies.find((a) => a.sourceChar === source && a.targetChar === target);

    if (existing) {
      existing.occurrences += 1;
      // Bias increases in penalty as anomalies persist, capping at a maximum of 0.40 score adjustment
      existing.confidencePenaltyBias = Math.min(0.4, 0.05 + existing.occurrences * 0.02);
    } else {
      profile.anomalies.push({
        sourceChar: source,
        targetChar: target,
        occurrences: 1,
        confidencePenaltyBias: 0.05,
      });
    }

    // Sort anomalies by frequency
    profile.anomalies.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Helper checking common character/digit pairs susceptible to poor penmanship confusion
   */
  private static isCharacterPairSimilar(charA: string, charB: string): boolean {
    const confuses = [
      ["8", "B"],
      ["1", "I"],
      ["1", "L"],
      ["0", "O"],
      ["0", "D"],
      ["5", "S"],
      ["2", "Z"],
      ["9", "g"],
      ["6", "G"],
      ["4", "A"],
      ["3", "8"]
    ];

    return confuses.some(
      (pair) =>
        (pair[0] === charA && pair[1] === charB) ||
        (pair[1] === charA && pair[0] === charB)
    );
  }

  /**
   * Deduces the styling classification based on character mapping shifts and noise
   */
  private static deduceWritingStyle(profile: OperatorStrokeProfile): OperatorStrokeProfile["writingStyleTag"] {
    const totalAnomaliesCount = profile.anomalies.reduce((sum, a) => sum + a.occurrences, 0);

    if (profile.totalCorrectionsProcessed < 5) {
      return "UNKNOWN";
    }

    if (totalAnomaliesCount > profile.totalCorrectionsProcessed * 0.7) {
      return "CROWDED"; // Heavy corrections indicate highly illegible or cramped style
    } else if (totalAnomaliesCount > profile.totalCorrectionsProcessed * 0.4) {
      return "SLANTED"; // Medium corrections skewing numeric totalizers
    } else {
      return "NEAT"; // Minimal correction footprint
    }
  }

  /**
   * Applies handwriting bias overrides to optimize live layout recognition scores
   */
  public static calculateConfidenceBias(
    operatorId: string,
    rawText: string,
    extractedField: string
  ): number {
    const profile = this.getOperatorProfile(operatorId);
    let cumulativePenalty = 0;

    // Apply specific anomalies penalty if matching operator signature patterns
    for (const anomaly of profile.anomalies) {
      if (rawText.includes(anomaly.sourceChar)) {
        const charMatchesCount = (rawText.match(new RegExp(this.escapeRegExp(anomaly.sourceChar), "g")) || []).length;
        cumulativePenalty += anomaly.confidencePenaltyBias * charMatchesCount;
      }
    }

    // Apply high-correction field penalty modifiers
    const fieldCorrections = profile.fieldCorrectionRates[extractedField] || 0;
    if (fieldCorrections > 10) {
      cumulativePenalty += 0.10;
    }

    // Scale adjustments to protect against confidence scores dropping below 0
    return Math.max(0, cumulativePenalty);
  }

  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
