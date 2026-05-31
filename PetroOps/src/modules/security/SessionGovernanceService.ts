/**
 * SessionGovernanceService.ts
 * ────────────────────────────
 * Oversees active user sessions. Tracks session idle state durations
 * and issues auto logout instructions to safeguard terminal sessions.
 */

export interface ActiveSession {
  sessionId: string;
  userId: string;
  userRole: string;
  loginTime: string;
  lastRequestTime: string;
  deviceLabel: string;
  isActive: boolean;
}

export class SessionGovernanceService {
  private static readonly STORAGE_KEY = 'pumpai_active_sessions';

  /**
   * Retrieves all currently active terminal session records
   */
  public static getSessions(): ActiveSession[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Seed default active sessions on first load
      const defaultSessions: ActiveSession[] = [
        { sessionId: 'sess-001', userId: 'owner-potaliya', userRole: 'owner', loginTime: '2026-05-23 08:15', lastRequestTime: '2026-05-23 10:09', deviceLabel: 'Main Station Office iPad', isActive: true },
        { sessionId: 'sess-002', userId: 'cashier-ramesh', userRole: 'operator', loginTime: '2026-05-23 06:00', lastRequestTime: '2026-05-23 09:40', deviceLabel: 'Attendant Nozzle Android Tablet', isActive: true }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultSessions));
      return defaultSessions;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Evaluates session expiry and auto logouts if idle duration exceeds limit (e.g. 15 mins)
   */
  public static checkSessionIdle(
    lastActiveTimestamp: string,
    timeoutMinutes = 15
  ): boolean {
    const lastActive = new Date(lastActiveTimestamp).getTime();
    const now = new Date().getTime();
    
    const diffMs = now - lastActive;
    const diffMins = diffMs / (1000 * 60);

    return diffMins > timeoutMinutes;
  }

  /**
   * Revokes a session dynamically
   */
  public static terminateSession(sessionId: string): void {
    const sessions = this.getSessions();
    const updated = sessions.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, isActive: false };
      }
      return s;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }
}
