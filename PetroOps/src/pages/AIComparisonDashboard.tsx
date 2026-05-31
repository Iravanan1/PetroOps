import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AIComparisonDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1f212d] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            PUMP_AI // OCR_MODEL_COMPARISON_MATRIX
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Accuracy curves, recognition speed, and parameter sizes compared between model backends.</p>
        </div>
        <button 
          onClick={() => navigate('/ai-consensus')}
          className="text-xs text-sky-400 hover:text-white font-mono bg-[#1c1d27] border border-[#2b2d3c] px-4 py-2 rounded transition"
        >
          CONSENSUS MAP →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
        <div className="bg-[#14151f] border border-[#232637] rounded p-4">
          <h3 className="text-gray-400 uppercase font-bold">PaddleOCR (Local)</h3>
          <div className="text-xl font-bold text-white mt-2">92.4% Accuracy</div>
          <div className="text-emerald-400 mt-1">Speed: ~400ms</div>
          <div className="text-gray-500 mt-2">Best for: Clean nozzle grids</div>
        </div>

        <div className="bg-[#14151f] border border-[#232637] rounded p-4">
          <h3 className="text-gray-400 uppercase font-bold">EasyOCR (Local)</h3>
          <div className="text-xl font-bold text-white mt-2">89.1% Accuracy</div>
          <div className="text-emerald-400 mt-1">Speed: ~550ms</div>
          <div className="text-gray-500 mt-2">Best for: Payment receipts</div>
        </div>

        <div className="bg-[#14151f] border border-[#232637] rounded p-4">
          <h3 className="text-gray-400 uppercase font-bold">Qwen2.5-7B (Local)</h3>
          <div className="text-xl font-bold text-white mt-2">94.8% Accuracy</div>
          <div className="text-amber-500 mt-1">Speed: ~750ms</div>
          <div className="text-gray-500 mt-2">Best for: Handwritten blocks</div>
        </div>

        <div className="bg-[#14151f] border border-[#232637] rounded p-4">
          <h3 className="text-gray-400 uppercase font-bold">Claude 3.5 Sonnet (Cloud)</h3>
          <div className="text-xl font-bold text-emerald-400 mt-2">99.1% Accuracy</div>
          <div className="text-red-400 mt-1">Speed: ~1800ms</div>
          <div className="text-gray-500 mt-2">Best for: Complex reconciliations</div>
        </div>
      </div>
    </div>
  );
}
