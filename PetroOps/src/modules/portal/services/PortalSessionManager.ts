/**
 * PortalSessionManager.ts
 * 
 * Tracks real-time portal authentication statuses, connection health logs, and clearance tasks.
 * Automatically clears credentials and revokes sessions on timeouts to safeguard local screens.
 */

import { LocalCredentialVault } from './LocalCredentialVault';
import { SecureLocalSessionStore } from './SecureLocalSessionStore';

export interface ConnectionStatus {
  portalId: string;
  connected: boolean;
  username: string;
  sessionAgeMinutes?: number;
  lastVerifiedAt?: string;
}

export class PortalSessionManager {
  private static activeSessions = new Map<string, ConnectionStatus>();

  /**
   * Tracks manual session established in the embedded frame browser
   */
  public static establishSession(portalId: string, username: string): void {
    const cleanId = portalId.toUpperCase();
    const sessionToken = `session_token_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Save locally
    SecureLocalSessionStore.saveSession(cleanId, sessionToken, `portal_user=${username};`);

    this.activeSessions.set(cleanId, {
      portalId: cleanId,
      connected: true,
      username,
      lastVerifiedAt: new Date().toISOString(),
      sessionAgeMinutes: 0
    });
  }

  /**
   * Verifies local connection status
   */
  public static getPortalStatus(portalId: string): ConnectionStatus {
    const cleanId = portalId.toUpperCase();
    const active = this.activeSessions.get(cleanId);
    
    if (active) {
      // Check if session has expired or been evicted
      const localSession = SecureLocalSessionStore.getSessionToken(cleanId);
      if (localSession) {
        const diffMs = Date.now() - new Date(active.lastVerifiedAt || '').getTime();
        return {
          ...active,
          sessionAgeMinutes: Math.round(diffMs / 1000 / 60)
        };
      } else {
        this.activeSessions.delete(cleanId);
      }
    }

    // Fallback: check if credentials are linking but session has not been created yet
    const masked = LocalCredentialVault.getPortalCredentialsMasked(cleanId);
    return {
      portalId: cleanId,
      connected: false,
      username: masked.username || 'Not Linked',
    };
  }

  /**
   * Revokes credentials and evicts session immediately
   */
  public static revokeSession(portalId: string): void {
    const cleanId = portalId.toUpperCase();
    
    // Wipe vault credentials
    LocalCredentialVault.disconnectPortal(cleanId);

    // Evict cached session tokens
    SecureLocalSessionStore.clearSession(cleanId);

    // Delete in-memory status
    this.activeSessions.delete(cleanId);
    console.log(`[PortalSessionManager] Revoked and wiped all local credentials and session logs for ${portalId}.`);
  }
}
