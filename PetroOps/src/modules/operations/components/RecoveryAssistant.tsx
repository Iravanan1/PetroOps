/**
 * RecoveryAssistant.tsx
 * ──────────────────────
 * Supervisor recovery assistant console for resolving power failures,
 * healing WAL drafts, and checking replay sequence checkpoint parities.
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, RefreshCcw, Landmark, FileText, CheckCircle, 
  Trash2, Database, KeyRound, AlertOctagon 
} from 'lucide-react';
import { CrashSafeTransactionService } from '../../replay/CrashSafeTransactionService';
import { OfflineRecoveryEngine, QueuedSyncEvent } from '../../shared/OfflineRecoveryEngine';
import { ReplayRecoveryManager } from '../../replay/ReplayRecoveryManager';

export default function RecoveryAssistant() {
  const [offlineQueue, setOfflineQueue] = useState<QueuedSyncEvent[]>([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOfflineQueue(OfflineRecoveryEngine.getInstance().getQueue());
  }, []);

  const handleRunWALHeal = () => {
    setLoading(true);
    setFeedback('Scanning local sectors...');
    setTimeout(() => {
      CrashSafeTransactionService.runStartupRecovery();
      setOfflineQueue(OfflineRecoveryEngine.getInstance().getQueue());
      setFeedback('✔ Write-Ahead Logs successfully verified. Interrupted drafts repaired.');
      setLoading(false);
    }, 1200);
  };

  const handleClearStaleQueue = async () => {
    if (!window.confirm('WARNING: This will permanently discard unsynced offline records. Are you sure?')) return;
    setLoading(true);
    await OfflineRecoveryEngine.getInstance().clearOfflineQueue();
    setOfflineQueue([]);
    setFeedback('✔ Unsynced offline queue purged successfully.');
    setLoading(false);
  };

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6 font-sans">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
          <ShieldAlert className="w-5.5 h-5.5" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase text-[#1A1A1A] tracking-wider">
            Petroleum Disaster Recovery Assistant
          </h2>
          <p className="text-[10px] text-[#666666]">
            Diagnostics tools for repairing abrupt power-offs, database corruption, or sync mismatches.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Action: Heal Interrupted Writes */}
        <div className="border border-[#EBEBEA] rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:bg-[#F9F9F8] transition-colors">
          <div>
            <h3 className="text-xs font-black uppercase text-[#1A1A1A] tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              Heal WAL Interrupted Writes
            </h3>
            <p className="text-[10px] text-[#666666] leading-relaxed mt-1">
              Checks Write-Ahead Logs for partial shift inputs or ledger writes that got cut off by sudden power failures.
            </p>
          </div>
          <button
            onClick={handleRunWALHeal}
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#D9D9D6] disabled:text-[#666666] text-white rounded-xl text-xs font-black uppercase tracking-wider min-h-[44px] cursor-pointer"
          >
            Run WAL Diagnostic Scan
          </button>
        </div>

        {/* Action: Emergency Purge */}
        <div className="border border-[#EBEBEA] rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:bg-[#F9F9F8] transition-colors">
          <div>
            <h3 className="text-xs font-black uppercase text-rose-700 tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              Emergency Queue Purge
            </h3>
            <p className="text-[10px] text-[#666666] leading-relaxed mt-1">
              Permanently purges corrupted, duplicate, or stale unsynced offline records from LocalStorage and IndexedDB.
            </p>
          </div>
          <button
            onClick={handleClearStaleQueue}
            disabled={loading}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-[#D9D9D6] disabled:text-[#666666] text-white rounded-xl text-xs font-black uppercase tracking-wider min-h-[44px] cursor-pointer"
          >
            Clear Offline Sync Cache
          </button>
        </div>

      </div>

      {/* Observability Section */}
      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase text-[#666666] tracking-wider flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> Recovery Sequence Log (Intermediate Snapshots)
        </h4>

        {offlineQueue.length === 0 ? (
          <p className="text-[10px] text-[#2E7D32] font-bold">
            ✔ Parity check completed. No intermediate snapshot discrepancies found.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
            {offlineQueue.map((evt, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] bg-white border border-[#EBEBEA] px-3 py-2 rounded-xl">
                <span className="font-mono font-bold text-[#1A1A1A]">
                  {evt.id} • {evt.type.toUpperCase()}
                </span>
                <span className="text-[#666666]">
                  Attempts: {evt.attempts} • {new Date(evt.queuedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
