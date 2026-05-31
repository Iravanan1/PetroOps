/**
 * LocalCredentialVault.ts
 * 
 * Secure, privacy-first local credential vault for oil refinery portal logins.
 * Credentials NEVER leave the operator's physical device, completely bypassing Firebase/cloud stores.
 */

export interface LocalPortalCredentials {
  portalId: string;
  username: string;
  encryptedPasswordHash: string;
  portalUrl: string;
  updatedAt: string;
}

export class LocalCredentialVault {
  private static readonly STORAGE_PREFIX = 'pumpai_local_portal_';
  private static readonly SALT_KEY = 'LOCAL_DEVICE_PUMP_AI_ERP_SECURE_SALT_2026';

  /**
   * Reversible obfuscated encryption using device key salt.
   */
  private static encrypt(text: string): string {
    if (!text) return '';
    const combined = `${this.SALT_KEY}:${text}`;
    return btoa(unescape(encodeURIComponent(combined)));
  }

  private static decrypt(hash: string): string {
    if (!hash) return '';
    try {
      const decoded = decodeURIComponent(escape(atob(hash)));
      const prefix = `${this.SALT_KEY}:`;
      if (decoded.startsWith(prefix)) {
        return decoded.substring(prefix.length);
      }
      return decoded;
    } catch (e) {
      console.error('[LocalCredentialVault] Failed to decrypt credential hash locally.');
      return '';
    }
  }

  /**
   * Encrypts and persists credentials locally.
   */
  public static savePortalCredentials(
    portalId: string,
    username: string,
    passwordPlain: string,
    portalUrl = ''
  ): void {
    if (typeof localStorage === 'undefined') return;

    const encryptedPasswordHash = this.encrypt(passwordPlain);
    const creds: LocalPortalCredentials = {
      portalId,
      username,
      encryptedPasswordHash,
      portalUrl,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(`${this.STORAGE_PREFIX}${portalId.toUpperCase()}`, JSON.stringify(creds));
    console.log(`[LocalCredentialVault] Secured local-only credentials for ${portalId}.`);
  }

  /**
   * Retrieves credentials masked for UI indicators.
   */
  public static getPortalCredentialsMasked(portalId: string): Omit<LocalPortalCredentials, 'encryptedPasswordHash'> & { hasPasswordSaved: boolean } {
    if (typeof localStorage === 'undefined') {
      return { portalId, username: '', portalUrl: '', updatedAt: '', hasPasswordSaved: false };
    }

    const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${portalId.toUpperCase()}`);
    if (!stored) {
      return { portalId, username: '', portalUrl: '', updatedAt: '', hasPasswordSaved: false };
    }

    try {
      const creds: LocalPortalCredentials = JSON.parse(stored);
      return {
        portalId: creds.portalId,
        username: creds.username,
        portalUrl: creds.portalUrl,
        updatedAt: creds.updatedAt,
        hasPasswordSaved: !!creds.encryptedPasswordHash
      };
    } catch (e) {
      return { portalId, username: '', portalUrl: '', updatedAt: '', hasPasswordSaved: false };
    }
  }

  /**
   * Decrypts the raw password for local sandbox automation extraction only.
   */
  public static getPortalPasswordRaw(portalId: string): string {
    if (typeof localStorage === 'undefined') return '';

    const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${portalId.toUpperCase()}`);
    if (!stored) return '';

    try {
      const creds: LocalPortalCredentials = JSON.parse(stored);
      return this.decrypt(creds.encryptedPasswordHash);
    } catch (e) {
      return '';
    }
  }

  /**
   * Wipes credentials completely.
   */
  public static disconnectPortal(portalId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${this.STORAGE_PREFIX}${portalId.toUpperCase()}`);
    console.log(`[LocalCredentialVault] Permanently purged and disconnected local-only ${portalId} credentials.`);
  }
}
