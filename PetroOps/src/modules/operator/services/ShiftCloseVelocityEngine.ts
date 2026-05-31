/**
 * ShiftCloseVelocityEngine.ts
 * Attendant micro-telemetry friction tracer and behavior profiler.
 * Monitors click-streams, validation anomalies, correction scales, and updates.
 */

export interface TelemetryEvent {
  clicksCount: number;
  formValidationFailures: number;
  focusLossEvents: number;
  keysPressed: number;
  backspaceCorrectionCount: number;
  durationMs: number;
  frictionScore: number; // calculated rating from 0 to 100
  attendantId: string;
  timestamp: number;
}

export class ShiftCloseVelocityEngine {
  private static STORAGE_KEY = "pumpai_operator_telemetries";
  
  private static activeSession: {
    clicksCount: number;
    formValidationFailures: number;
    focusLossEvents: number;
    keysPressed: number;
    backspaceCorrectionCount: number;
    timeStarted: number;
    attendantId: string;
  } | null = null;

  /**
   * Initializes a new telemetry profile session
   */
  public static startSession(attendantId: string): void {
    this.activeSession = {
      clicksCount: 0,
      formValidationFailures: 0,
      focusLossEvents: 0,
      keysPressed: 0,
      backspaceCorrectionCount: 0,
      timeStarted: Date.now(),
      attendantId,
    };
  }

  /**
   * Logs a user click interaction
   */
  public static recordClick(): void {
    if (this.activeSession) {
      this.activeSession.clicksCount += 1;
    }
  }

  /**
   * Logs a keyboard input event and tracks backspace revisions
   */
  public static recordKeyPress(key: string): void {
    if (this.activeSession) {
      this.activeSession.keysPressed += 1;
      if (key === "Backspace" || key === "Delete") {
        this.activeSession.backspaceCorrectionCount += 1;
      }
    }
  }

  /**
   * Records a form validation rule failure event
   */
  public static recordValidationFailure(): void {
    if (this.activeSession) {
      this.activeSession.formValidationFailures += 1;
    }
  }

  /**
   * Records a screen focus loss event
   */
  public static recordFocusLoss(): void {
    if (this.activeSession) {
      this.activeSession.focusLossEvents += 1;
    }
  }

  /**
   * Terminates the active session and computes transaction velocity scores
   */
  public static endSessionAndSave(): TelemetryEvent | null {
    if (!this.activeSession) {
      return null;
    }

    const durationMs = Date.now() - this.activeSession.timeStarted;
    
    // Formula weighting user interaction friction points:
    // Clicks add minor weight, validation failures add severe weight, backspaces indicate corrections, focus loss indicates context drift
    const rawFriction = 
      this.activeSession.clicksCount * 0.8 + 
      this.activeSession.formValidationFailures * 12.0 + 
      this.activeSession.backspaceCorrectionCount * 2.5 + 
      this.activeSession.focusLossEvents * 6.0;

    // Bounds limit between 0 and 100
    const frictionScore = Math.min(100, Math.max(0, Math.round(rawFriction)));

    const event: TelemetryEvent = {
      clicksCount: this.activeSession.clicksCount,
      formValidationFailures: this.activeSession.formValidationFailures,
      focusLossEvents: this.activeSession.focusLossEvents,
      keysPressed: this.activeSession.keysPressed,
      backspaceCorrectionCount: this.activeSession.backspaceCorrectionCount,
      durationMs,
      frictionScore,
      attendantId: this.activeSession.attendantId,
      timestamp: Date.now(),
    };

    const history = this.getHistory();
    history.push(event);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));

    this.activeSession = null;
    return event;
  }

  /**
   * Retrieves operator interaction telemetry logs
   */
  public static getHistory(): TelemetryEvent[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Compute average UX friction across all attendants
   */
  public static getAverageFrictionScore(): number {
    const history = this.getHistory();
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, curr) => acc + curr.frictionScore, 0);
    return Math.round(sum / history.length);
  }

  /**
   * Resets telemetry metrics
   */
  public static clearTelemetry(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
