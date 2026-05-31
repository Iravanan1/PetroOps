import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClaudeAIService } from '../modules/ai/services/ClaudeAIService';

export default function AIIntegrityDashboard() {
  const navigate = useNavigate();
  const logs = ClaudeAIService.getCostLogs();

  const [simulatedMetrics] = useState({
    avgLatencyMs: 1420,
    totalTokens: 128450,
    totalCostUsd: 3.42,
    localCacheBypassSavings: 45.80,
    queuePressure: 2,
    workerSuccessRate: 98.4
  });

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1f212d] pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            PUMP_AI // INTEGRITY_OBSERVABILITY_NERVE_CENTER
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Real-time pipeline logs, token latency, and event-sourced ledger health.</p>
        </div>
        <button 
          onClick={() => navigate('/ai-review')}
          className="text-xs text-sky-400 hover:text-white font-mono bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded transition"
        >
          OPEN REVIEW SANDBOX →
        </button>
      </div>

      {/* Observability Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Avg VLM Latency</div>
          <div className="text-xl font-bold text-white mt-1">{simulatedMetrics.avgLatencyMs} ms</div>
          <div className="text-[9px] text-emerald-400 mt-1">▲ Qwen Local Fast (400ms)</div>
        </div>
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Tokens Consumed</div>
          <div className="text-xl font-bold text-white mt-1">{simulatedMetrics.totalTokens.toLocaleString()}</div>
          <div className="text-[9px] text-gray-500 mt-1">Input: 92K | Output: 36K</div>
        </div>
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Accumulated Costs</div>
          <div className="text-xl font-bold text-white mt-1">${simulatedMetrics.totalCostUsd.toFixed(2)}</div>
          <div className="text-[9px] text-emerald-400 mt-1">Claude 3.5 Sonnet Tier</div>
        </div>
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Local Pipeline Savings</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">${simulatedMetrics.localCacheBypassSavings.toFixed(2)}</div>
          <div className="text-[9px] text-[#94a3b8] mt-1">92.4% local-first bypass</div>
        </div>
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Queue Pressure</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{simulatedMetrics.queuePressure} shifts</div>
          <div className="text-[9px] text-gray-500 mt-1">Asynchronous background</div>
        </div>
        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono">
          <div className="text-[10px] text-gray-400 uppercase">Worker Success Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{simulatedMetrics.workerSuccessRate}%</div>
          <div className="text-[9px] text-emerald-400 mt-1">0 failures last 24h</div>
        </div>
      </div>

      {/* Latency and Error Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#14151f] border border-[#232637] rounded p-4">
          <h2 className="text-xs font-mono font-bold text-gray-300 uppercase mb-3 border-b border-[#232637] pb-2">
            MODEL LATENCY DISTRIBUTION (MS)
          </h2>
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 h-8 rounded-t flex items-center justify-center text-[10px] font-mono text-sky-400">400ms</div>
              <span className="text-[9px] font-mono text-gray-500 mt-2">PaddleOCR</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-[#10b981]/20 border border-[#10b981]/40 h-10 rounded-t flex items-center justify-center text-[10px] font-mono text-emerald-400">550ms</div>
              <span className="text-[9px] font-mono text-gray-500 mt-2">EasyOCR</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-indigo-500/20 border border-indigo-500/40 h-16 rounded-t flex items-center justify-center text-[10px] font-mono text-indigo-400">750ms</div>
              <span className="text-[9px] font-mono text-gray-500 mt-2">Qwen Local</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-amber-500/20 border border-amber-500/40 h-36 rounded-t flex items-center justify-center text-[10px] font-mono text-amber-400">1820ms</div>
              <span className="text-[9px] font-mono text-gray-500 mt-2">Claude API Proxy</span>
            </div>
          </div>
        </div>

        <div className="bg-[#14151f] border border-[#232637] rounded p-4 flex flex-col">
          <h2 className="text-xs font-mono font-bold text-gray-300 uppercase mb-3 border-b border-[#232637] pb-2">
            INTEGRITY & DOCK PROCESSING LOGS
          </h2>
          <div className="flex-1 overflow-auto max-h-48 divide-y divide-[#1e202d] text-xs font-mono text-gray-400">
            <div className="py-2.5 flex justify-between">
              <span>[12:15:30] ✔ DEDUPLICATION COMPLETED: sha256(ocrText) verified unique.</span>
              <span className="text-emerald-400">0.0ms</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span>[12:15:31] ⚙ REGION SEGMENTATION: 4 bounding boxes generated.</span>
              <span className="text-emerald-400">12ms</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span>[12:15:32] ▲ CLOUDE ROUTING: low confidence override, calling Claude Sonnet proxy.</span>
              <span className="text-amber-400">1420ms</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span>[12:15:33] ⚠️ RECONCILIATION FAILURE: short cash of ₹400 flagged. Routing to pending reviews queue.</span>
              <span className="text-red-400">AUDIT_WARN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
