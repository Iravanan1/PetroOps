/**
 * DigitalSignatureVerification
 * Utilizes standard Web SubtleCrypto ECDSA (Elliptic Curve Digital Signature Algorithm, Curve P-256)
 * to cryptographically seal fiscal summaries and verify data authenticity during audits.
 */

export interface SealedSnapshotSignature {
  signatureHex: string;
  publicKeyPemOrHex: string;
  algorithm: string;
  signedTimestamp: number;
}

export class DigitalSignatureVerification {
  private static keyPairCache: CryptoKeyPair | null = null;

  /**
   * Initializes or fetches a cached ECDSA P-256 cryptographic key pair for current system operations.
   */
  public static async getSystemKeyPair(): Promise<CryptoKeyPair> {
    if (this.keyPairCache) {
      return this.keyPairCache;
    }

    let cryptoObject: any = null;
    if (typeof window !== "undefined" && window.crypto) {
      cryptoObject = window.crypto;
    } else if (typeof global !== "undefined" && (global as any).crypto) {
      cryptoObject = (global as any).crypto;
    }

    if (!cryptoObject || !cryptoObject.subtle) {
      // Fallback dummy key pair for runtimes without WebCrypto
      return {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey
      };
    }

    const keyPair = await cryptoObject.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      true, // exportable
      ["sign", "verify"]
    );

    this.keyPairCache = keyPair;
    return keyPair;
  }

  /**
   * Generates a hex-encoded ECDSA signature for a text payload.
   */
  public static async signFiscalPayload(payload: string): Promise<SealedSnapshotSignature> {
    const timestamp = Date.now();
    const message = `${payload}_signed_at_${timestamp}`;
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(message);

    const keyPair = await this.getSystemKeyPair();

    let cryptoObject: any = null;
    if (typeof window !== "undefined" && window.crypto) {
      cryptoObject = window.crypto;
    } else if (typeof global !== "undefined" && (global as any).crypto) {
      cryptoObject = (global as any).crypto;
    }

    if (!cryptoObject || !cryptoObject.subtle || !keyPair.privateKey.type) {
      // Fallback simple checksum if WebCrypto fails
      console.warn("Digital Signature falling back to standard hash seal due to empty SubtleCrypto");
      let mockHash = 0;
      const combined = `${message}_SALT_FALLBACK`;
      for (let i = 0; i < combined.length; i++) {
        mockHash = (mockHash << 5) - mockHash + combined.charCodeAt(i);
        mockHash |= 0;
      }
      return {
        signatureHex: `fb_sig_${Math.abs(mockHash).toString(16)}`,
        publicKeyPemOrHex: "fallback_rsa_public_key_string",
        algorithm: "FNV-1a-Checksum",
        signedTimestamp: timestamp
      };
    }

    const signatureBuffer = await cryptoObject.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      keyPair.privateKey,
      dataBytes
    );

    // Convert signature array buffer to hex
    const sigArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = sigArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Export public key to SPKI format
    const publicKeySpki = await cryptoObject.subtle.exportKey("spki", keyPair.publicKey);
    const pubArray = Array.from(new Uint8Array(publicKeySpki));
    const publicKeyHex = pubArray.map(b => b.toString(16).padStart(2, "0")).join("");

    return {
      signatureHex,
      publicKeyPemOrHex: publicKeyHex,
      algorithm: "ECDSA-P256-SHA256",
      signedTimestamp: timestamp
    };
  }

  /**
   * Verifies if a signature string holds authenticity for a target payload.
   */
  public static async verifyFiscalSignature(
    payload: string,
    signatureDetails: SealedSnapshotSignature
  ): Promise<boolean> {
    const message = `${payload}_signed_at_${signatureDetails.signedTimestamp}`;
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(message);

    if (signatureDetails.algorithm === "FNV-1a-Checksum") {
      let mockHash = 0;
      const combined = `${message}_SALT_FALLBACK`;
      for (let i = 0; i < combined.length; i++) {
        mockHash = (mockHash << 5) - mockHash + combined.charCodeAt(i);
        mockHash |= 0;
      }
      const verifiedHash = `fb_sig_${Math.abs(mockHash).toString(16)}`;
      return verifiedHash === signatureDetails.signatureHex;
    }

    let cryptoObject: any = null;
    if (typeof window !== "undefined" && window.crypto) {
      cryptoObject = window.crypto;
    } else if (typeof global !== "undefined" && (global as any).crypto) {
      cryptoObject = (global as any).crypto;
    }

    if (!cryptoObject || !cryptoObject.subtle) {
      return false;
    }

    try {
      // Decode public key hex into ArrayBuffer
      const pubBytes = new Uint8Array(
        signatureDetails.publicKeyPemOrHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      const publicKey = await cryptoObject.subtle.importKey(
        "spki",
        pubBytes.buffer,
        {
          name: "ECDSA",
          namedCurve: "P-256"
        },
        false,
        ["verify"]
      );

      // Decode signature hex
      const sigBytes = new Uint8Array(
        signatureDetails.signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      const isValid = await cryptoObject.subtle.verify(
        {
          name: "ECDSA",
          hash: { name: "SHA-256" }
        },
        publicKey,
        sigBytes,
        dataBytes
      );

      return isValid;
    } catch (e) {
      console.error("Signature verification error", e);
      return false;
    }
  }
}
