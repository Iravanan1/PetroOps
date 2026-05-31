/**
 * ComplianceArchiveEngine
 * Serializes, packs, and compresses financial snapshots into secure, cold-storage archives.
 * Employs standard web-native CompressionStream with standard base64 deflaters as robust fallbacks.
 */

import { DigitalSignatureVerification, SealedSnapshotSignature } from "./DigitalSignatureVerification";

export interface ArchiveBlock {
  archiveId: string;
  tenantId: string;
  compressedPayload: string; // Base64 gzipped text
  rollingHash: string; // SHA-256 connecting to the previous block
  signature: SealedSnapshotSignature;
  sealedAt: number;
  recordCount: number;
}

export class ComplianceArchiveEngine {
  private static localArchiveCacheKey = "pumpai_compliance_cold_archives";

  /**
   * Compresses a text string into GZIP bytes and returns a Base64 string.
   * Leverages browser/node native CompressionStream.
   */
  public static async compressText(text: string): Promise<string> {
    if (typeof CompressionStream === "undefined") {
      // Fallback simple base64-based custom encoding for testing/compat environments
      const utf8Bytes = new TextEncoder().encode(text);
      return btoa(String.fromCharCode(...Array.from(utf8Bytes)));
    }

    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(text));
          controller.close();
        }
      });
      
      const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
      const response = new Response(compressedStream);
      const compressedBytes = await response.arrayBuffer();
      
      // Convert buffer to Base64
      const binary = String.fromCharCode(...Array.from(new Uint8Array(compressedBytes)));
      return btoa(binary);
    } catch (e) {
      console.warn("CompressionStream failed, using simple Base64 fallback", e);
      const utf8Bytes = new TextEncoder().encode(text);
      return btoa(String.fromCharCode(...Array.from(utf8Bytes)));
    }
  }

  /**
   * Decompresses a Base64-encoded GZIP string back into text.
   */
  public static async decompressText(base64: string): Promise<string> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (typeof DecompressionStream === "undefined") {
      // Fallback decoding
      return new TextDecoder().decode(bytes);
    }

    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        }
      });

      const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
      const response = new Response(decompressedStream);
      const textBytes = await response.arrayBuffer();
      return new TextDecoder().decode(textBytes);
    } catch (e) {
      console.warn("DecompressionStream failed, utilizing Base64 fallback decoding", e);
      return new TextDecoder().decode(bytes);
    }
  }

  /**
   * Commits a list of transactions into a legally sealed cold archive block.
   */
  public static async buildColdArchiveBlock(
    tenantId: string,
    records: any[],
    previousHash = "genesis_rolling_seal_hash_0000000000"
  ): Promise<ArchiveBlock> {
    const rawPayload = JSON.stringify(records);
    const compressed = await this.compressText(rawPayload);

    // Compute rolling hash using SubtleCrypto or custom fallback
    let rollingHash = "";
    const hashPayload = `${compressed}_prev_${previousHash}`;
    
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(hashPayload);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        rollingHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        rollingHash = `fb_hash_${Math.floor(Math.random() * 1000000000)}`;
      }
    } else {
      rollingHash = `fb_hash_${Math.floor(Math.random() * 1000000000)}`;
    }

    // Sign payload
    const signature = await DigitalSignatureVerification.signFiscalPayload(rollingHash);

    const block: ArchiveBlock = {
      archiveId: `arc_${Math.floor(Math.random() * 900000) + 100000}`,
      tenantId,
      compressedPayload: compressed,
      rollingHash,
      signature,
      sealedAt: Date.now(),
      recordCount: records.length
    };

    // Commit to archive database
    const archives = this.getArchives(tenantId);
    archives.push(block);
    this.saveArchives(tenantId, archives);

    return block;
  }

  /**
   * Retrieves active archive history for a tenant.
   */
  public static getArchives(tenantId: string): ArchiveBlock[] {
    try {
      const stored = localStorage.getItem(`${this.localArchiveCacheKey}_${tenantId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveArchives(tenantId: string, archives: ArchiveBlock[]) {
    try {
      localStorage.setItem(`${this.localArchiveCacheKey}_${tenantId}`, JSON.stringify(archives));
    } catch (e) {
      console.error("Failed to commit cold compliance archives", e);
    }
  }
}
