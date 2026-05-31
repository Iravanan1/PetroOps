/**
 * SecureLocalSessionStore.ts
 * 
 * Securely caches device-specific portal session cookies and headers locally.
 * Prevents repeating manual authentication logs during multiple operational sessions.
 */

export interface PortalSessionToken {
  portalId: string;
  sessionToken: string;
  cookiesCache: string;
  expiresAt: string;
}

export class SecureLocalSessionStore {
  private static readonly STORAGE_KEY = 'pumpai_local_portal_sessions';

  /**
   * Caches an active session locally
   */
  public static saveSession(portalId: string, token: string, cookies = ''): void {
    if (typeof localStorage === 'undefined') return;

    const sessions = this.getAllSessions();
    const newSession: PortalSessionToken = {
      portalId: portalId.toUpperCase(),
      sessionToken: token,
      cookiesCache: cookies,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 Hour expiration
    };

    const filtered = sessions.filter(s => s.portalId !== portalId.toUpperCase());
    filtered.push(newSession);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Retrieves a non-expired session token for API automation sandbox
   */
  public static getSessionToken(portalId: string): PortalSessionToken | null {
    const sessions = this.getAllSessions();
    const cleanId = portalId.toUpperCase();
    const session = sessions.find(s => s.portalId === cleanId);

    if (session) {
      const isExpired = new Date().toISOString() > session.expiresAt;
      if (!isExpired) {
        return session;
      }
      // Remove expired session
      this.clearSession(portalId);
    }
    return null;
  }

  /**
   * Deletes session tokens immediately
   */
  public static clearSession(portalId: string): void {
    const sessions = this.getAllSessions();
    const filtered = sessions.filter(s => s.portalId !== portalId.toUpperCase());
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  /**
   * Retrieves all session tokens
   */
  private static getAllSessions(): PortalSessionToken[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return [];
  }
}
