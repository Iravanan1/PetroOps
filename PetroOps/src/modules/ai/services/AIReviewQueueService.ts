import { db } from '../../../utils/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';

export interface ReviewItem {
  id: string;
  shiftId: string;
  branchId: string;
  status: 'PENDING' | 'RECONCILED' | 'REJECTED';
  ocrConfidence: number;
  anomalies: string[];
  rawText: string;
  structuredData: any;
  createdAt: string;
}

export class AIReviewQueueService {
  private static inMemoryQueue: Map<string, ReviewItem> = new Map();

  /**
   * Pushes a low confidence or anomalous OCR sheet to the Manager's Review Queue.
   */
  public static async pushToQueue(item: Omit<ReviewItem, 'createdAt'>): Promise<void> {
    const record: ReviewItem = {
      ...item,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "aiReviews", item.id), record);
    } catch (e) {
      console.warn("[AIReviewQueueService] Caching review queue item locally.");
    }

    const key = `review_item_${item.id}`;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(record));
      } catch (err) {}
    }
    this.inMemoryQueue.set(key, record);
  }

  /**
   * Resolves list query. Supports multi-branch and offline cached buffers.
   */
  public static async getPendingQueue(branchId: string): Promise<ReviewItem[]> {
    try {
      const q = query(collection(db, "aiReviews"), where("branchId", "==", branchId), where("status", "==", "PENDING"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReviewItem));
    } catch (e) {
      // Fallback: list all locally stored offline pending review jobs
      const list: ReviewItem[] = [];
      if (typeof localStorage !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("review_item_")) {
              const item = JSON.parse(localStorage.getItem(key) || "{}") as ReviewItem;
              if (item.branchId === branchId && item.status === 'PENDING') {
                list.push(item);
              }
            }
          }
        } catch (err) {}
      } else {
        this.inMemoryQueue.forEach(item => {
          if (item.branchId === branchId && item.status === 'PENDING') {
            list.push(item);
          }
        });
      }
      return list;
    }
  }
}
