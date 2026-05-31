/**
 * LocalBackupManager.ts
 * ──────────────────────
 * Scheduled automatic backup orchestrator for offline-first desktop operation.
 *
 * Features:
 *  - Auto-backup every N minutes (configurable)
 *  - Manual on-demand export (Electron file dialog or browser download)
 *  - Restore from backup file with full integrity check
 *  - Keeps rolling list of recent auto-backups
 *  - Corruption detection via SHA-256 checksum
 *  - Purges backups older than retentionDays
 */

import { exportAllLocalData, importLocalData } from './LocalDatabaseEngine';
import { DesktopBridgeService }              from './DesktopBridgeService';

// ─── TYPES ───────────────────────────────────────────────────────────────────────

export interface BackupEntry {
  backupId:   string;
  timestamp:  string;
  sizeBytes:  number;
  type:       'auto' | 'manual';
  source:     'electron' | 'browser';
  checksum?:  string;
}

export interface BackupRestoreResult {
  success:      boolean;
  recordsLoaded: number;
  error?:       string;
}

// ─── CHECKSUM UTILITY ────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf  = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: basic FNV-1a for environments without SubtleCrypto
  let h = 2166136261;
  for (let i = 0; i < Math.min(text.length, 10000); i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ─── LOCAL BACKUP REGISTRY ────────────────────────────────────────────────────────

const BACKUP_REGISTRY_KEY = 'pumpai_backup_registry';

function loadRegistry(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegistry(entries: BackupEntry[]): void {
  try {
    // Keep last 200 entries
    localStorage.setItem(BACKUP_REGISTRY_KEY, JSON.stringify(entries.slice(-200)));
  } catch {}
}

function addToRegistry(entry: BackupEntry): void {
  const registry = loadRegistry();
  registry.push(entry);
  saveRegistry(registry);
}

// ─── MAIN MANAGER CLASS ──────────────────────────────────────────────────────────

export class LocalBackupManager {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;
  private static retentionDays = 30;
  private static listeners: Array<(entry: BackupEntry) => void> = [];

  /**
   * Start automatic backup scheduler.
   * @param intervalMinutes  How often to auto-backup (default: 60 minutes)
   * @param retentionDays    Days to keep backups (default: 30)
   */
  static start(intervalMinutes = 60, retentionDays = 30): void {
    if (this.intervalId) this.stop();

    this.retentionDays = retentionDays;

    // Run immediately on start, then at interval
    this.runAutoBackup();

    this.intervalId = setInterval(() => {
      this.runAutoBackup();
    }, intervalMinutes * 60_000);

    console.log(`[LocalBackupManager] Auto-backup started: every ${intervalMinutes}min, retention ${retentionDays}d`);
  }

  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[LocalBackupManager] Auto-backup stopped.');
  }

  static isActive(): boolean {
    return this.intervalId !== null;
  }

  static onBackupComplete(cb: (entry: BackupEntry) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private static notifyListeners(entry: BackupEntry): void {
    this.listeners.forEach(l => { try { l(entry); } catch {} });
  }

  // ── AUTO BACKUP ────────────────────────────────────────────────────────────────

  static async runAutoBackup(): Promise<BackupEntry | null> {
    if (this.isRunning) return null;
    this.isRunning = true;

    try {
      const data = await this.collectBackupPayload();
      const json = JSON.stringify(data);
      const checksum = await sha256(json);

      const entry: BackupEntry = {
        backupId:  `auto_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sizeBytes: new TextEncoder().encode(json).length,
        type:      'auto',
        source:    DesktopBridgeService.isElectron() ? 'electron' : 'browser',
        checksum
      };

      const payload = JSON.stringify({ meta: entry, data });

      if (DesktopBridgeService.isElectron()) {
        const timestamp = entry.timestamp.replace(/[:.]/g, '-').slice(0, 19);
        const filename  = `pumpai_auto_${timestamp}.pabk`;
        await DesktopBridgeService.backupWriteAuto(filename, payload);
      } else {
        // Browser: store in localStorage (limited size — last auto backup only)
        try {
          localStorage.setItem('pumpai_last_auto_backup', payload);
          localStorage.setItem('pumpai_last_auto_backup_time', entry.timestamp);
        } catch (e) {
          console.warn('[LocalBackupManager] localStorage auto-backup failed (quota?)', e);
        }
      }

      addToRegistry(entry);
      this.notifyListeners(entry);
      this.purgeExpiredRegistry();

      console.log(`[LocalBackupManager] Auto-backup completed: ${entry.backupId} (${Math.round(entry.sizeBytes / 1024)}KB)`);
      return entry;
    } catch (err) {
      console.error('[LocalBackupManager] Auto-backup failed:', err);
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  // ── MANUAL BACKUP ──────────────────────────────────────────────────────────────

  static async runManualBackup(): Promise<BackupEntry | null> {
    try {
      const data     = await this.collectBackupPayload();
      const json     = JSON.stringify(data);
      const checksum = await sha256(json);

      const entry: BackupEntry = {
        backupId:  `manual_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sizeBytes: new TextEncoder().encode(json).length,
        type:      'manual',
        source:    DesktopBridgeService.isElectron() ? 'electron' : 'browser',
        checksum
      };

      const payload = JSON.stringify({ meta: entry, data });

      const success = await DesktopBridgeService.exportManualBackup({ meta: entry, data });
      if (!success) return null;

      addToRegistry(entry);
      this.notifyListeners(entry);
      return entry;
    } catch (err) {
      console.error('[LocalBackupManager] Manual backup failed:', err);
      return null;
    }
  }

  // ── RESTORE ───────────────────────────────────────────────────────────────────

  static async restoreFromFile(): Promise<BackupRestoreResult> {
    try {
      let rawContent: string | null = null;

      if (DesktopBridgeService.isElectron()) {
        const result = await DesktopBridgeService.backupOpenDialog();
        if (!result) return { success: false, recordsLoaded: 0, error: 'Cancelled' };
        rawContent = result.content;
      } else {
        // Browser: use file input
        rawContent = await this.browseFileContent();
        if (!rawContent) return { success: false, recordsLoaded: 0, error: 'Cancelled' };
      }

      return await this.restoreFromJSON(rawContent);
    } catch (err: any) {
      return { success: false, recordsLoaded: 0, error: err?.message };
    }
  }

  static async restoreFromJSON(rawJson: string): Promise<BackupRestoreResult> {
    try {
      const parsed = JSON.parse(rawJson);

      // Support both bare data and { meta, data } wrapped format
      const data = parsed.data || parsed;

      // Integrity check
      if (parsed.meta?.checksum) {
        const expectedChecksum = parsed.meta.checksum;
        const actualChecksum   = await sha256(JSON.stringify(data));
        if (expectedChecksum !== actualChecksum) {
          return {
            success:       false,
            recordsLoaded: 0,
            error:         'Integrity check failed: backup file checksum mismatch.'
          };
        }
      }

      // Restore into IndexedDB
      await importLocalData(data);

      // Also restore active shift drafts to localStorage if present
      if (data.activeShiftDraft) {
        localStorage.setItem('pumpai_active_shift_draft', JSON.stringify(data.activeShiftDraft));
      }

      const recordCount =
        (data.shifts?.length     || 0) +
        (data.ledger?.length     || 0) +
        (data.snapshots?.length  || 0);

      console.log(`[LocalBackupManager] Restore complete. ${recordCount} records imported.`);
      return { success: true, recordsLoaded: recordCount };
    } catch (err: any) {
      return { success: false, recordsLoaded: 0, error: err?.message };
    }
  }

  // ── REGISTRY ──────────────────────────────────────────────────────────────────

  static getRegistry(): BackupEntry[] {
    return loadRegistry().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  private static purgeExpiredRegistry(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);
    const registry = loadRegistry().filter(e => new Date(e.timestamp) >= cutoff);
    saveRegistry(registry);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  private static async collectBackupPayload(): Promise<Record<string, any>> {
    const indexedDBData = await exportAllLocalData().catch(() => ({}));

    // Also pull active localStorage shift drafts
    const localStorageKeys = [
      'pumpai_active_shift_draft',
      'pumpai_reconcile_draft',
      'pumpai_tx_form_drafts',
      'pumpai_shift_close_performance_logs',
      'offline_edit_queue'
    ];

    const localStorageData: Record<string, any> = {};
    localStorageKeys.forEach(key => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) localStorageData[key] = JSON.parse(raw);
      } catch {}
    });

    return {
      ...indexedDBData,
      localStorageData,
      exportedAt:  new Date().toISOString(),
      appVersion:  '1.0.0',
      backupFormat: 'pumpai-v1'
    };
  }

  /** Opens a file picker in the browser, returns file contents */
  private static browseFileContent(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = '.pabk,.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

export default LocalBackupManager;
