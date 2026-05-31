import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

const APP_VERSION = '1.0.0';
const APP_NAME = 'PumpAI';
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const DB_DIR = path.join(app.getPath('userData'), 'database');
const CRASH_LOG_FILE = path.join(LOG_DIR, 'crash.log');
const STARTUP_LOG_FILE = path.join(LOG_DIR, 'startup.log');

let mainWindow: BrowserWindow | null = null;
let backendProc: any = null;
let tray: Tray | null = null;
let startupTime = Date.now();

function ensureDataDirs() {
  [LOG_DIR, BACKUP_DIR, DB_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function appendCrashLog(message: string, error?: any) {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}${error ? ` | Error: ${error.stack || error.message || error}` : ''}\n`;
    fs.appendFileSync(CRASH_LOG_FILE, line);
  } catch (_) {}
}

function appendStartupLog(message: string) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(STARTUP_LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (_) {}
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createTray() {
  try {
    // Generate a default 16x16 solid indicator for tray fallback
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show PumpAI', click: () => { mainWindow?.show(); } },
      { label: 'Relaunch Platform', click: () => { app.relaunch(); app.exit(0); } },
      { type: 'separator' },
      { label: 'Quit Operating System', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('PumpAI Operating System');
    tray.setContextMenu(contextMenu);
    appendStartupLog('System tray integrated successfully.');
  } catch (err) {
    appendCrashLog('Failed to create tray', err);
  }
}

function setupAutoLaunch() {
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
    appendStartupLog('Auto-launch settings established.');
  } catch (err) {
    appendCrashLog('Failed to setup auto-launch', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: `${APP_NAME} — Petroleum Operating System`,
    backgroundColor: '#FAF9F6',
    autoHideMenuBar: true
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(err => {
      appendCrashLog('Failed to load production index.html', err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    appendStartupLog(`Window ready-to-show in ${Date.now() - startupTime}ms`);
  });
}

app.whenReady().then(() => {
  ensureDataDirs();
  appendStartupLog('Application booted. Setting up native environment...');
  createTray();
  setupAutoLaunch();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Expose standard diagnostics & recovery IPCs
ipcMain.handle('system:info', () => ({
  version: APP_VERSION,
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  uptime: Math.round((Date.now() - startupTime) / 1000)
}));

ipcMain.handle('logs:get-crash', () => {
  if (!fs.existsSync(CRASH_LOG_FILE)) return '';
  return fs.readFileSync(CRASH_LOG_FILE, 'utf-8');
});

ipcMain.handle('logs:get-startup', () => {
  if (!fs.existsSync(STARTUP_LOG_FILE)) return '';
  return fs.readFileSync(STARTUP_LOG_FILE, 'utf-8');
});
