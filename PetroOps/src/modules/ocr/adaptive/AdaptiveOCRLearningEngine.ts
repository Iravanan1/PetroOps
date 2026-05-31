import { HandwritingPatternMemory } from './HandwritingPatternMemory';
import { StationLayoutMemory } from './StationLayoutMemory';

export class AdaptiveOCRLearningEngine {
  
  /**
   * Called strictly when a human manager approves/overrides a REVIEW_REQUIRED field.
   * This is the only path where adaptive intelligence can learn.
   */
  public static receiveManagerCorrection(
    operatorId: string,
    stationId: string,
    fieldKey: string,
    originalValue: string,
    correctedValue: string,
    dx?: number,
    dy?: number
  ): void {
    console.log(`[Adaptive Learning] Processing manager correction for field ${fieldKey}`);

    // Learn digit/character confusions
    if (originalValue !== correctedValue) {
      HandwritingPatternMemory.logCorrection(operatorId, originalValue, correctedValue);
    }

    // Learn layout drift
    if (dx !== undefined && dy !== undefined && (dx !== 0 || dy !== 0)) {
      StationLayoutMemory.logSpatialCorrection(stationId, fieldKey, dx, dy);
    }
  }
}
