import React, { useState } from 'react';
import { LayoutGrid, AlertTriangle, Moon, ShieldAlert, Sparkles, Sliders } from 'lucide-react';

interface GridCell {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  failureRate: number; // 0 to 100
  primaryIssue: string;
  lightingCondition: 'optimal' | 'shadow' | 'low_light';
  manualOverrides: number;
}

export default function OCRFailureAnalytics() {
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [minFailureThreshold, setMinFailureThreshold] = useState<number>(10);

  // Mock spatial dataset mapping to typical ledger cell coordinate offsets
  const gridCells: GridCell[] = [
    { id: 'cell_nozzle_open', name: 'Nozzle Opening Counters (Grid Top)', x: 10, y: 15, width: 40, height: 12, failureRate: 15, primaryIssue: 'Handwritten ink bleed', lightingCondition: 'optimal', manualOverrides: 4 },
    { id: 'cell_nozzle_close', name: 'Nozzle Closing Counters (Grid Middle)', x: 10, y: 30, width: 40, height: 12, failureRate: 48, primaryIssue: 'High glare on shiny overlay sheet', lightingCondition: 'shadow', manualOverrides: 19 },
    { id: 'cell_cash_counting', name: 'Cash Handover Attendant Ledger (Grid Bottom-Left)', x: 10, y: 55, width: 35, height: 35, failureRate: 72, primaryIssue: 'Faded pencil strokes & thumb smudges', lightingCondition: 'low_light', manualOverrides: 34 },
    { id: 'cell_upi_settlements', name: 'UPI QR Merchant Deep-Links (Grid Bottom-Right)', x: 55, y: 55, width: 35, height: 18, failureRate: 55, primaryIssue: 'QR Code scanning alignment drift', lightingCondition: 'low_light', manualOverrides: 21 },
    { id: 'cell_card_settlements', name: 'Card Swipe Settlement Slips (Grid Middle-Right)', x: 55, y: 30, width: 35, height: 18, failureRate: 28, primaryIssue: 'OCR text boundary clipping', lightingCondition: 'shadow', manualOverrides: 9 },
    { id: 'cell_manager_notes', name: 'Supervisor Handover Remarks (Grid Top-Right)', x: 55, y: 15, width: 35, height: 10, failureRate: 85, primaryIssue: 'Unstructured cursive handwriting', lightingCondition: 'low_light', manualOverrides: 47 },
  ];

  const getHeatmapColor = (rate: number) => {
    if (rate >= 75) return 'rgba(239, 68, 68, 0.4)'; // Heavy Red
    if (rate >= 50) return 'rgba(245, 158, 11, 0.4)'; // Amber Warning
    if (rate >= 25) return 'rgba(99, 102, 241, 0.4)'; // Violet Informative
    return 'rgba(16, 185, 129, 0.2)'; // Emerald Safe
  };

  const getHeatmapBorder = (rate: number) => {
    if (rate >= 75) return 'border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]';
    if (rate >= 50) return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
    if (rate >= 25) return 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.25)]';
    return 'border-emerald-500/40';
  };

  const filteredCells = gridCells.filter(cell => cell.failureRate >= minFailureThreshold);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-rose-400 via-amber-400 to-indigo-400 bg-clip-text text-transparent uppercase">
            OCR Failure Spatial Analytics
          </h1>
          <p className="text-slate-400 text-xs mt-1 tracking-wider uppercase">
            Phase 1 Spatial Coordinate Mapping & Quality Loss Heatmap Console
          </p>
        </div>

        {/* Dynamic threshold controls */}
        <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/60 p-3 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-indigo-400" /> Filter Failure Threshold:
          </div>
          <input
            type="range"
            min="0"
            max="90"
            value={minFailureThreshold}
            onChange={(e) => setMinFailureThreshold(Number(e.target.value))}
            className="w-32 accent-indigo-500 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">{minFailureThreshold}%+</span>
        </div>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Heatmap interactive canvas block */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel border border-[#1e293b]/50 rounded-3xl p-6 bg-[#0d1527]/40 relative shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
            
            <h2 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
              <LayoutGrid className="w-4 h-4 text-indigo-400" /> Live Register Coordinate Scan-Grid Overlay
            </h2>

            {/* Virtual Scan Sheet Overlay Grid */}
            <div className="relative aspect-[16/10] w-full rounded-2xl bg-slate-950/80 border border-slate-900/60 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Grid Background Mock Lines */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0 opacity-[0.03] pointer-events-none">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border border-slate-400" />
                ))}
              </div>

              {/* Dynamic Interactive Bounding Coordinates */}
              {filteredCells.map((cell) => (
                <div
                  key={cell.id}
                  onClick={() => setSelectedCell(cell)}
                  style={{
                    left: `${cell.x}%`,
                    top: `${cell.y}%`,
                    width: `${cell.width}%`,
                    height: `${cell.height}%`,
                    backgroundColor: getHeatmapColor(cell.failureRate)
                  }}
                  className={`absolute rounded-xl border cursor-pointer flex flex-col justify-center items-center p-2 text-center transition-all duration-300 group hover:scale-[1.01] ${getHeatmapBorder(cell.failureRate)} ${
                    selectedCell?.id === cell.id ? 'border-2 scale-[1.02] ring-2 ring-indigo-500/20' : ''
                  }`}
                >
                  <span className="text-[10px] md:text-xs font-bold text-slate-200 truncate max-w-full drop-shadow">
                    {cell.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] md:text-[10px] font-mono font-extrabold text-slate-100 mt-0.5 bg-slate-950/60 px-1.5 py-0.5 rounded">
                    {cell.failureRate}% Failure
                  </span>
                </div>
              ))}

              {/* Grid guide banner */}
              <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Coordinate matrix mapping: X/Y relative shifts
              </div>
            </div>
          </div>
        </div>

        {/* Selected Cell Audit Details */}
        <div className="lg:col-span-4 space-y-6">
          {selectedCell ? (
            <div className="glass-panel border border-[#1e293b]/50 rounded-3xl p-6 bg-[#0d1527]/50 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h2 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" /> Cell Diagnostic Summary
                </h2>
                <Moon className={`w-4 h-4 ${selectedCell.lightingCondition === 'low_light' ? 'text-amber-400' : 'text-slate-600'}`} />
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Selected Region</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedCell.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Failure Rate</p>
                    <p className="text-lg font-black text-rose-400 mt-0.5">{selectedCell.failureRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manual Overrides</p>
                    <p className="text-lg font-black text-amber-400 mt-0.5">{selectedCell.manualOverrides} shift overrides</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Primary Parsing Issue</p>
                  <p className="text-slate-300 font-medium mt-1 bg-slate-900/60 p-2.5 border border-slate-800/40 rounded-xl">
                    {selectedCell.primaryIssue}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl">
                  <div>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Lighting Environment</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5 capitalize">{selectedCell.lightingCondition.replace('_', ' ')}</p>
                  </div>
                  <Moon className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel border border-[#1e293b]/50 rounded-3xl p-6 bg-[#0d1527]/40 text-center py-20 text-slate-500 text-xs">
              Hover or click on any highlighted register segment region cell to output its spatial diagnostic analysis details
            </div>
          )}

          {/* Environmental Warnings */}
          <div className="glass-panel border border-[#1e293b]/50 rounded-3xl p-6 bg-[#0d1527]/40 space-y-4">
            <h3 className="text-xs font-extrabold tracking-widest uppercase text-slate-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" /> Environmental Failure Analytics
            </h3>
            
            <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
              <p>
                * **Low-Light / Night operations:** 78% of failed text extractions occur in bottom-tier cash cells due to attendant tablet shadows.
              </p>
              <p>
                * **Nozzle counter glare:** Glare triggers regular sequence anomalies requiring manual supervisor override adjustments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
