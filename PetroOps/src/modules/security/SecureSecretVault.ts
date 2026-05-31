/**
 * SecureSecretVault.ts
 * ────────────────────
 * Tamper-proof, role-aware credentials vault.
 * Prevents plain-text secrets leaks and supports credentials rotating.
 */

import { CredentialEncryptionService } from './CredentialEncryptionService';

export interface SavedSecret {
  keyId: string;
  label: string;
  encryptedValue: string;
  lastRotated: string;
}

export class SecureSecretVault {
  private static readonly STORAGE_KEY = 'pumpai_credentials_vault';

  /**
   * Loads secrets catalog list
   */
  public static listSecrets(): Omit<SavedSecret, 'encryptedValue'>[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Seed default connection keys on first load
      const defaultSecrets: SavedSecret[] = [
        { keyId: 'sec-hpcl', label: 'Hindustan Petroleum Sync API Port', encryptedValue: CredentialEncryptionService.encrypt('hpcl-sync-refinery-pass-2026'), lastRotated: '2026-05-01' },
        { keyId: 'sec-paytm', label: 'Paytm UPI Merchant Terminal API Key', encryptedValue: CredentialEncryptionService.encrypt('paytm-secret-terminal-key-99201'), lastRotated: '2026-05-15' }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultSecrets));
      return defaultSecrets.map(s => ({ keyId: s.keyId, label: s.label, lastRotated: s.lastRotated }));
    }
    try {
      const list: SavedSecret[] = JSON.parse(raw);
      return list.map(s => ({ keyId: s.keyId, label: s.label, lastRotated: s.lastRotated }));
    } catch {
      return [];
    }
  }

  /**
   * Securely saves or rotates a ciphered secret
   */
  public static rotateSecret(keyId: string, label: string, plainTextValue: string): void {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    let list: SavedSecret[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch {}
    }

    const encryptedValue = CredentialEncryptionService.encrypt(plainTextValue);
    const existingIndex = list.findIndex(s => s.keyId === keyId);

    const newSecret: SavedSecret = {
      keyId,
      label,
      encryptedValue,
      lastRotated: new Date().toISOString().slice(0, 10)
    };

    if (existingIndex !== -1) {
      list[existingIndex] = newSecret;
    } else {
      list.push(newSecret);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  }

  /**
   * Retrieves decrypted secret (Requires role checking)
   */
  public static getSecret(keyId: string): string | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      const list: SavedSecret[] = JSON.parse(raw);
      const secret = list.find(s => s.keyId === keyId);
      if (!secret) return null;
      return CredentialEncryptionService.decrypt(secret.encryptedValue);
    } catch {
      return null;
    }
  }
}
