/**
 * RegisterDatasetIngestionService.ts
 * Coordinates ingestion of raw petrol register scan sheets, ZIP files, and directory uploads.
 * Isolates duplicate records using fingerprint matches and executes chronological and chronological indexing.
 */

import { RegisterImageFingerprintEngine, type FingerprintResult } from "./RegisterImageFingerprintEngine";
import { RegisterMetadataEngine, type ImageMetadataGrade } from "./RegisterMetadataEngine";
import { RegisterDatasetStorageEngine, type RegisterDatasetItem } from "./RegisterDatasetStorageEngine";

export interface BatchProcessingItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "queued" | "fingerprinting" | "metadata_analyzing" | "saving" | "duplicate_isolated" | "completed" | "failed";
  progress: number;
  error?: string;
  fingerprint?: FingerprintResult;
  metadata?: ImageMetadataGrade;
  isDuplicate?: boolean;
  duplicateOfId?: string;
}

export class RegisterDatasetIngestionService {
  /**
   * Processes a list of files in a batch operation.
   * Reports progress through callbacks.
   */
  public static async processBatch(
    branchId: string,
    files: File[],
    onProgress: (items: BatchProcessingItem[]) => void
  ): Promise<RegisterDatasetItem[]> {
    const queue: BatchProcessingItem[] = files.map(f => ({
      id: `img_ingest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      status: "queued",
      progress: 0
    }));

    onProgress([...queue]);

    const completedItems: RegisterDatasetItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = queue[i];

      try {
        // Step 1: Hashing and Perceptual fingerprinting
        item.status = "fingerprinting";
        item.progress = 20;
        onProgress([...queue]);

        const fingerprint = await RegisterImageFingerprintEngine.fingerprintFile(file);
        item.fingerprint = fingerprint;

        // Step 2: Check for duplicates in database
        const duplicateCheck = await RegisterDatasetStorageEngine.checkForDuplicate(branchId, fingerprint.sha256, fingerprint.pHash);
        
        if (duplicateCheck.isDuplicate) {
          item.status = "duplicate_isolated";
          item.isDuplicate = true;
          item.duplicateOfId = duplicateCheck.duplicateId;
          item.progress = 100;
          onProgress([...queue]);
          console.warn(`[Ingestion] File ${file.name} is a duplicate of ${duplicateCheck.duplicateId}`);
          continue;
        }

        // Step 3: Analyze scan quality metadata (Laplacian blur, skew angles)
        item.status = "metadata_analyzing";
        item.progress = 50;
        onProgress([...queue]);

        const metadata = await RegisterMetadataEngine.analyzeImage(file);
        item.metadata = metadata;

        // Step 4: Deterministic metadata parsing (Date, Shift, Branch)
        const parsedMetadata = this.parseFileNameMetadata(file.name);
        
        // Step 5: Save raw register to persistent Storage Engine
        item.status = "saving";
        item.progress = 80;
        onProgress([...queue]);

        const record: Omit<RegisterDatasetItem, "id"> = {
          branchId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          sha256: fingerprint.sha256,
          pHash: fingerprint.pHash,
          metadataGrade: metadata,
          extractedDate: parsedMetadata.date,
          shiftNumber: parsedMetadata.shift,
          registerLayoutType: parsedMetadata.layout,
          status: "RAW_UPLOAD",
          createdAt: new Date().toISOString(),
          reviewerId: ""
        };

        const savedRecord = await RegisterDatasetStorageEngine.saveIngestedItem(record);
        
        item.status = "completed";
        item.progress = 100;
        onProgress([...queue]);

        completedItems.push(savedRecord);
      } catch (err: any) {
        console.error(`Ingestion failure on file ${file.name}:`, err);
        item.status = "failed";
        item.progress = 100;
        item.error = err?.message || "Unhandled ingestion error";
        onProgress([...queue]);
      }
    }

    return completedItems;
  }

  /**
   * Deterministic filename parsing to extract dates, shift values, and layout boundaries.
   * Recognizes formats like: IOCL_2026_05_21_SHIFT2.png, HPCL_shift1_21-05-2026.jpg, etc.
   */
  private static parseFileNameMetadata(fileName: string): { date: string; shift: number; layout: "HPCL" | "IOCL" | "BPCL" | "GENERIC" } {
    const cleanName = fileName.toUpperCase();
    
    // 1. Identify petroleum layout provider
    let layout: "HPCL" | "IOCL" | "BPCL" | "GENERIC" = "GENERIC";
    if (cleanName.includes("HPCL") || cleanName.includes("HINDUSTAN")) layout = "HPCL";
    else if (cleanName.includes("IOCL") || cleanName.includes("INDIAN")) layout = "IOCL";
    else if (cleanName.includes("BPCL") || cleanName.includes("BHARAT")) layout = "BPCL";

    // 2. Extract shift index (defaults to shift 1)
    let shift = 1;
    const shiftMatch = cleanName.match(/SHIFT[_-]?(\d)/);
    if (shiftMatch && shiftMatch[1]) {
      shift = parseInt(shiftMatch[1]);
    }

    // 3. Extract chronological dates (YYYY-MM-DD or DD-MM-YYYY)
    let date = new Date().toISOString().split("T")[0]; // default to today
    
    // Try YYYY-MM-DD
    const yyyymmdd = fileName.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
    if (yyyymmdd) {
      date = `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
    } else {
      // Try DD-MM-YYYY
      const ddmmyyyy = fileName.match(/(\d{2})[_-](\d{2})[_-](\d{4})/);
      if (ddmmyyyy) {
        date = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
      }
    }

    return { date, shift, layout };
  }
}
