export class SecureStorageEngine {
  private masterKey: CryptoKey | null = null;
  private readonly DB_NAME = 'PumpAISecureVault';
  private readonly STORE_NAME = 'EncryptedLedger';

  public async initialize(passphrase: string): Promise<void> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('pumpai-enterprise-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    console.log('[Security] Local storage vault initialized with AES-256-GCM.');
  }

  public async encryptAndStore(key: string, payload: any): Promise<void> {
    if (!this.masterKey) throw new Error('Vault not initialized');
    
    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(payload));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      data
    );

    const record = {
      iv: Array.from(iv),
      cipher: Array.from(new Uint8Array(cipherBuffer))
    };

    // Store in regular localStorage for demo (in prod: IndexedDB)
    localStorage.setItem(`SEC_VAULT_${key}`, JSON.stringify(record));
  }

  public async retrieveAndDecrypt(key: string): Promise<any> {
    if (!this.masterKey) throw new Error('Vault not initialized');

    const raw = localStorage.getItem(`SEC_VAULT_${key}`);
    if (!raw) return null;

    const record = JSON.parse(raw);
    const iv = new Uint8Array(record.iv);
    const cipherBuffer = new Uint8Array(record.cipher);

    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.masterKey,
        cipherBuffer
      );
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(plainBuffer));
    } catch (err) {
      console.error('[Security] Data decryption failed (Tamper/Corruption)?', err);
      throw new Error('Decryption Failed');
    }
  }
}

export const secureVault = new SecureStorageEngine();
