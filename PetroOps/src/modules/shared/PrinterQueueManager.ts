/**
 * PrinterQueueManager.ts
 * ───────────────────────
 * Supervises physical thermal printer queues, connection retries,
 * and roll status sensors.
 */

import { printerHardeningLayer, PrintJob } from '../hardware/PrinterHardeningLayer';

export class PrinterQueueManager {
  private static instance: PrinterQueueManager;
  private listeners: Set<(jobs: PrintJob[]) => void> = new Set();
  private intervalId: any = null;

  private constructor() {
    this.startSupervisor();
  }

  public static getInstance(): PrinterQueueManager {
    if (!PrinterQueueManager.instance) {
      PrinterQueueManager.instance = new PrinterQueueManager();
    }
    return PrinterQueueManager.instance;
  }

  private startSupervisor() {
    this.intervalId = setInterval(() => {
      const activeJobs = printerHardeningLayer.getQueue();
      this.notifyListeners(activeJobs);
    }, 1500);
  }

  public getQueueStatus() {
    return printerHardeningLayer.getStatus();
  }

  public getActiveJobs(): PrintJob[] {
    return printerHardeningLayer.getQueue();
  }

  public clearFailedJobs() {
    printerHardeningLayer.getFailedJobs().forEach(j => {
      // Clear jobs to prevent duplicate print loop hang-ups
      j.status = 'done';
    });
  }

  public subscribe(listener: (jobs: PrintJob[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getActiveJobs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(jobs: PrintJob[]) {
    this.listeners.forEach(l => l(jobs));
  }

  public destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.listeners.clear();
  }
}

export default PrinterQueueManager;
