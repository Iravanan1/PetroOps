/**
 * electron.cjs — PetroOps Desktop Main Process
 * ───────────────────────────────────────────
 * Production-hardened Electron shell for offline-first petroleum station operations.
 * Priorities: stability, data safety, operational trust.
 */

'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const APP_VERSION = '1.0.0';
const APP_NAME = 'PetroOps';
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const DB_DIR = path.join(app.getPath('userData'), 'database');
const CRASH_LOG_FILE = path.join(LOG_DIR, 'crash.log');
const STARTUP_LOG_FILE = path.join(LOG_DIR, 'startup.log');

// ─── ENSURE DATA DIRECTORIES ────────────────────────────────────────────────────

function ensureDataDirs() {
  [LOG_DIR, BACKUP_DIR, DB_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

ensureDataDirs();

// ─── CRASH LOGGER ────────────────────────────────────────────────────────────────

function appendCrashLog(message, error) {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}${error ? ` | Error: ${error.stack || error.message || error}` : ''}\n`;
    fs.appendFileSync(CRASH_LOG_FILE, line);
  } catch (_) { /* never throw from logger */ }
}

function appendStartupLog(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(STARTUP_LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (_) { }
}

process.on('uncaughtException', (error) => {
  appendCrashLog('UNCAUGHT EXCEPTION in main process', error);
  console.error('[PetroOps] CRITICAL UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
  appendCrashLog('UNHANDLED PROMISE REJECTION in main process', reason);
  console.error('[PetroOps] UNHANDLED REJECTION:', reason);
});

// ─── SINGLE INSTANCE LOCK ────────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  appendStartupLog('Second instance detected. Quitting.');
  app.quit();
}

// ─── STATE ───────────────────────────────────────────────────────────────────────

let mainWindow = null;
let splashWindow = null;
let backendProc = null;
let deepLinkUrl = null;
let startupTime = Date.now();

// ─── DEEP LINK PROTOCOL ──────────────────────────────────────────────────────────

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('petroops', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('petroops');
}

app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const url = commandLine.find(arg => arg.startsWith('petroops://'));
  if (url) handleDeepLink(url);
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url) {
  deepLinkUrl = url;
  appendStartupLog(`Deep link received: ${url}`);
  if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deep-link', url);
  }
}

// ─── BACKEND SERVER SPAWN ────────────────────────────────────────────────────────

function spawnBackendServer() {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    appendStartupLog('Development mode: skipping backend spawn (use npm run dev separately).');
    return;
  }

  // In production, spawn the compiled Node server
  const serverEntryOptions = [
    path.join(app.getAppPath(), 'dist', 'server', 'server.js'),
    path.join(process.resourcesPath, 'server', 'server.js'),
    path.join(process.resourcesPath, 'server', 'server', 'server.js'),
    path.join(__dirname, 'dist', 'server', 'server.js'),
  ];

  let serverEntry = null;
  for (const candidate of serverEntryOptions) {
    if (fs.existsSync(candidate)) {
      serverEntry = candidate;
      break;
    }
  }

  if (!serverEntry) {
    appendStartupLog('WARNING: No compiled server found. API calls may fail offline. App will still function using local cache.');
    return;
  }

  try {
    backendProc = spawn(process.execPath, [serverEntry], {
      env: { 
        ...process.env, 
        ELECTRON_RUN_AS_NODE: '1', 
        NODE_ENV: 'production', 
        PORT: '3001',
        ELECTRON_RESOURCES_PATH: process.resourcesPath
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    backendProc.stdout.on('data', (data) => {
      appendStartupLog(`[Backend] ${data.toString().trim()}`);
    });

    backendProc.stderr.on('data', (data) => {
      appendCrashLog(`[Backend STDERR] ${data.toString().trim()}`);
    });

    backendProc.on('exit', (code, signal) => {
      appendStartupLog(`Backend process exited. Code: ${code}, Signal: ${signal}`);
      backendProc = null;
    });

    backendProc.on('error', (err) => {
      appendCrashLog('Backend spawn error', err);
    });

    appendStartupLog(`Backend server spawned from: ${serverEntry}`);
  } catch (err) {
    appendCrashLog('Failed to spawn backend server', err);
  }
}

// ─── SPLASH WINDOW ───────────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #0F1115 0%, #07080B 100%);
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .container {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .logo-container {
            margin-bottom: 20px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .logo {
            width: 80px;
            height: 80px;
            fill: none;
            stroke: #D2691E; /* Burnt Copper */
            stroke-width: 8;
            stroke-linecap: round;
            filter: drop-shadow(0 0 10px rgba(210,105,30,0.5));
            animation: pulse 2.5s infinite ease-in-out;
          }
          .logo-inner {
            stroke: #FF7F50; /* Light Coral / Peach */
            stroke-width: 6;
          }
          .title {
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 2px;
            margin: 0;
            background: linear-gradient(90deg, #FFFFFF 0%, #D2691E 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-transform: uppercase;
          }
          .tagline {
            font-size: 11px;
            font-weight: 700;
            color: #A0AEC0;
            margin-top: 6px;
            letter-spacing: 3px;
            text-transform: uppercase;
          }
          .status {
            margin-top: 35px;
            font-size: 10px;
            color: rgba(255,255,255,0.4);
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-weight: bold;
            animation: fade 1.5s infinite ease-in-out;
          }
          .loader-bar {
            width: 200px;
            height: 3px;
            background: rgba(255,255,255,0.05);
            border-radius: 2px;
            margin-top: 15px;
            position: relative;
            overflow: hidden;
          }
          .loader-bar::after {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 40%;
            background: linear-gradient(90deg, #D2691E, #FF7F50);
            border-radius: 2px;
            animation: loading 1.8s infinite ease-in-out;
          }
          @keyframes pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(210,105,30,0.5)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(210,105,30,0.8)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(210,105,30,0.5)); }
          }
          @keyframes loading {
            0% { left: -40%; }
            100% { left: 100%; }
          }
          @keyframes fade {
            0% { opacity: 0.4; }
            50% { opacity: 0.8; }
            100% { opacity: 0.4; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-container">
            <svg class="logo" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
              <path d="M 30,30 C 10,10 10,50 30,30 C 50,10 50,50 70,30 C 90,10 90,50 70,30 C 50,10 50,50 30,30" />
              <path class="logo-inner" d="M 30,30 C 10,10 10,50 30,30 C 50,10 50,50 70,30 C 90,10 90,50 70,30" />
            </svg>
          </div>
          <div class="title">PetroOps</div>
          <div class="tagline">AI-Assisted Petroleum Operations</div>
          <div class="status">Initializing Secure Workspace...</div>
          <div class="loader-bar"></div>
        </div>
      </body>
    </html>
  `;

  const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`;
  splashWindow.loadURL(dataUri);

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// ─── WINDOW CREATION ─────────────────────────────────────────────────────────────

function createWindow() {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  const winWidth = Math.min(1440, width);
  const winHeight = Math.min(900, height);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,          // allow preload to use require for path utils
      devTools: true,          // Force devTools to be active even in production
      preload: path.join(__dirname, 'preload.cjs')
    },
    title: `${APP_NAME} — Petroleum Station ERP`,
    backgroundColor: '#07090f',
    autoHideMenuBar: true,
    show: false,
    // Ensure window state is restored on relaunch
    frame: true
  });

  // Pipe all renderer process console logs into main process logs
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const lvl = levels[level] || 'LOG';
    const sourceFile = sourceId ? path.basename(sourceId) : 'unknown';
    appendStartupLog(`[Renderer ${lvl}] (${sourceFile}:${line}) ${message}`);
  });

  // Remove default menu in production
  if (process.env.NODE_ENV !== 'development') {
    Menu.setApplicationMenu(null);
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    appendStartupLog('Loading dev server at http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      const fallbackPath = path.join(app.getAppPath(), 'dist', 'index.html');
      appendStartupLog(`Dev server unavailable, falling back to: ${fallbackPath}`);
      mainWindow.loadFile(fallbackPath);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production Mode: Loader checks safe candidate folders. NEVER attempts localhost.
    const candidates = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(process.resourcesPath, 'dist', 'index.html'),
      path.join(__dirname, 'dist', 'index.html')
    ];

    let indexPath = null;
    for (const candidate of candidates) {
      appendStartupLog(`Checking production build candidate path: ${candidate}`);
      if (fs.existsSync(candidate)) {
        indexPath = candidate;
        break;
      }
    }

    if (indexPath) {
      appendStartupLog(`Loading production build: ${indexPath}`);
      mainWindow.loadFile(indexPath).catch((err) => {
        appendCrashLog(`Failed to load index.html from ${indexPath}`, err);
        mainWindow.loadURL(`data:text/html,<h1 style="font-family:monospace;color:red;">PetroOps failed to load index.html. Check logs at ${LOG_DIR}</h1>`);
      });
    } else {
      const errorMsg = `ERROR: No production build found at any candidate paths:\n` + candidates.map(c => ` - ${c}`).join('\n');
      appendCrashLog(errorMsg);
      appendStartupLog(errorMsg);
      mainWindow.loadURL(`data:text/html,<h1 style="font-family:monospace;color:red;">PetroOps failed to load. Frontend assets missing. Checked paths:<br/>${candidates.map(c => `&bull; ${c}`).join('<br/>')}</h1>`);
    }

    // Only open DevTools in production if explicitly requested via flag or environment
    const hasDebugFlag = process.argv.includes('--debug') || process.argv.includes('-d') || process.env.DEBUG === 'true';
    if (hasDebugFlag) {
      appendStartupLog('Debug flag detected, opening Developer Tools in production mode.');
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    const loadTime = Date.now() - startupTime;
    appendStartupLog(`Window ready in ${loadTime}ms`);

    if (deepLinkUrl) {
      mainWindow.webContents.send('deep-link', deepLinkUrl);
    }

    // Send desktop context to renderer on boot
    mainWindow.webContents.send('desktop-context', {
      version: APP_VERSION,
      platform: process.platform,
      arch: process.arch,
      dataDir: app.getPath('userData'),
      backupDir: BACKUP_DIR,
      logDir: LOG_DIR,
      dbDir: DB_DIR,
      isElectron: true
    });
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    appendCrashLog(`Renderer failed to load: ${code} — ${desc}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appendCrashLog(`Renderer process gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigating away from the app (e.g. external links crash app)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// ─── APP LIFECYCLE ───────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  appendStartupLog(`PetroOps v${APP_VERSION} starting on ${process.platform} ${os.release()}`);
  createSplashWindow();
  spawnBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  appendStartupLog('App shutting down. Cleaning up backend...');
  if (backendProc && !backendProc.killed) {
    backendProc.kill('SIGTERM');
  }
});

// ─── IPC: SYSTEM INFORMATION ─────────────────────────────────────────────────────

ipcMain.handle('system:info', () => ({
  version: APP_VERSION,
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
  totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
  freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
  cpuCount: os.cpus().length,
  hostname: os.hostname(),
  dataDir: app.getPath('userData'),
  backupDir: BACKUP_DIR,
  logDir: LOG_DIR,
  dbDir: DB_DIR,
  uptime: Math.round((Date.now() - startupTime) / 1000)
}));

// ─── IPC: FILE SYSTEM — SAFE READ/WRITE WITHIN userData ─────────────────────────

function assertSafeUserDataPath(targetPath) {
  const userData = app.getPath('userData');
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(userData)) {
    throw new Error(`Security violation: path "${targetPath}" is outside userData sandbox.`);
  }
  return resolved;
}

ipcMain.handle('fs:read', (_event, relativePath) => {
  const fullPath = assertSafeUserDataPath(path.join(app.getPath('userData'), relativePath));
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
});

ipcMain.handle('fs:write', (_event, relativePath, content) => {
  const fullPath = assertSafeUserDataPath(path.join(app.getPath('userData'), relativePath));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return { success: true, path: fullPath };
});

ipcMain.handle('fs:delete', (_event, relativePath) => {
  const fullPath = assertSafeUserDataPath(path.join(app.getPath('userData'), relativePath));
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  return { success: true };
});

ipcMain.handle('fs:list', (_event, relativeDir) => {
  const fullPath = assertSafeUserDataPath(path.join(app.getPath('userData'), relativeDir));
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath).map(name => {
    const filePath = path.join(fullPath, name);
    const stat = fs.statSync(filePath);
    return { name, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString(), isDir: stat.isDirectory() };
  });
});

// ─── IPC: BACKUP EXPORT / IMPORT ─────────────────────────────────────────────────

ipcMain.handle('backup:save-dialog', async (_event, defaultFilename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PetroOps Backup',
    defaultPath: path.join(os.homedir(), defaultFilename || `petroops_backup_${Date.now()}.pobk`),
    filters: [{ name: 'PetroOps Backup', extensions: ['pobk', 'pabk', 'json'] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('backup:write-external', (_event, externalPath, content) => {
  // No sandbox check — user explicitly chose this location via dialog
  try {
    fs.writeFileSync(externalPath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    appendCrashLog('backup:write-external failed', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore PetroOps Backup',
    filters: [{ name: 'PetroOps Backup', extensions: ['pobk', 'pabk', 'json'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const content = fs.readFileSync(result.filePaths[0], 'utf-8');
  return { path: result.filePaths[0], content };
});

ipcMain.handle('backup:list-auto', () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.pobk') || f.endsWith('.pabk') || f.endsWith('.json'))
    .map(name => {
      const filePath = path.join(BACKUP_DIR, name);
      const stat = fs.statSync(filePath);
      return { name, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString(), path: filePath };
    })
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
});

ipcMain.handle('backup:write-auto', (_event, filename, content) => {
  try {
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');

    // Purge backups older than 30 days (keep at most 90 files)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.pobk') || f.endsWith('.pabk') || f.endsWith('.json'))
      .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);

    const thirtyDaysMs = 30 * 24 * 3600 * 1000;
    files.slice(90).forEach(({ f }) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    files.forEach(({ f, t }) => {
      if (Date.now() - t > thirtyDaysMs) {
        try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (_) { }
      }
    });

    return { success: true, path: filePath };
  } catch (err) {
    appendCrashLog('backup:write-auto failed', err);
    return { success: false, error: err.message };
  }
});

// ─── IPC: CRASH LOGS ─────────────────────────────────────────────────────────────

ipcMain.handle('logs:get-crash', () => {
  if (!fs.existsSync(CRASH_LOG_FILE)) return '';
  const raw = fs.readFileSync(CRASH_LOG_FILE, 'utf-8');
  // Return last 500 lines
  const lines = raw.split('\n');
  return lines.slice(-500).join('\n');
});

ipcMain.handle('logs:get-startup', () => {
  if (!fs.existsSync(STARTUP_LOG_FILE)) return '';
  const raw = fs.readFileSync(STARTUP_LOG_FILE, 'utf-8');
  const lines = raw.split('\n');
  return lines.slice(-500).join('\n');
});

ipcMain.handle('logs:clear', () => {
  try {
    fs.writeFileSync(CRASH_LOG_FILE, '', 'utf-8');
    fs.writeFileSync(STARTUP_LOG_FILE, '', 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('logs:renderer-error', (_event, { message, stack, context }) => {
  appendCrashLog(`[RENDERER] ${context || ''}: ${message}`, { stack, message });
});

// ─── IPC: NATIVE PRINT (THERMAL + A4) ────────────────────────────────────────────

ipcMain.on('trigger-native-print', (event, { htmlContent, options = {} }) => {
  appendStartupLog(`Native print triggered. thermalMode=${options.thermalMode || false}, silent=${options.silent || false}`);

  let workerWindow = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  // Use base64 data URI to avoid filesystem boundary issues
  const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  workerWindow.loadURL(dataUri);

  workerWindow.webContents.once('did-finish-load', () => {
    const printOptions = {
      silent: options.silent !== false,   // silent by default for thermal
      printBackground: true,
      deviceName: options.deviceName || '',
      margins: { marginType: options.thermalMode ? 'none' : 'default' }
    };

    if (options.thermalMode) {
      // 58mm or 80mm thermal paper
      const mmWidth = options.thermalWidth === 58 ? 58000 : 80000;
      printOptions.pageSize = { width: mmWidth, height: 297000 };
    } else {
      printOptions.pageSize = 'A4';
    }

    workerWindow.webContents.print(printOptions, (success, failureReason) => {
      if (!success) {
        appendCrashLog(`Print failed: ${failureReason}`);
        event.reply('print-reply', { success: false, error: failureReason });
      } else {
        event.reply('print-reply', { success: true });
      }
      if (workerWindow && !workerWindow.isDestroyed()) {
        workerWindow.close();
      }
      workerWindow = null;
    });
  });
});

// ─── IPC: PDF EXPORT TO FILE ──────────────────────────────────────────────────────

ipcMain.handle('pdf:export', async (_event, { htmlContent, defaultFilename }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF Report',
    defaultPath: path.join(os.homedir(), defaultFilename || `petroops_report_${Date.now()}.pdf`),
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  });

  if (result.canceled) return { success: false, canceled: true };

  let workerWindow = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  await workerWindow.loadURL(dataUri);

  try {
    const pdfBuffer = await workerWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });
    fs.writeFileSync(result.filePath, pdfBuffer);
    workerWindow.close();
    workerWindow = null;
    appendStartupLog(`PDF exported to: ${result.filePath}`);
    return { success: true, path: result.filePath };
  } catch (err) {
    appendCrashLog('PDF export failed', err);
    if (workerWindow && !workerWindow.isDestroyed()) workerWindow.close();
    return { success: false, error: err.message };
  }
});

// ─── IPC: OPEN FILE/FOLDER IN EXPLORER ───────────────────────────────────────────

ipcMain.handle('shell:open-path', (_event, targetPath) => {
  shell.openPath(targetPath);
  return { success: true };
});

ipcMain.handle('shell:show-item', (_event, targetPath) => {
  shell.showItemInFolder(targetPath);
  return { success: true };
});

// ─── IPC: AUTO-UPDATER ────────────────────────────────────────────────────────────

ipcMain.on('check-for-updates', (event) => {
  appendStartupLog('Update check requested.');

  // In production this integrates with electron-updater.
  // For now: check for a version file at a known endpoint or local path.
  const updateCheckFile = path.join(app.getPath('userData'), 'pending_update.json');

  if (fs.existsSync(updateCheckFile)) {
    try {
      const updateInfo = JSON.parse(fs.readFileSync(updateCheckFile, 'utf-8'));
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
    } catch (err) {
      appendCrashLog('Failed to read pending update file', err);
    }
  } else {
    // No update available
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', { currentVersion: APP_VERSION });
    }
  }
});

ipcMain.handle('update:apply', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Apply Update',
    message: 'Restart PetroOps to apply the downloaded update?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0
  });
  if (result.response === 0) {
    app.relaunch();
    app.exit(0);
  }
  return { willRestart: result.response === 0 };
});

ipcMain.handle('update:rollback', () => {
  const rollbackFile = path.join(app.getPath('userData'), 'rollback_version.txt');
  if (fs.existsSync(rollbackFile)) {
    const version = fs.readFileSync(rollbackFile, 'utf-8').trim();
    appendStartupLog(`Rollback requested to v${version}`);
    return { success: true, rolledBackTo: version };
  }
  return { success: false, error: 'No rollback version recorded.' };
});

// ─── IPC: HARDWARE STATUS ─────────────────────────────────────────────────────────

ipcMain.handle('hardware:status', () => {
  // Returns a snapshot of machine vitals for the Hardware HUD
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100);

  let diskFreeGB = null;
  try {
    if (process.platform === 'win32') {
      const lines = execSync('wmic logicaldisk get freespace,size /format:csv').toString().split('\n');
      const dataLine = lines.find(l => l.trim() && !l.includes('FreeSpace'));
      if (dataLine) {
        const parts = dataLine.trim().split(',');
        diskFreeGB = Math.round(parseInt(parts[1] || '0') / (1024 ** 3));
      }
    } else {
      const dfOut = execSync(`df -k "${app.getPath('userData')}"`).toString().split('\n')[1];
      if (dfOut) {
        const parts = dfOut.trim().split(/\s+/);
        diskFreeGB = Math.round(parseInt(parts[3] || '0') / (1024));  // KB to MB
      }
    }
  } catch (_) { }

  return {
    platform: process.platform,
    arch: process.arch,
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(1),
    freeMemGB: (freeMem / 1024 / 1024 / 1024).toFixed(1),
    usedMemPct,
    diskFreeGB,
    backendRunning: backendProc !== null && !backendProc.killed,
    uptime: Math.round((Date.now() - startupTime) / 1000)
  };
});

// ─── IPC: RELAUNCH / QUIT ────────────────────────────────────────────────────────

ipcMain.handle('app:relaunch', () => {
  appendStartupLog('Relaunch requested from renderer.');
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('app:quit', () => {
  appendStartupLog('Quit requested from renderer.');
  app.quit();
});

appendStartupLog(`electron.cjs loaded. Electron ${process.versions.electron}, Node ${process.versions.node}`);
