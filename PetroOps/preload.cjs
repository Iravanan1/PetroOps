/**
 * preload.cjs — PetroOps Electron Preload Script
 * ─────────────────────────────────────────────
 * Exposes a structured, minimal, type-safe IPC bridge from the main process
 * to the React renderer. Every channel is explicitly allow-listed.
 * Context isolation is ON — no direct Node access from renderer.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ─── HELPERS ─────────────────────────────────────────────────────────────────────

/** Fire-and-forget IPC send */
const send = (channel, ...args) => ipcRenderer.send(channel, ...args);

/** Invoke (async request/response) */
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

/** Register a listener, returns cleanup function */
const on = (channel, callback) => {
  const sub = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, sub);
  return () => ipcRenderer.removeListener(channel, sub);
};

/** Register a one-time listener */
const once = (channel, callback) => {
  ipcRenderer.once(channel, (_event, ...args) => callback(...args));
};

// ─── BRIDGE API ───────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', {

  // ── DETECTION ──────────────────────────────────────────────────────────────────
  /** True when running inside Electron (not a browser tab) */
  isElectron: true,

  // ── SYSTEM INFO ────────────────────────────────────────────────────────────────
  getSystemInfo:    () => invoke('system:info'),
  getHardwareStatus:() => invoke('hardware:status'),

  // ── DESKTOP CONTEXT (pushed on startup) ───────────────────────────────────────
  onDesktopContext: (cb) => on('desktop-context', cb),

  // ── FILE SYSTEM (safe, sandboxed to userData) ─────────────────────────────────
  fsRead:   (relativePath)         => invoke('fs:read',   relativePath),
  fsWrite:  (relativePath, content)=> invoke('fs:write',  relativePath, content),
  fsDelete: (relativePath)         => invoke('fs:delete', relativePath),
  fsList:   (relativeDir)          => invoke('fs:list',   relativeDir),

  // ── BACKUP ─────────────────────────────────────────────────────────────────────
  backupSaveDialog:  (defaultFilename)         => invoke('backup:save-dialog', defaultFilename),
  backupWriteExternal:(externalPath, content)  => invoke('backup:write-external', externalPath, content),
  backupOpenDialog:  ()                        => invoke('backup:open-dialog'),
  backupListAuto:    ()                        => invoke('backup:list-auto'),
  backupWriteAuto:   (filename, content)       => invoke('backup:write-auto', filename, content),

  // ── LOGGING ────────────────────────────────────────────────────────────────────
  getCrashLog:     ()        => invoke('logs:get-crash'),
  getStartupLog:   ()        => invoke('logs:get-startup'),
  clearLogs:       ()        => invoke('logs:clear'),
  reportRendererError: (msg, stack, context) =>
    send('logs:renderer-error', { message: msg, stack, context }),

  // ── PRINTING ───────────────────────────────────────────────────────────────────
  /** Trigger native OS print dialog or silent thermal spooling */
  print: (htmlContent, options = {}) =>
    send('trigger-native-print', { htmlContent, options }),

  /** Register callback for print result */
  onPrintReply: (cb) => once('print-reply', cb),

  /** Export print document to PDF file (shows save dialog) */
  exportPDF: (htmlContent, defaultFilename) =>
    invoke('pdf:export', { htmlContent, defaultFilename }),

  // ── SHELL ──────────────────────────────────────────────────────────────────────
  openPath:   (targetPath) => invoke('shell:open-path', targetPath),
  showInExplorer: (targetPath) => invoke('shell:show-item', targetPath),

  // ── DEEP LINKS ────────────────────────────────────────────────────────────────
  onDeepLink: (cb) => on('deep-link', cb),

  // ── AUTO-UPDATER ──────────────────────────────────────────────────────────────
  checkForUpdates:      ()  => send('check-for-updates'),
  applyUpdate:          ()  => invoke('update:apply'),
  rollbackUpdate:       ()  => invoke('update:rollback'),
  onUpdateAvailable:    (cb)=> on('update-available', cb),
  onUpdateNotAvailable: (cb)=> on('update-not-available', cb),
  onUpdateDownloaded:   (cb)=> on('update-downloaded', cb),

  // ── APP LIFECYCLE ─────────────────────────────────────────────────────────────
  relaunchApp: () => invoke('app:relaunch'),
  quitApp:     () => invoke('app:quit')

});
