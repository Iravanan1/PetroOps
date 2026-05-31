import React from 'react';
import { Sparkles, Clock, UserCheck } from 'lucide-react';
import { AuditHistoryEntry } from '../hooks/useReconciledShifts';

interface AuditHistoryViewerProps {
  history?: AuditHistoryEntry[];
}

export function AuditHistoryViewer({ history = [] }: AuditHistoryViewerProps) {
  if (history.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        No modifications registered. This shift is reconciled directly from first-pass AI extraction.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" /> Reconciled Modifications Audit Log
      </h4>
      <div className="flex flex-col gap-3">
        {history.map((entry, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-850 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" /> {entry.editor}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" /> {entry.timestamp}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-2 mt-1">
              <span className="font-bold text-slate-500 uppercase">Snapshot Overrides:</span>
              <pre className="mt-1 bg-slate-950/60 p-2 rounded-lg border border-slate-900 overflow-x-auto text-slate-400 leading-normal">
                {JSON.stringify(entry.previousValues, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
