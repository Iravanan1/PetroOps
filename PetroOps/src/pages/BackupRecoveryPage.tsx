import React, { useState, useEffect, useCallback } from 'react';
import { 
  HardDrive, Save, UploadCloud, RefreshCw, AlertCircle, CheckCircle2, 
  Clock, DownloadCloud, FileText, Database, ShieldCheck, Settings, ArrowRight
} from 'lucide-react';
import { LocalBackupManager, BackupEntry } from '../modules/shared/LocalBackupManager';
import { DesktopBridgeService as Desktop } from '../modules/shared/DesktopBridgeService';
import { dbHealthCheck } from '../modules/shared/LocalDatabaseEngine';
import { useAuthStore } from '../store/useAuthStore';

const fmtBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function BackupRecoveryPage() {
  const { user } = useAuthStore();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dbStatusLoading, setDbStatusLoading] = useState(true);
  const [integrityVerifyResult, setIntegrityVerifyResult] = useState<string | null>(null);
  const [integrityVerifyOk, setIntegrityVerifyOk] = useState<boolean | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setDbStatusLoading(true);
    try {
      const health = await dbHealthCheck();
      setDbHealth(health);
      const registry = LocalBackupManager.getRegistry();
      setBackups(registry);
    } catch (err) {
      console.warn('[BackupRecoveryPage] Load error:', err);
    } finally {
      setDbStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto-backup complete listener
    const unsubscribe = LocalBackupManager.onBackupComplete((entry) => {
      showToast(`Backup ${entry.backupId} completed successfully`);
      loadData();
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleManualBackup = async () => {
    setBusy('manual');
    try {
      const entry = await LocalBackupManager.runManualBackup();
      if (entry) {
        showToast('Manual backup exported successfully');
        loadData();
      } else {
        showToast('Backup operation was cancelled or failed', false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Manual backup failed', false);
    } finally {
      setBusy(null);
    }
  };

  const handleAutoBackupNow = async () => {
    setBusy('auto');
    try {
      const entry = await LocalBackupManager.runAutoBackup();
      if (entry) {
        showToast('Scheduled auto-backup executed successfully');
        loadData();
      } else {
        showToast('Auto-backup operation failed', false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Auto-backup failed', false);
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.confirm('WARNING: Restoring from a backup will overwrite your current local database entries (shifts, ledger, and daily snapshots). This cannot be undone. Do you wish to proceed?')) {
      return;
    }
    setBusy('restore');
    setIntegrityVerifyResult(null);
    setIntegrityVerifyOk(null);

    try {
      const result = await LocalBackupManager.restoreFromFile();
      if (result.success) {
        setIntegrityVerifyOk(true);
        setIntegrityVerifyResult(`Parity Checked. Restored ${result.recordsLoaded.toLocaleString('en-IN')} total ledger and shift records with verified checksum integrity.`);
        showToast(`Successfully restored ${result.recordsLoaded} records`);
        loadData();
      } else {
        setIntegrityVerifyOk(false);
        setIntegrityVerifyResult(`Integrity Failure: ${result.error || 'Restore failed'}`);
        showToast(result.error || 'Restore operation failed', false);
      }
    } catch (err: any) {
      setIntegrityVerifyOk(false);
      setIntegrityVerifyResult(`System error during restore: ${err?.message}`);
      showToast(err?.message || 'Restore failed', false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans pb-20">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold
          transition-all duration-300 animate-in fade-in slide-in-from-top-4
          ${toast.ok
            ? 'bg-[#2E7D32]/5 border-[#2E7D32]/25 text-[#2E7D32]'
            : 'bg-[#C62828]/5 border-[#C62828]/25 text-[#C62828]'}`}>
          {toast.ok ? <CheckCircle2 className="w-4.5 h-4.5 text-[#2E7D32]" /> : <AlertCircle className="w-4.5 h-4.5 text-[#C62828]" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EBEBEA] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#D35400]/10 border border-[#D35400]/20 text-[#D35400]">
                <HardDrive className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">Backup & Recovery</h1>
                <p className="text-xs text-[#666666] font-medium mt-0.5 tracking-wider uppercase">Local Database Snapshots & Parity Safeguards</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border
              ${Desktop.isElectron() 
                ? 'bg-blue-500/5 text-blue-600 border-blue-500/20' 
                : 'bg-amber-500/5 text-amber-600 border-amber-500/20'}`}>
              <Settings className="w-3.5 h-3.5" />
              {Desktop.isElectron() ? 'Electron Native Desktop' : 'Standard Web Browser'}
            </span>
          </div>
        </div>

        {/* Top Operational Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Database Status</span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-[#1A1A1A]">
                {dbStatusLoading ? 'Loading...' : (dbHealth?.healthy ? 'HEALTHY' : 'DEGRADED')}
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                {dbStatusLoading ? 'Checking IndexedDB...' : `${dbHealth?.storeNames?.length || 0} secure object stores active`}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Local Snapshots</span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-[#1A1A1A]">
                {dbStatusLoading ? 'Loading...' : (dbHealth?.shiftCount || 0)}
              </div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Completed shift sheets cached offline
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Save className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Archived Backups</span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-[#1A1A1A]">{backups.length}</div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Stored in historical backup registry
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-4.5 h-4.5 text-[#666666]" />
              <span className="text-[9px] text-[#999999] font-bold uppercase tracking-wider">Auto Retention</span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-[#1A1A1A]">30 Days</div>
              <p className="text-[10px] text-[#666666] font-medium mt-1">
                Automatic sliding scale retention
              </p>
            </div>
          </div>

        </div>

        {/* Action Triggers Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Backups Panel */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Save className="w-5 h-5 text-[#D35400]" />
                Export Ledger Backups
              </h2>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                Take snapshot backups of your IndexedDB databases. Manual backups generate standalone files with deterministic hashes, preserving full accounting parity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAutoBackupNow}
                disabled={busy !== null}
                className="flex items-center justify-center gap-2 flex-1 bg-[#F3F3F1] hover:bg-[#EBEBEA] disabled:opacity-50 text-[#1A1A1A] border border-[#D9D9D6] rounded-xl py-3 px-4 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              >
                {busy === 'auto' ? <RefreshCw className="w-4 h-4 animate-spin text-[#D35400]" /> : <Clock className="w-4 h-4 text-[#D35400]" />}
                Run Scheduled Backup
              </button>

              <button
                onClick={handleManualBackup}
                disabled={busy !== null}
                className="flex items-center justify-center gap-2 flex-1 bg-[#D35400] hover:bg-[#A04000] disabled:opacity-50 text-white rounded-xl py-3 px-4 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-xs"
              >
                {busy === 'manual' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                {Desktop.isElectron() ? 'Export to File' : 'Download Backup'}
              </button>
            </div>

            {!Desktop.isElectron() && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-[11px] text-[#666666] leading-relaxed">
                <span className="font-bold text-amber-700 block mb-0.5">⚠️ Web Browser Sandbox Mode</span>
                Scheduled background auto-backups are stored in `localStorage` under browser quota allocations. Upgrading to the PumpAI Desktop app unlocks direct local filesystem writing without memory limit restrictions.
              </div>
            )}
          </div>

          {/* Recovery Panel */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#2E7D32]" />
                Restore & Recover Database
              </h2>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                Restore structural snapshots and journal ledger logs from a backup file. Integrity check checksum validations will execute automatically before writing to local IndexedDB.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRestoreBackup}
                disabled={busy !== null}
                className="flex items-center justify-center gap-2 w-full bg-white hover:bg-[#F9F9F8] disabled:opacity-50 text-[#2E7D32] border border-[#2E7D32]/30 rounded-xl py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {busy === 'restore' ? <RefreshCw className="w-4 h-4 animate-spin text-[#2E7D32]" /> : <UploadCloud className="w-4 h-4 text-[#2E7D32]" />}
                Select & Restore Backup File
              </button>
            </div>

            {integrityVerifyResult && (
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-300
                ${integrityVerifyOk
                  ? 'bg-[#2E7D32]/5 border-[#2E7D32]/20 text-[#2E7D32]'
                  : 'bg-[#C62828]/5 border-[#C62828]/20 text-[#C62828]'}`}>
                <div className="flex items-center gap-2 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  {integrityVerifyOk ? (
                    <><ShieldCheck className="w-4.5 h-4.5" /> Database Parity Confirmed</>
                  ) : (
                    <><AlertCircle className="w-4.5 h-4.5" /> Integrity Check Failure</>
                  )}
                </div>
                {integrityVerifyResult}
              </div>
            )}
          </div>

        </div>

        {/* Backups Registry List */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl shadow-xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-[#EBEBEA] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Historical Backup Registry</h2>
              <p className="text-[10px] text-[#999999] uppercase tracking-wider mt-0.5">Showing last 20 automatic and manual checkpoints</p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 hover:bg-[#F3F3F1] border border-transparent hover:border-[#D9D9D6] rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4 text-[#666666]" />
            </button>
          </div>

          <div className="divide-y divide-[#EBEBEA] max-h-96 overflow-y-auto">
            {backups.length > 0 ? (
              backups.map((b) => (
                <div key={b.backupId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-[#F9F9F8]/50 transition">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border mt-0.5
                      ${b.type === 'manual' 
                        ? 'bg-[#D35400]/5 border-[#D35400]/15 text-[#D35400]' 
                        : 'bg-blue-500/5 border-blue-500/15 text-blue-600'}`}>
                      <HardDrive className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1A1A1A] font-mono tracking-tight">{b.backupId}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#666666]">
                        <span className="font-semibold uppercase tracking-wider text-[9px]">{b.type} backup</span>
                        <span className="text-[#B3B3B3]">•</span>
                        <span>Size: <strong className="text-[#1A1A1A]">{fmtBytes(b.sizeBytes)}</strong></span>
                        {b.checksum && (
                          <>
                            <span className="text-[#B3B3B3]">•</span>
                            <span className="font-mono text-[#999999]">SHA256: {b.checksum.slice(0, 12)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-[#1A1A1A]">
                        {new Date(b.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <span className="text-[10px] text-[#666666] font-medium tracking-wide uppercase mt-0.5 block">{b.source} client bridge</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#999999] text-xs font-medium">
                No backup records logged in registry cache. Execute an export to initialize.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
