import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AIObservabilityHUD() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1f212d] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            PUMP_AI // OPERATIONS_TELEMETRY_HUD
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Observer console tracking system queues, physical wetstock leaks, and local GPU cache levels.</p>
        </div>
        <button 
          onClick={() => navigate('/ai-integrity')}
          className="text-xs text-sky-400 hover:text-white font-mono bg-[#1c1d27] border border-[#2b2d3c] px-4 py-2 rounded transition"
        >
          NERVE CENTER →
        </button>
      </div>

      <div className="bg-[#14151f] border border-[#232637] rounded p-6 font-mono text-xs text-gray-400 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase border-b border-[#232637] pb-2">
          SYSTEM HEALTH & TELEMETRY FEED
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0b0c10] p-4 rounded border border-[#1c1d27] space-y-2">
            <div className="text-[10px] text-gray-500 uppercase">Local GPU Inference Core</div>
            <div className="text-sm text-emerald-400 font-bold">ONLINE & STABLE</div>
            <div className="text-[10px] text-gray-500">VRAM Allocation: 4.8 GB / 8.0 GB</div>
          </div>
          
          <div className="bg-[#0b0c10] p-4 rounded border border-[#1c1d27] space-y-2">
            <div className="text-[10px] text-gray-500 uppercase">Firestore Offline Sync Sync-Buffer</div>
            <div className="text-sm text-emerald-400 font-bold">ALL TRANSACTIONS SYNCED</div>
            <div className="text-[10px] text-gray-500">Buffer queue: 0 pending</div>
          </div>
        </div>

        <pre className="p-4 bg-[#07080a] border border-[#1c1d27] rounded text-gray-300 overflow-x-auto">
{`[INFO] [2026-05-19 12:20:00] Initializing local consensus polling loop...
[SUCCESS] [2026-05-19 12:20:01] 2 nozzle meters matched carry-forwards perfectly.
[SUCCESS] [2026-05-19 12:20:02] Event loop replay checksum verified: snap_chk_branch-guj-01_1716104200.
[INFO] [2026-05-19 12:20:03] Sandbox workstation ready for human approval.`}
        </pre>
      </div>
    </div>
  );
}
