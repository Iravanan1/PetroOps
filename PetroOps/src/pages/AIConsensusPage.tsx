import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AIConsensusPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1f212d] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            PUMP_AI // OCR_MULTI_MODEL_CONSENSUS_HUB
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Multi-model engine agreement rates, digit confusion biases, and vote outcomes.</p>
        </div>
        <button 
          onClick={() => navigate('/ai-review')}
          className="text-xs text-sky-400 hover:text-white font-mono bg-[#1c1d27] border border-[#2b2d3c] px-4 py-2 rounded transition"
        >
          OPEN WORKSTATION
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#14151f] border border-[#232637] rounded p-4">
          <h3 className="text-xs font-mono font-bold text-gray-300 uppercase mb-3 border-b border-[#232637] pb-2">
            ACTIVE OCR CONSENSUS MATRIX
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#232637] text-gray-500 text-left">
                  <th className="pb-2">FIELD</th>
                  <th className="pb-2">PADDLEOCR</th>
                  <th className="pb-2">EASYOCR</th>
                  <th className="pb-2">QWEN LOCAL</th>
                  <th className="pb-2">CLAUDE CLOUD</th>
                  <th className="pb-2">OUTCOME</th>
                  <th className="pb-2 text-right">STABILITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202d]">
                <tr className="hover:bg-[#1a1c29]/50 transition">
                  <td className="py-3 text-white font-bold">openingCash</td>
                  <td className="py-3 text-gray-400">12,500</td>
                  <td className="py-3 text-gray-400">12,500</td>
                  <td className="py-3 text-gray-400">12,500</td>
                  <td className="py-3 text-gray-400">12,500</td>
                  <td className="py-3 text-emerald-400 font-bold">12,500</td>
                  <td className="py-3 text-emerald-400 text-right font-bold">98%</td>
                </tr>
                <tr className="hover:bg-[#1a1c29]/50 transition">
                  <td className="py-3 text-white font-bold">actualCash</td>
                  <td className="py-3 text-red-400 font-bold">48,500</td>
                  <td className="py-3 text-gray-400">48,900</td>
                  <td className="py-3 text-gray-400">48,900</td>
                  <td className="py-3 text-gray-400">48,900</td>
                  <td className="py-3 text-amber-500 font-bold">48,900</td>
                  <td className="py-3 text-amber-500 text-right font-bold">75%</td>
                </tr>
                <tr className="hover:bg-[#1a1c29]/50 transition">
                  <td className="py-3 text-white font-bold">measuredDensity</td>
                  <td className="py-3 text-gray-400">745.2</td>
                  <td className="py-3 text-red-400 font-bold">746.0</td>
                  <td className="py-3 text-gray-400">745.2</td>
                  <td className="py-3 text-gray-400">745.2</td>
                  <td className="py-3 text-amber-500 font-bold">745.2</td>
                  <td className="py-3 text-amber-500 text-right font-bold">82%</td>
                </tr>
                <tr className="hover:bg-[#1a1c29]/50 transition">
                  <td className="py-3 text-white font-bold">closingMeter Nozzle-1</td>
                  <td className="py-3 text-gray-400">12,790.8</td>
                  <td className="py-3 text-gray-400">12,790.8</td>
                  <td className="py-3 text-gray-400">12,790.8</td>
                  <td className="py-3 text-gray-400">12,790.8</td>
                  <td className="py-3 text-emerald-400 font-bold">12,790.80</td>
                  <td className="py-3 text-emerald-400 text-right font-bold">98%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#14151f] border border-[#232637] rounded p-4 font-mono text-xs leading-relaxed space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-300 uppercase mb-2 border-b border-[#232637] pb-1">
              DIGITS CONFUSION FREQUENCY
            </h3>
            <p className="text-gray-400">Tracks how frequently characters are confused by regional layout noise (like grease stains on sheets):</p>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-gray-400">
                <span>Digit confusion (8 vs 0)</span>
                <span className="text-amber-400">4 occurrences</span>
              </div>
              <div className="w-full bg-[#1c1d27] h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-amber-500 h-full w-[65%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-400">
                <span>Character confusion (5 vs S)</span>
                <span className="text-amber-400">2 occurrences</span>
              </div>
              <div className="w-full bg-[#1c1d27] h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-amber-500 h-full w-[35%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
