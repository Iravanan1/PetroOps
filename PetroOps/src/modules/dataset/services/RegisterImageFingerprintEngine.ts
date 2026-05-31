/**
 * RegisterImageFingerprintEngine.ts
 * Enterprise-grade deduplication engine for petroleum register log sheets.
 * Calculates cryptographic SHA-256 hash and 64-bit Perceptual Hashing (pHash) client-side.
 */

export interface FingerprintResult {
  sha256: string;
  pHash: string;
  timestamp: string;
}

export class RegisterImageFingerprintEngine {
  /**
   * Computes SHA-256 from a File or Blob stream using browser-native Web Crypto APIs.
   */
  public static async computeSHA256(file: File | Blob): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    } catch (error) {
      console.warn("Web Crypto SHA-256 failed, falling back to rolling checksum", error);
      return this.computeFallbackHash(file);
    }
  }

  /**
   * Computes a 64-bit Perceptual Hash (pHash) from an image URL or Blob.
   * Resizes image to 8x8, converts to greyscale, computes average luminance,
   * and creates a 64-bit bitstring represented as a hexadecimal fingerprint.
   */
  public static async computePHash(file: File | Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Create offscreen canvas 8x8
            const canvas = document.createElement("canvas");
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(this.generateEmptyPHash());
              return;
            }

            // Draw and resize
            ctx.drawImage(img, 0, 0, 8, 8);
            const imgData = ctx.getImageData(0, 0, 8, 8);
            const data = imgData.data;

            // Step 1: Convert to greyscale & compute mean luminance
            const greyscale: number[] = [];
            let sum = 0;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Standard BT.601 luma formula
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              greyscale.push(luma);
              sum += luma;
            }

            const average = sum / 64;

            // Step 2: Compare each pixel value with the average luma
            let pHashBits = "";
            for (let i = 0; i < 64; i++) {
              pHashBits += greyscale[i] >= average ? "1" : "0";
            }

            // Step 3: Convert 64-bit bitstring to 16-character hexadecimal hash
            let hexPHash = "";
            for (let i = 0; i < 64; i += 4) {
              const chunk = pHashBits.substring(i, i + 4);
              hexPHash += parseInt(chunk, 2).toString(16);
            }

            resolve(hexPHash);
          } catch (err) {
            console.error("pHash canvas rendering failed", err);
            resolve(this.generateEmptyPHash());
          }
        };
        img.onerror = () => resolve(this.generateEmptyPHash());
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(this.generateEmptyPHash());
      reader.readAsDataURL(file);
    });
  }

  /**
   * Full fingerprinter interface mapping.
   */
  public static async fingerprintFile(file: File): Promise<FingerprintResult> {
    const [sha256, pHash] = await Promise.all([
      this.computeSHA256(file),
      this.computePHash(file)
    ]);

    return {
      sha256,
      pHash,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compares two perceptual hashes and returns a match percentage (0 to 100).
   * Match is computed using Hamming Distance.
   */
  public static comparePHashes(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length || hash1.length === 0) return 0;
    
    let hammingDistance = 0;
    
    // Convert hex chars to binary representations to perform bitwise comparison
    for (let i = 0; i < hash1.length; i++) {
      const hex1 = parseInt(hash1[i], 16);
      const hex2 = parseInt(hash2[i], 16);
      let xor = hex1 ^ hex2;
      
      // Count set bits in XOR result (Hamming Distance)
      while (xor > 0) {
        if (xor & 1) hammingDistance++;
        xor >>= 1;
      }
    }

    // Maximum distance is 64 bits.
    const matchPercentage = ((64 - hammingDistance) / 64) * 100;
    return Number(matchPercentage.toFixed(2));
  }

  private static generateEmptyPHash(): string {
    return "0000000000000000";
  }

  private static async computeFallbackHash(file: File | Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash |= 0;
        }
        resolve(`fallback_sha_${Math.abs(hash).toString(16)}_${file.size}`);
      };
      reader.readAsText(file.slice(0, 10000));
    });
  }
}
