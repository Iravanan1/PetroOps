/**
 * OCRBenchmarkCenter.tsx
 * High-density command desk displaying model benchmarks,
 * domain accuracy charts, and coordinate error heatmaps.
 */

import React, { useState, useEffect } from "react";
import { 
  BarChart2, ShieldAlert, Award, Grid, RefreshCw, 
  AlertCircle, Layout, ArrowRight, Zap, Target
} from "lucide-react";
import { RegisterDatasetStorageEngine, type OcrBenchmarkRecord } from "../modules/dataset/services/RegisterDatasetStorageEngine";
import { FieldAccuracyEngine, type DomainAccuracyMetrics } from "../modules/ocr/testing/FieldAccuracyEngine";

export default function OCRBenchmarkCenter() {
  const branchId = "branch_central_hq_9";
  const [benchmarks, setBenchmarks] = useState<OcrBenchmarkRecord[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<OcrBenchmarkRecord | null>(null);
  const [domainMetrics, setDomainMetrics] = useState<DomainAccuracyMetrics>({
    nozzleAccuracy: 98.4,
    cashAccuracy: 97.2,
    upiAccuracy: 99.1,
    creditAccuracy: 95.8,
    wetstockAccuracy: 96.5,
    expenseAccuracy: 94.0
  });

  // Heatmap interactive settings
  const [activeCell, setActiveCell] = useState<{ x: number; y: number } | null>(null);

  // Simulated coordinate error frequency counts (X: 0-7, Y: 0-7)
  const [errorGrid] = useState<number[][]>([
    [12, 5, 8, 4, 3, 2, 7, 10],
    [6, 18, 9, 3, 2, 4, 15, 8],
    [5, 8, 25, 4, 6, 2, 12, 9],
    [2, 3, 5, 34, 12, 8, 5, 4],
    [8, 12, 14, 5, 40, 22, 6, 3],
    [15, 20, 8, 9, 18, 52, 12, 9],
    [10, 8, 6, 14, 15, 24, 65, 18],
    [7, 9, 12, 8, 4, 10, 22, 78] // bottom coordinates represents low-light signature blocks with highest error rates!
  ]);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      const logs = await RegisterDatasetStorageEngine.getBenchmarks(branchId);
      setBenchmarks(logs.reverse());
      if (logs.length > 0) {
        setSelectedBenchmark(logs[0]);
        // Simulate domain checks from mock records
        setDomainMetrics({
          nozzleAccuracy: logs[0].hybridConsensusAccuracy,
          cashAccuracy: Number((logs[0].hybridConsensusAccuracy * 0.98).toFixed(1)),
          upiAccuracy: 99.2,
          creditAccuracy: 96.4,
          wetstockAccuracy: 97.1,
          expenseAccuracy: 95.0
        });
      }
    } catch (err) {
      console.error("Failed to load benchmark archives", err);
    }
  };

  const getHeatmapColor = (frequency: number) => {
    // Returns increasingly dense orange/red gradient based on failure occurrences
    if (frequency > 60) return "bg-rose-600/80 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.4)]";
    if (frequency > 30) return "bg-amber-600/60 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    if (frequency > 15) return "bg-yellow-600/40 border-yellow-500/30";
    if (frequency > 5) return "bg-blue-600/20 border-blue-500/20";
    return "bg-slate-900/40 border-slate-800/40";
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent uppercase">
                OCR Benchmark Center
              </h1>
              <p className="text-xs text-slate-400 tracking-wider">CROSS-ENGINE ACCURACY LEADERBOARDS & COORDINATE ERROR HEATMAPS</p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadBenchmarks}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Quality Scorecards */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Comparison Scorecard Grid */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 animate-bounce" />
                OCR Engine Accuracy Scorecard
              </h3>
              {selectedBenchmark && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                  Active Log: {selectedBenchmark.fileName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1">PaddleOCR</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {selectedBenchmark ? `${selectedBenchmark.paddleAccuracy}%` : "94.2%"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1">EasyOCR</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {selectedBenchmark ? `${selectedBenchmark.easyOcrAccuracy}%` : "88.5%"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1">Qwen2.5 VLM</span>
                <span className="text-xl font-bold font-mono text-blue-400">
                  {selectedBenchmark ? `${selectedBenchmark.qwenAccuracy}%` : "96.8%"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1">Claude 3.5</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {selectedBenchmark ? `${selectedBenchmark.claudeAccuracy}%` : "98.4%"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <span className="text-[9px] text-indigo-400 font-bold tracking-wider uppercase mb-1">Hybrid Consensus</span>
                <span className="text-xl font-extrabold font-mono text-indigo-300">
                  {selectedBenchmark ? `${selectedBenchmark.hybridConsensusAccuracy}%` : "99.1%"}
                </span>
              </div>

            </div>
          </div>

          {/* Domain Breakdown Metrics */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Category Accuracy Distribution
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Nozzle Meter Readings</span>
                  <span className="text-emerald-400 font-bold font-mono">{domainMetrics.nozzleAccuracy}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${domainMetrics.nozzleAccuracy}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Settlements & UPI collections</span>
                  <span className="text-emerald-400 font-bold font-mono">{domainMetrics.upiAccuracy}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${domainMetrics.upiAccuracy}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Cash-in-till Balances</span>
                  <span className="text-blue-400 font-bold font-mono">{domainMetrics.cashAccuracy}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${domainMetrics.cashAccuracy}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Wetstock Tank Dips</span>
                  <span className="text-blue-400 font-bold font-mono">{domainMetrics.wetstockAccuracy}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${domainMetrics.wetstockAccuracy}%` }}></div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Side: Coordinate Error Heatmap grid */}
        <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Grid className="w-4 h-4 text-emerald-400 animate-pulse" />
              Register Coordinate Heatmap
            </h3>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal uppercase">
            PLOTS REGION-SPECIFIC EXTRACTION FAILURE DENSITIES (GRID LAYOUT: 8X8). BOTTOM AREAS COMMONLY ENCOUNTER NIGHT GLARS OR DEFOCUS BLUR ON MANAGER TABLET CAMERAS.
          </p>

          {/* Grid Render */}
          <div className="grid grid-cols-8 gap-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-900 aspect-square">
            {errorGrid.map((row, y) => 
              row.map((cellValue, x) => (
                <button
                  key={`${x}-${y}`}
                  onMouseEnter={() => setActiveCell({ x, y })}
                  onMouseLeave={() => setActiveCell(null)}
                  className={`aspect-square rounded border transition-all cursor-pointer ${getHeatmapColor(cellValue)}`}
                />
              ))
            )}
          </div>

          {/* Hover diagnostic display */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 min-h-[85px] mt-auto flex items-center justify-between">
            {activeCell ? (
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">Coordinate Bounds:</div>
                <div className="text-xs font-bold text-slate-200 mt-1">X: {activeCell.x * 32}px - Y: {activeCell.y * 75}px</div>
                <div className="text-[10px] text-amber-400 mt-1 font-mono">Error Frequency Rate: {errorGrid[activeCell.y][activeCell.x]} events/1000 scans</div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                Hover over grid blocks to inspect localized camera anomaly ratios.
              </div>
            )}
            <Zap className={`w-6 h-6 ${activeCell ? "text-indigo-400 animate-pulse" : "text-slate-700"}`} />
          </div>

        </div>
      </div>
    </div>
  );
}
