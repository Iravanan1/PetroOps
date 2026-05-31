/**
 * DesktopBridgeService.ts
 * ────────────────────────
 * Renderer-side wrapper for the Electron IPC bridge (window.electronAPI).
 *
 * Usage in React components:
 *   import { DesktopBridgeService as Desktop } from '...';
 *   if (Desktop.isElectron()) { ... }
 *   const info = await Desktop.getSystemInfo();
 *
 * Falls back gracefully when running in a browser (no Electron).
 */

// ─── TYPE DECLARATIONS ────────────────────────────────────────────────────────────

export interface SystemInfo {
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpuCount: number;
  hostname: string;
  dataDir: string;
  backupDir: string;
  logDir: string;
  dbDir: string;
  uptime: number;
}

export interface HardwareStatus {
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: string;
  freeMemGB: string;
  usedMemPct: number;
  diskFreeGB: number | null;
  backendRunning: boolean;
  uptime: number;
}

export interface DesktopContext {
  version: string;
  platform: string;
  arch: string;
  dataDir: string;
  backupDir: string;
  logDir: string;
  dbDir: string;
  isElectron: boolean;
}

export interface FileEntry {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  isDir: boolean;
}

export interface BackupFileEntry {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  path: string;
}

export interface PrintOptions {
  silent?: boolean;
  thermalMode?: boolean;
  thermalWidth?: 58 | 80;
  deviceName?: string;
}

// ─── BRIDGE ACCESS ────────────────────────────────────────────────────────────────

/** Returns the Electron IPC bridge or null when running in a browser. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function api(): any | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return null;
}

// ─── SERVICE METHODS ─────────────────────────────────────────────────────────────

export const DesktopBridgeService = {

  // ── Detection ────────────────────────────────────────────────────────────────
  isElectron(): boolean {
    return api()?.isElectron === true;
  },

  // ── System Info ──────────────────────────────────────────────────────────────
  async getSystemInfo(): Promise<SystemInfo | null> {
    return api()?.getSystemInfo() ?? null;
  },

  async getHardwareStatus(): Promise<HardwareStatus | null> {
    return api()?.getHardwareStatus() ?? null;
  },

  onDesktopContext(callback: (ctx: DesktopContext) => void): () => void {
    const cleanup = api()?.onDesktopContext(callback);
    return cleanup ?? (() => {});
  },

  // ── File System ──────────────────────────────────────────────────────────────
  async fsRead(relativePath: string): Promise<string | null> {
    return api()?.fsRead(relativePath) ?? null;
  },

  async fsWrite(relativePath: string, content: string): Promise<{ success: boolean; path?: string }> {
    return api()?.fsWrite(relativePath, content) ?? { success: false };
  },

  async fsDelete(relativePath: string): Promise<{ success: boolean }> {
    return api()?.fsDelete(relativePath) ?? { success: false };
  },

  async fsList(relativeDir: string): Promise<FileEntry[]> {
    return api()?.fsList(relativeDir) ?? [];
  },

  // ── Backup ───────────────────────────────────────────────────────────────────
  async backupSaveDialog(defaultFilename?: string): Promise<string | null> {
    return api()?.backupSaveDialog(defaultFilename) ?? null;
  },

  async backupWriteExternal(externalPath: string, content: string): Promise<{ success: boolean; error?: string }> {
    return api()?.backupWriteExternal(externalPath, content) ?? { success: false };
  },

  async backupOpenDialog(): Promise<{ path: string; content: string } | null> {
    return api()?.backupOpenDialog() ?? null;
  },

  async backupListAuto(): Promise<BackupFileEntry[]> {
    return api()?.backupListAuto() ?? [];
  },

  async backupWriteAuto(filename: string, content: string): Promise<{ success: boolean; error?: string }> {
    return api()?.backupWriteAuto(filename, content) ?? { success: false };
  },

  /**
   * Convenience method: serialize all provided data, write to auto-backup folder.
   * Automatically names the file by date.
   */
  async performAutoBackup(allData: Record<string, any>): Promise<boolean> {
    if (!this.isElectron()) {
      // Browser fallback: dump to localStorage
      try {
        const json = JSON.stringify({ ...allData, exportedAt: new Date().toISOString() });
        localStorage.setItem('pumpai_last_backup', json);
        localStorage.setItem('pumpai_last_backup_time', new Date().toISOString());
        return true;
      } catch { return false; }
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename  = `pumpai_auto_backup_${timestamp}.pabk`;
      const json      = JSON.stringify({ ...allData, exportedAt: new Date().toISOString() });
      const result    = await this.backupWriteAuto(filename, json);
      return result.success;
    } catch { return false; }
  },

  /**
   * Manual export via save dialog — user picks where to save.
   */
  async exportManualBackup(allData: Record<string, any>): Promise<boolean> {
    if (!this.isElectron()) {
      // Browser fallback: trigger download
      try {
        const json = JSON.stringify({ ...allData, exportedAt: new Date().toISOString() });
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `pumpai_backup_${Date.now()}.pabk`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      } catch { return false; }
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFilename = `pumpai_backup_${timestamp}.pabk`;
      const savePath  = await this.backupSaveDialog(defaultFilename);
      if (!savePath) return false;
      const json = JSON.stringify({ ...allData, exportedAt: new Date().toISOString() });
      const result = await this.backupWriteExternal(savePath, json);
      return result.success;
    } catch { return false; }
  },

  // ── Logging ──────────────────────────────────────────────────────────────────
  async getCrashLog(): Promise<string> {
    return api()?.getCrashLog() ?? '';
  },

  async getStartupLog(): Promise<string> {
    return api()?.getStartupLog() ?? '';
  },

  async clearLogs(): Promise<void> {
    await api()?.clearLogs();
  },

  reportError(message: string, stack?: string, context?: string): void {
    api()?.reportRendererError(message, stack, context);
    console.error(`[DesktopBridge] Renderer error reported: [${context}] ${message}`);
  },

  // ── Printing ─────────────────────────────────────────────────────────────────
  print(htmlContent: string, options: PrintOptions = {}): void {
    if (this.isElectron()) {
      api()?.print(htmlContent, options);
    } else {
      // Browser fallback: open print dialog
      const w = window.open('', '_blank', 'width=900,height=700');
      if (w) {
        w.document.write(htmlContent);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 500);
      }
    }
  },

  onPrintReply(callback: (result: { success: boolean; error?: string }) => void): void {
    api()?.onPrintReply(callback);
  },

  async exportPDF(htmlContent: string, defaultFilename?: string): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }> {
    if (this.isElectron()) {
      return api()?.exportPDF(htmlContent, defaultFilename) ?? { success: false };
    }
    // Browser fallback: attempt print-to-pdf
    window.print();
    return { success: true };
  },

  // ── Shell ────────────────────────────────────────────────────────────────────
  async openPath(targetPath: string): Promise<void> {
    await api()?.openPath(targetPath);
  },

  async showInExplorer(targetPath: string): Promise<void> {
    await api()?.showInExplorer(targetPath);
  },

  // ── Deep Links ───────────────────────────────────────────────────────────────
  onDeepLink(callback: (url: string) => void): () => void {
    return api()?.onDeepLink(callback) ?? (() => {});
  },

  // ── Auto-Updater ─────────────────────────────────────────────────────────────
  checkForUpdates(): void {
    api()?.checkForUpdates();
  },

  async applyUpdate(): Promise<{ willRestart: boolean }> {
    return api()?.applyUpdate() ?? { willRestart: false };
  },

  async rollbackUpdate(): Promise<{ success: boolean; rolledBackTo?: string; error?: string }> {
    return api()?.rollbackUpdate() ?? { success: false };
  },

  onUpdateAvailable(cb: (info: any) => void): () => void {
    return api()?.onUpdateAvailable(cb) ?? (() => {});
  },

  onUpdateNotAvailable(cb: (info: any) => void): () => void {
    return api()?.onUpdateNotAvailable(cb) ?? (() => {});
  },

  onUpdateDownloaded(cb: () => void): () => void {
    return api()?.onUpdateDownloaded(cb) ?? (() => {});
  },

  // ── App Lifecycle ────────────────────────────────────────────────────────────
  async relaunch(): Promise<void> {
    await api()?.relaunchApp();
  },

  async quit(): Promise<void> {
    await api()?.quitApp();
  }

};

export default DesktopBridgeService;
