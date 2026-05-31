export class BackupSignatureService {
  /**
   * Generates a cryptographic signature for a ledger payload.
   */
  public async signExport(payload: object, branchSecret: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(branchSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const dataBuffer = enc.encode(JSON.stringify(payload));
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      keyMaterial,
      dataBuffer
    );

    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies an imported payload against its signature.
   */
  public async verifyImport(payload: object, signature: string, branchSecret: string): Promise<boolean> {
    const expectedSig = await this.signExport(payload, branchSecret);
    if (expectedSig !== signature) {
      console.error('[Security] CRITICAL: Backup signature mismatch. Tampering detected!');
      return false;
    }
    return true;
  }
}

export const backupSigner = new BackupSignatureService();
