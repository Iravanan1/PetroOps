import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  getCrashLog: () => ipcRenderer.invoke('logs:get-crash'),
  getStartupLog: () => ipcRenderer.invoke('logs:get-startup')
});
