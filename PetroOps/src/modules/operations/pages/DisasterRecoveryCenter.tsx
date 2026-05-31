import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, CheckCircle, ShieldAlert, 
  HelpCircle, ChevronRight, Play, Download, Settings
} from 'lucide-react';
import { NetworkBackupManager, BackupSnapshot } from '../NetworkBackupManager';

export default function DisasterRecoveryCenter() {
  const [selectedMonth] = useState<string>('2026-05');
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [selectedSnapId, setSelectedSnapId] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState('');
  
  // Dry run state
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{ passed: boolean; error?: string } | null>(null);

  useEffect(() => {
    setBackups(NetworkBackupManager.getBackupCatalog(selectedMonth));
  }, [selectedMonth]);

  const handleDryRunRestore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSnapId || !expectedTotal) return;

    const snap = backups.find(b => b.snapshotId === selectedSnapId);
    if (!snap) return;

    setDryRunLoading(true);
    setDryRunResult(null);

    setTimeout(() => {
      // Validate checksum balancing on recovery
      const res = NetworkBackupManager.verifyRestoreIntegrity(snap, Number(expectedTotal));
      setDryRunResult(res);
      setDryRunLoading(false);
    }, 1500);
  };

  const selectedSnap = backups.find(b => b.snapshotId === selectedSnapId);

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Recovery workspace grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Backups Catalog */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Backups Snapshot Catalog</h4>
          
          <div className="space-y-3">
            {backups.map(snap => (
              <div 
                key={snap.snapshotId}
                onClick={() => { setSelectedSnapId(snap.snapshotId); setDryRunResult(null); }}
                className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                  selectedSnapId === snap.snapshotId
                    ? 'border-[#D35400] bg-amber-50/20'
                    : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-black text-[#1A1A1A]">{snap.snapshotId}</h5>
                    <span className="text-[9px] font-mono text-[#666666] block mt-0.5">Station: {snap.stationId.replace(/-/g, ' ')}</span>
                  </div>

                  <span className="text-[9px] font-mono font-bold text-[#666666]">{snap.recordsCount} lines</span>
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#EBEBEA] text-[9px] font-bold text-[#666666]">
                  <span>Logged: {snap.timestamp}</span>
                  <span className="text-emerald-700 uppercase">Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Backup dry run restore workbench */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSnap ? (
            <div className="border border-[#EBEBEA] rounded-2xl p-6 bg-white space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-[#EBEBEA]">
                <div>
                  <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-tight">Recovery Workbench: {selectedSnap.snapshotId}</h4>
                  <p className="text-[9px] text-[#666666] font-mono mt-0.5">Origin Branch: {selectedSnap.stationId.replace(/-/g, ' ')}</p>
                </div>

                <span className="text-[9px] font-mono font-extrabold text-[#D35400]">Encryption WAL ready</span>
              </div>

              {/* Form parameters check */}
              <form onSubmit={handleDryRunRestore} className="space-y-4 text-xs font-bold text-[#1A1A1A]">
                <div className="space-y-1.5">
                  <label className="text-[#666666] uppercase text-[9px] block">Expected Double-Entry Sales (INR)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 145200"
                    value={expectedTotal}
                    onChange={e => setExpectedTotal(e.target.value)}
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    required
                  />
                  <span className="text-[8px] text-[#666666] font-bold block mt-0.5">
                    This asserts a balancing checksum math test upon restore to prevent any silent ledger database anomalies.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={dryRunLoading}
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {dryRunLoading ? 'Running Dry-run checksum verification...' : 'Execute Recovery dry run restore'}
                </button>
              </form>

              {/* Results status indicator */}
              {dryRunResult && (
                <div className={`p-4 border rounded-2xl flex items-start gap-3 ${
                  dryRunResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  {dryRunResult.passed ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider block">Ledger dry-run balance Cleared</span>
                        <span className="text-[9px] block mt-0.5">
                          Cryptographic checksum passed balancing check. Database is safe to restore without replay hazards.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider block">Recovery check Failed</span>
                        <span className="text-[9px] block mt-0.5 text-rose-800 font-extrabold">
                          Error details: {dryRunResult.error}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed border-[#D9D9D6] rounded-3xl text-center text-xs font-bold text-[#999999] italic bg-white">
              Select a snapshot snapshot on the left to run disaster recovery restores
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
