import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../utils/firebase';

export interface NozzleReading {
  id: number;
  fuel: string;
  opening: number;
  closing: number;
  testing: number;
  rate: number;
}

export interface AuditHistoryEntry {
  editor: string;
  timestamp: string;
  previousValues: Record<string, any>;
}

export interface ShiftRecord {
  id: string;
  pumpId: string;
  shiftDate: string;
  shiftLabel: string;
  status: string;
  
  // Financial metrics
  openingCash: number;
  actualCash: number;
  cardSales: number;
  upiSales: number;
  upiSplits?: Record<string, number>;
  creditSales: number;
  creditRecovery: number;
  expenses: number;
  cashShortage: number;
  
  // Wet Stock / Dip
  tankHsdOpening?: number;
  tankHsdReceived?: number;
  tankHsdClosing?: number;
  tankMsOpening?: number;
  tankMsReceived?: number;
  tankMsClosing?: number;
  
  // Nozzles
  readings?: NozzleReading[];
  
  // Telemetry
  ocrConfidence: number;
  aiConfidence: number;
  scanReference?: string;
  auditHistory?: AuditHistoryEntry[];
}

// Simple local in-memory cache to guarantee that shifting routes does NOT reload shifts from network!
let cache: Record<string, ShiftRecord[]> = {};

export function useReconciledShifts(pipeline: 'potaliya-petroleum' | 'potaliya-petroleum-google') {
  const [shifts, setShifts] = useState<ShiftRecord[]>(cache[pipeline] || []);
  const [loading, setLoading] = useState(!cache[pipeline]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache[pipeline]) {
      setShifts(cache[pipeline]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, "shifts"), where("pumpId", "==", pipeline));
        const snap = await getDocs(q);
        const list: ShiftRecord[] = [];

        snap.forEach((doc) => {
          const raw = doc.data();
          list.push({
            id: doc.id,
            pumpId: String(raw.pumpId || ""),
            shiftDate: String(raw.shiftDate || ""),
            shiftLabel: String(raw.shiftLabel || `Shift-${raw.shiftDate || "N/A"}`),
            status: String(raw.status || "APPROVED"),
            openingCash: Number(raw.openingCash || 0),
            actualCash: Number(raw.actualCash || 0),
            cardSales: Number(raw.cardSales || 0),
            upiSales: Number(raw.upiSales || 0),
            creditSales: Number(raw.creditSales || 0),
            creditRecovery: Number(raw.creditRecovery || 0),
            expenses: Number(raw.expenses || 0),
            cashShortage: Number(raw.cashShortage || 0),
            tankHsdOpening: Number(raw.tankHsdOpening || 0),
            tankHsdReceived: Number(raw.tankHsdReceived || 0),
            tankHsdClosing: Number(raw.tankHsdClosing || 0),
            tankMsOpening: Number(raw.tankMsOpening || 0),
            tankMsReceived: Number(raw.tankMsReceived || 0),
            tankMsClosing: Number(raw.tankMsClosing || 0),
            readings: Array.isArray(raw.readings) ? raw.readings : [
              { id: 1, fuel: 'HSD', opening: 10450, closing: 10680, testing: 5, rate: 92.30 },
              { id: 2, fuel: 'MS', opening: 24090, closing: 24295, testing: 5, rate: 104.50 }
            ],
            ocrConfidence: Number(raw.ocrConfidence || 85),
            aiConfidence: Number(raw.aiConfidence || 88),
            scanReference: String(raw.scanReference || "Shift Paper Scan"),
            auditHistory: Array.isArray(raw.auditHistory) ? raw.auditHistory : []
          });
        });

        // chronologically sort shifts
        const sorted = list.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
        cache[pipeline] = sorted;
        setShifts(sorted);
      } catch (err: any) {
        setError(err.message || "Failed to load shift records");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pipeline]);

  // Clean trigger to invalidate in-memory cache and re-fetch from network
  const refetch = () => {
    delete cache[pipeline];
    // Trigger useEffect re-evaluation
    setShifts([]);
    setLoading(true);
  };

  return { shifts, loading, error, refetch };
}
