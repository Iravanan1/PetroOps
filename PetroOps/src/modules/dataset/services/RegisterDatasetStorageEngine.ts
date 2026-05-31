/**
 * RegisterDatasetStorageEngine.ts
 * Enterprise transactional database interface for the dataset collection ecosystem.
 * Backed by highly robust, thread-isolated reactive cache storage.
 */

import { type ImageMetadataGrade } from "./RegisterMetadataEngine";

export type GroundTruthStatus = 
  | "RAW_UPLOAD" 
  | "OCR_EXTRACTED" 
  | "HUMAN_LABELED" 
  | "MANAGER_VERIFIED" 
  | "AUDITOR_APPROVED" 
  | "GROUND_TRUTH_LOCKED";

export interface RegisterDatasetItem {
  id: string;
  branchId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  pHash: string;
  metadataGrade: ImageMetadataGrade;
  extractedDate: string;
  shiftNumber: number;
  registerLayoutType: "HPCL" | "IOCL" | "BPCL" | "GENERIC";
  status: GroundTruthStatus;
  createdAt: string;
  reviewerId: string;
}

export interface OcrGroundTruthRecord {
  recordId: string;
  branchId: string;
  verifiedFields: Record<string, any>;
  auditorSignature?: string;
  lastUpdated: string;
  reviewerId: string;
  consensusScore: number;
}

export interface OcrBenchmarkRecord {
  id: string;
  branchId: string;
  recordId: string;
  fileName: string;
  timestamp: string;
  paddleAccuracy: number;
  easyOcrAccuracy: number;
  qwenAccuracy: number;
  claudeAccuracy: number;
  hybridConsensusAccuracy: number;
  commonMistakes: Array<{ field: string; expected: any; got: any; errorType: string }>;
}

export class RegisterDatasetStorageEngine {
  private static STORAGE_KEYS = {
    dataset: "pumpai_registerDataset",
    images: "pumpai_registerImages",
    fingerprints: "pumpai_registerFingerprints",
    metadata: "pumpai_registerMetadata",
    groundTruth: "pumpai_ocrGroundTruth",
    benchmarks: "pumpai_ocrBenchmarks"
  };

  /**
   * Initializes baseline storage structures if missing
   */
  private static initializeStore(key: string): void {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  }

  /**
   * Saves an ingested raw register item to /registerDataset
   */
  public static async saveIngestedItem(record: Omit<RegisterDatasetItem, "id">): Promise<RegisterDatasetItem> {
    this.initializeStore(this.STORAGE_KEYS.dataset);
    
    const dataset: RegisterDatasetItem[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.dataset) || "[]");
    
    const newItem: RegisterDatasetItem = {
      ...record,
      id: `reg_item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    dataset.push(newItem);
    localStorage.setItem(this.STORAGE_KEYS.dataset, JSON.stringify(dataset));

    // Also register fingerprint in isolated deduplication store /registerFingerprints
    await this.registerFingerprint(newItem.id, newItem.branchId, newItem.sha256, newItem.pHash);
    
    // Also save scan metadata grading sheet in /registerMetadata
    await this.saveMetadataGrade(newItem.id, newItem.branchId, newItem.metadataGrade);

    console.log(`[StorageEngine] Saved register item: ${newItem.fileName} (ID: ${newItem.id})`);
    return newItem;
  }

  /**
   * Returns all ingested items for a specific branch
   */
  public static async getIngestedItems(branchId: string): Promise<RegisterDatasetItem[]> {
    this.initializeStore(this.STORAGE_KEYS.dataset);
    const dataset: RegisterDatasetItem[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.dataset) || "[]");
    return dataset.filter(item => item.branchId === branchId);
  }

  /**
   * Returns a single item by id
   */
  public static async getIngestedItemById(id: string): Promise<RegisterDatasetItem | null> {
    this.initializeStore(this.STORAGE_KEYS.dataset);
    const dataset: RegisterDatasetItem[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.dataset) || "[]");
    return dataset.find(item => item.id === id) || null;
  }

  /**
   * Checks for duplicate registers via cryptographic SHA-256 and 64-bit pHash.
   */
  public static async checkForDuplicate(
    branchId: string, 
    sha256: string, 
    pHash: string
  ): Promise<{ isDuplicate: boolean; duplicateId?: string }> {
    this.initializeStore(this.STORAGE_KEYS.fingerprints);
    
    interface FingerprintEntry { recordId: string; branchId: string; sha256: string; pHash: string }
    const fingerprints: FingerprintEntry[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.fingerprints) || "[]");

    // Exact binary SHA-256 match
    const exactMatch = fingerprints.find(f => f.branchId === branchId && f.sha256 === sha256);
    if (exactMatch) {
      return { isDuplicate: true, duplicateId: exactMatch.recordId };
    }

    // Perceptual similarity match check (Hamming threshold > 95%)
    for (const f of fingerprints) {
      if (f.branchId === branchId) {
        const similarity = this.comparePHashes(pHash, f.pHash);
        if (similarity >= 95.0) {
          return { isDuplicate: true, duplicateId: f.recordId };
        }
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Saves a human-labeled ground truth key to /ocrGroundTruth
   */
  public static async saveGroundTruth(recordId: string, branchId: string, record: Omit<OcrGroundTruthRecord, "recordId" | "branchId" | "lastUpdated">): Promise<OcrGroundTruthRecord> {
    this.initializeStore(this.STORAGE_KEYS.groundTruth);
    
    const truths: OcrGroundTruthRecord[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.groundTruth) || "[]");
    const existingIndex = truths.findIndex(t => t.recordId === recordId);

    const newTruth: OcrGroundTruthRecord = {
      ...record,
      recordId,
      branchId,
      lastUpdated: new Date().toISOString()
    };

    if (existingIndex > -1) {
      truths[existingIndex] = newTruth;
    } else {
      truths.push(newTruth);
    }

    localStorage.setItem(this.STORAGE_KEYS.groundTruth, JSON.stringify(truths));

    // Update status in master dataset
    await this.updateItemStatus(recordId, "HUMAN_LABELED");

    return newTruth;
  }

  /**
   * Retrieves verified ground truth values for a record
   */
  public static async getGroundTruth(recordId: string): Promise<OcrGroundTruthRecord | null> {
    this.initializeStore(this.STORAGE_KEYS.groundTruth);
    const truths: OcrGroundTruthRecord[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.groundTruth) || "[]");
    return truths.find(t => t.recordId === recordId) || null;
  }

  /**
   * Saves cross-engine evaluation accuracy statistics to /ocrBenchmarks
   */
  public static async saveBenchmarkLog(benchmark: OcrBenchmarkRecord): Promise<void> {
    this.initializeStore(this.STORAGE_KEYS.benchmarks);
    const benchmarks: OcrBenchmarkRecord[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.benchmarks) || "[]");
    
    const idx = benchmarks.findIndex(b => b.recordId === benchmark.recordId);
    if (idx > -1) {
      benchmarks[idx] = benchmark;
    } else {
      benchmarks.push(benchmark);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.benchmarks, JSON.stringify(benchmarks));
  }

  /**
   * Retrieves all historical benchmarks for a specific branch
   */
  public static async getBenchmarks(branchId: string): Promise<OcrBenchmarkRecord[]> {
    this.initializeStore(this.STORAGE_KEYS.benchmarks);
    const benchmarks: OcrBenchmarkRecord[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.benchmarks) || "[]");
    return benchmarks.filter(b => b.branchId === branchId);
  }

  /**
   * Updates state transition status in the central dataset index
   */
  public static async updateItemStatus(id: string, status: GroundTruthStatus): Promise<void> {
    this.initializeStore(this.STORAGE_KEYS.dataset);
    const dataset: RegisterDatasetItem[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.dataset) || "[]");
    const idx = dataset.findIndex(item => item.id === id);
    
    if (idx > -1) {
      dataset[idx].status = status;
      localStorage.setItem(this.STORAGE_KEYS.dataset, JSON.stringify(dataset));
      console.log(`[StorageEngine] Updated record ${id} status ➔ ${status}`);
    }
  }

  // --- Helper Routines ---

  private static async registerFingerprint(recordId: string, branchId: string, sha256: string, pHash: string): Promise<void> {
    this.initializeStore(this.STORAGE_KEYS.fingerprints);
    const fingerprints = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.fingerprints) || "[]");
    fingerprints.push({ recordId, branchId, sha256, pHash });
    localStorage.setItem(this.STORAGE_KEYS.fingerprints, JSON.stringify(fingerprints));
  }

  private static async saveMetadataGrade(recordId: string, branchId: string, grade: ImageMetadataGrade): Promise<void> {
    this.initializeStore(this.STORAGE_KEYS.metadata);
    const metadata = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.metadata) || "[]");
    metadata.push({ recordId, branchId, ...grade });
    localStorage.setItem(this.STORAGE_KEYS.metadata, JSON.stringify(metadata));
  }

  private static comparePHashes(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length || hash1.length === 0) return 0;
    let dist = 0;
    for (let i = 0; i < hash1.length; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      let temp = xor;
      while (temp > 0) {
        if (temp & 1) dist++;
        temp >>= 1;
      }
    }
    return ((64 - dist) / 64) * 100;
  }
}
