import { ShiftExtraction } from '../types/index.js';

export interface OfflineScan {
  id: string;
  files: { name: string; type: string; base64: string }[];
  pumpId: string;
  shiftDate: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
}

export class OfflineSyncManager {
  private static DB_NAME = 'PumpAI_Offline_DB';
  private static STORE_NAME = 'offline_scans';
  private static db: IDBDatabase | null = null;

  public static async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      
      request.onerror = () => {
        console.error('IndexedDB opening failed');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB offline-sync database initialized successfully.');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  public static async saveScan(files: File[], pumpId: string): Promise<string> {
    await this.init();
    const id = `offline-scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const filePromises = files.map(file => {
      return new Promise<{ name: string; type: string; base64: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            base64: reader.result as string
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    const base64Files = await Promise.all(filePromises);

    const record: OfflineScan = {
      id,
      files: base64Files,
      pumpId,
      shiftDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => {
        console.log(`Scan preserved locally in IndexedDB: ${id}`);
        resolve(id);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async getPendingScans(): Promise<OfflineScan[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as OfflineScan[];
        resolve(records.filter(r => r.status === 'pending' || r.status === 'failed'));
      };

      request.onerror = () => reject(request.error);
    });
  }

  public static async updateStatus(id: string, status: 'pending' | 'syncing' | 'failed'): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as OfflineScan;
        if (record) {
          record.status = status;
          store.put(record).onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  public static async deleteScan(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
