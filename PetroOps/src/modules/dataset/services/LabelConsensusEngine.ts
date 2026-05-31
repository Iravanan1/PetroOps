/**
 * LabelConsensusEngine.ts
 * Audits human labeling inputs across multiple reviewers.
 * Computes exact field-level consensus scores and routes discrepancies to supervisor desks.
 */

export interface LabelSubmission {
  reviewerId: string;
  reviewerRole: "operator" | "manager" | "auditor";
  timestamp: string;
  fields: Record<string, any>;
}

export interface ConsensusReport {
  recordId: string;
  consensusScore: number; // 0 - 100%
  hasConflict: boolean;
  conflictingFields: Array<{
    field: string;
    submissions: Array<{ reviewerId: string; role: string; value: any }>;
  }>;
  verifiedFields: Record<string, any>;
}

export class LabelConsensusEngine {
  private static consensusKeyPrefix = "pumpai_labelSubmissions_";

  /**
   * Registers a review submission from a specific user
   */
  public static async submitReview(
    recordId: string,
    submission: Omit<LabelSubmission, "timestamp">
  ): Promise<ConsensusReport> {
    const key = `${this.consensusKeyPrefix}${recordId}`;
    const submissions: LabelSubmission[] = JSON.parse(localStorage.getItem(key) || "[]");

    const newSub: LabelSubmission = {
      ...submission,
      timestamp: new Date().toISOString()
    };

    // Keep only the latest submission from each reviewer
    const idx = submissions.findIndex(s => s.reviewerId === newSub.reviewerId);
    if (idx > -1) {
      submissions[idx] = newSub;
    } else {
      submissions.push(newSub);
    }

    localStorage.setItem(key, JSON.stringify(submissions));
    console.log(`[ConsensusEngine] Submitted labeling review from ${submission.reviewerId} (${submission.reviewerRole})`);

    return this.evaluateConsensus(recordId);
  }

  /**
   * Retrieves all reviews submitted for a record
   */
  public static getSubmissions(recordId: string): LabelSubmission[] {
    const key = `${this.consensusKeyPrefix}${recordId}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  /**
   * Computes consensus scores across submissions
   */
  public static evaluateConsensus(recordId: string): ConsensusReport {
    const submissions = this.getSubmissions(recordId);
    
    if (submissions.length === 0) {
      return { recordId, consensusScore: 100, hasConflict: false, conflictingFields: [], verifiedFields: {} };
    }

    if (submissions.length === 1) {
      // Single reviewer defaults to 100% consensus until cross-checked
      return {
        recordId,
        consensusScore: 100,
        hasConflict: false,
        conflictingFields: [],
        verifiedFields: submissions[0].fields
      };
    }

    // Collect all field keys across all submissions
    const allKeys = new Set<string>();
    submissions.forEach(sub => {
      Object.keys(sub.fields).forEach(k => allKeys.add(k));
    });

    const keyList = Array.from(allKeys);
    let matchingKeysCount = 0;
    const conflictingFields: ConsensusReport["conflictingFields"] = [];
    const verifiedFields: Record<string, any> = {};

    keyList.forEach(key => {
      const values = submissions.map(sub => ({
        reviewerId: sub.reviewerId,
        role: sub.reviewerRole,
        value: sub.fields[key]
      }));

      // Check if all reviewers agreed on this value
      const firstVal = values[0].value;
      const isConsensus = values.every(v => this.looseCompare(v.value, firstVal));

      if (isConsensus) {
        matchingKeysCount++;
        verifiedFields[key] = firstVal;
      } else {
        conflictingFields.push({
          field: key,
          submissions: values
        });
        
        // In case of conflict, prioritize auditor -> manager -> operator values as provisional fallback
        const prioritized = values.sort((a, b) => {
          const rank = { auditor: 3, manager: 2, operator: 1 };
          return (rank[b.role as "auditor" | "manager" | "operator"] || 0) - (rank[a.role as "auditor" | "manager" | "operator"] || 0);
        });
        verifiedFields[key] = prioritized[0].value;
      }
    });

    const consensusScore = Number(((matchingKeysCount / keyList.length) * 100).toFixed(1));
    const hasConflict = conflictingFields.length > 0;

    return {
      recordId,
      consensusScore,
      hasConflict,
      conflictingFields,
      verifiedFields
    };
  }

  private static looseCompare(v1: any, v2: any): boolean {
    if (v1 === v2) return true;
    if (v1 == null || v2 == null) return false;
    
    // String cast and standard trimming
    const s1 = String(v1).trim().replace(/[₹\s,]/g, "");
    const s2 = String(v2).trim().replace(/[₹\s,]/g, "");
    
    if (s1 === s2) return true;
    
    const n1 = parseFloat(s1);
    const n2 = parseFloat(s2);
    if (!isNaN(n1) && !isNaN(n2)) {
      return Math.abs(n1 - n2) < 0.001;
    }
    
    return s1.toLowerCase() === s2.toLowerCase();
  }
}
