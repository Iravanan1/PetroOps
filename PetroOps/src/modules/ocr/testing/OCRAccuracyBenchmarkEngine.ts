/**
 * OCRAccuracyBenchmarkEngine.ts
 * Rigorous evaluation engine measuring text and numerical extraction correctness.
 * Computes Levenshtein Distance for strings and exact value deltas for ledger rows.
 */

export interface FieldAccuracyReport {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  score: number; // 0 to 100%
  errorType: "none" | "digit_confusion" | "character_omission" | "sign_mismatch" | "missing_field";
}

export interface RecordBenchmarkReport {
  recordId: string;
  fileName: string;
  timestamp: string;
  overallAccuracy: number;
  stringAccuracy: number;
  numericalAccuracy: number;
  fieldReports: FieldAccuracyReport[];
}

export class OCRAccuracyBenchmarkEngine {
  /**
   * Evaluates raw OCR returns against verified Ground Truth values
   */
  public static evaluateRecord(
    recordId: string,
    fileName: string,
    ocrData: Record<string, any>,
    groundTruth: Record<string, any>
  ): RecordBenchmarkReport {
    const fieldReports: FieldAccuracyReport[] = [];
    let totalScore = 0;
    let stringScoreSum = 0;
    let stringCount = 0;
    let numericalScoreSum = 0;
    let numericalCount = 0;

    const truthKeys = Object.keys(groundTruth);

    truthKeys.forEach(key => {
      const expected = groundTruth[key];
      const actual = ocrData[key];
      
      let report: FieldAccuracyReport;

      if (actual === undefined || actual === null) {
        report = {
          field: key,
          expected,
          actual: "",
          passed: false,
          score: 0,
          errorType: "missing_field"
        };
      } else {
        const isNumeric = !isNaN(parseFloat(expected)) && isFinite(expected) && typeof expected !== "boolean";

        if (isNumeric) {
          numericalCount++;
          const expNum = parseFloat(expected);
          const actNum = parseFloat(actual);
          const diff = Math.abs(expNum - actNum);
          
          let score = 0;
          let errorType: FieldAccuracyReport["errorType"] = "none";

          if (diff === 0) {
            score = 100;
          } else if (diff < 1.0) {
            score = 95; // Minor rounding or decimal digit shift
            errorType = "digit_confusion";
          } else if (Math.abs(expNum - actNum) === expNum) {
            score = 0;
            errorType = "character_omission";
          } else {
            // logarithmic penalty based on mismatch magnitude
            score = Math.max(10, Number((100 - (diff / expNum) * 100).toFixed(1)));
            errorType = "digit_confusion";
          }

          numericalScoreSum += score;

          report = {
            field: key,
            expected,
            actual,
            passed: score >= 98,
            score,
            errorType
          };
        } else {
          // String comparison using Levenshtein distance
          stringCount++;
          const strExp = String(expected).trim();
          const strAct = String(actual).trim();
          
          const distance = this.levenshteinDistance(strExp, strAct);
          const maxLength = Math.max(strExp.length, 1);
          const score = Number(((maxLength - distance) / maxLength * 100).toFixed(1));
          
          let errorType: FieldAccuracyReport["errorType"] = "none";
          if (distance > 0) {
            errorType = distance < 3 ? "digit_confusion" : "character_omission";
          }

          stringScoreSum += score;

          report = {
            field: key,
            expected,
            actual,
            passed: score >= 95,
            score,
            errorType
          };
        }
      }

      fieldReports.push(report);
      totalScore += report.score;
    });

    const overallAccuracy = truthKeys.length > 0 ? Number((totalScore / truthKeys.length).toFixed(1)) : 100;
    const stringAccuracy = stringCount > 0 ? Number((stringScoreSum / stringCount).toFixed(1)) : 100;
    const numericalAccuracy = numericalCount > 0 ? Number((numericalScoreSum / numericalCount).toFixed(1)) : 100;

    return {
      recordId,
      fileName,
      timestamp: new Date().toISOString(),
      overallAccuracy,
      stringAccuracy,
      numericalAccuracy,
      fieldReports
    };
  }

  /**
   * Computes standard Levenshtein distance between two strings
   */
  public static levenshteinDistance(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return track[s2.length][s1.length];
  }
}
