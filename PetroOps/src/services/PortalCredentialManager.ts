import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface PortalCredential {
  portalId: string; // e.g. HPCL, BPCL, etc.
  username: string;
  passwordHash: string; // Obfuscated password
  portalUrl?: string;
  rememberConnection: boolean;
  syncSchedule: 'hourly' | 'daily' | 'manual';
  updatedAt: string;
  hasOtpAuth?: boolean;
}

export class PortalCredentialManager {
  private static SECRET_SALT = 'PUMP_AI_ERP_SECURE_SALT_2026';

  /**
   * Basic reversible obfuscation for UI demonstration.
   * In production, this would communicate with a secure server-side vault (like GCP Secret Manager).
   */
  private static obfuscate(text: string): string {
    if (!text) return '';
    // Reversible base64 encoding with salt injected to avoid standard plain-text exposures
    const saltedText = `${this.SECRET_SALT}:${text}`;
    return btoa(unescape(encodeURIComponent(saltedText)));
  }

  private static deobfuscate(hash: string): string {
    if (!hash) return '';
    try {
      const decoded = decodeURIComponent(escape(atob(hash)));
      const prefix = `${this.SECRET_SALT}:`;
      if (decoded.startsWith(prefix)) {
        return decoded.substring(prefix.length);
      }
      return decoded;
    } catch (e) {
      console.error('[Credential Vault] Failed to de-obfuscate credentials.');
      return '';
    }
  }

  /**
   * Saves portal credentials securely. Never logs password in plain text.
   */
  static async saveCredentials(
    userId: string,
    portalId: string,
    username: string,
    passwordPlain: string,
    rememberConnection: boolean,
    syncSchedule: 'hourly' | 'daily' | 'manual',
    portalUrl?: string
  ): Promise<void> {
    if (!userId) throw new Error('User authentication context required.');
    
    const passwordHash = this.obfuscate(passwordPlain);
    const cred: PortalCredential = {
      portalId,
      username,
      passwordHash,
      portalUrl: portalUrl || '',
      rememberConnection,
      syncSchedule,
      updatedAt: new Date().toISOString()
    };

    // Save in user profile subcollection "portal_credentials"
    const isMockUser = userId.startsWith('dev-') || userId.startsWith('demo-') || userId.startsWith('otp-') || userId.startsWith('apple-');
    if (isMockUser) {
      localStorage.setItem(`mock_portal_cred_${portalId}`, JSON.stringify(cred));
    } else {
      const credRef = doc(db, 'users', userId, 'portal_credentials', portalId);
      await setDoc(credRef, cred, { merge: true });
    }
    
    console.log(`[Credential Vault] Saved credentials for ${portalId} securely. Plaint text logs suppressed.`);
  }

  /**
   * Retrieves credentials with password MASKED (never exposed to UI).
   */
  static async getCredentialsMasked(userId: string, portalId: string): Promise<Omit<PortalCredential, 'passwordHash'> & { hasPasswordSaved: boolean }> {
    let cred: PortalCredential | null = null;
    
    const isMockUser = userId.startsWith('dev-') || userId.startsWith('demo-') || userId.startsWith('otp-') || userId.startsWith('apple-');
    if (isMockUser) {
      const stored = localStorage.getItem(`mock_portal_cred_${portalId}`);
      if (stored) {
        cred = JSON.parse(stored);
      }
    } else {
      const credRef = doc(db, 'users', userId, 'portal_credentials', portalId);
      const snapshot = await getDoc(credRef);
      if (snapshot.exists()) {
        cred = snapshot.data() as PortalCredential;
      }
    }

    if (!cred) {
      return {
        portalId,
        username: '',
        rememberConnection: false,
        syncSchedule: 'manual',
        updatedAt: '',
        hasPasswordSaved: false
      };
    }

    return {
      portalId: cred.portalId,
      username: cred.username,
      portalUrl: cred.portalUrl,
      rememberConnection: cred.rememberConnection,
      syncSchedule: cred.syncSchedule,
      updatedAt: cred.updatedAt,
      hasPasswordSaved: !!cred.passwordHash
    };
  }

  /**
   * Fetches the actual deobfuscated password for secure API sync executions in backend.
   * This is never returned to the UI client interface.
   */
  static async getRawPassword(userId: string, portalId: string): Promise<string> {
    let cred: PortalCredential | null = null;
    
    const isMockUser = userId.startsWith('dev-') || userId.startsWith('demo-') || userId.startsWith('otp-') || userId.startsWith('apple-');
    if (isMockUser) {
      const stored = localStorage.getItem(`mock_portal_cred_${portalId}`);
      if (stored) {
        cred = JSON.parse(stored);
      }
    } else {
      const credRef = doc(db, 'users', userId, 'portal_credentials', portalId);
      const snapshot = await getDoc(credRef);
      if (snapshot.exists()) {
        cred = snapshot.data() as PortalCredential;
      }
    }

    if (!cred || !cred.passwordHash) return '';
    return this.deobfuscate(cred.passwordHash);
  }

  /**
   * Disconnects a portal connection by wiping credentials completely.
   */
  static async disconnectPortal(userId: string, portalId: string): Promise<void> {
    const isMockUser = userId.startsWith('dev-') || userId.startsWith('demo-') || userId.startsWith('otp-') || userId.startsWith('apple-');
    if (isMockUser) {
      localStorage.removeItem(`mock_portal_cred_${portalId}`);
    } else {
      // For Firestore deletion, we can overwrite with empty values or delete the doc
      const credRef = doc(db, 'users', userId, 'portal_credentials', portalId);
      await setDoc(credRef, {
        username: '',
        passwordHash: '',
        rememberConnection: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    console.log(`[Credential Vault] Disconnected ${portalId} portal credentials.`);
  }
}
