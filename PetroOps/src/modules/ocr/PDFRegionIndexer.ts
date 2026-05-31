import { db } from '../../utils/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { BoundedRegion } from './RegionSegmentationService';

export interface PDFPageIndexRecord {
  documentId: string;
  pageNumber: number;
  ocrHash: string;
  regions: BoundedRegion[];
  preprocessingFilters: string[];
  retryCount: number;
  timestamp: string;
}

export class PDFRegionIndexer {
  private static inMemoryIndex: Map<string, PDFPageIndexRecord> = new Map();

  /**
   * Indexes and caches the layout coordinates of a page to support instant, selective retries.
   */
  public static async indexPage(
    documentId: string,
    pageNumber: number,
    ocrHash: string,
    regions: BoundedRegion[],
    filters: string[]
  ): Promise<void> {
    const record: PDFPageIndexRecord = {
      documentId,
      pageNumber,
      ocrHash,
      regions,
      preprocessingFilters: filters,
      retryCount: 0,
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "ocrRegions"), record);
    } catch (e) {
      console.warn("[PDFRegionIndexer] Local storage index logged in offline workspace.");
    }

    const key = `ocr_index_${documentId}_p${pageNumber}`;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(record));
      } catch (err) {}
    }
    this.inMemoryIndex.set(key, record);
  }

  /**
   * Retrieves page indexes. Prevents repetitive OCR passes when files are uploaded again.
   */
  public static getPageIndex(documentId: string, pageNumber: number): PDFPageIndexRecord | null {
    const key = `ocr_index_${documentId}_p${pageNumber}`;
    if (typeof localStorage !== 'undefined') {
      try {
        const local = localStorage.getItem(key);
        if (local) {
          return JSON.parse(local) as PDFPageIndexRecord;
        }
      } catch (err) {}
    }
    return this.inMemoryIndex.get(key) || null;
  }
}
