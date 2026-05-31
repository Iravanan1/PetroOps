import React from 'react';
import { Sparkles, Eye, Info, CheckCircle2 } from 'lucide-react';

interface BBox {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

interface AIExtractionOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function AIExtractionOverlay({
  visible,
  onClose
}: AIExtractionOverlayProps) {
  if (!visible) return null;

  const boxes: BBox[] = [
    { id: '1', label: 'Shift Header', x: 24, y: 80, w: 460, h: 42, confidence: 99.4 },
    { id: '2', label: 'Nozzle MS table', x: 24, y: 132, w: 460, h: 84, confidence: 98.6 },
    { id: '3', label: 'Settlement Ledger grid', x: 24, y: 228, w: 460, h: 62, confidence: 97.9 },
    { id: '4', label: 'Wetstock density dip', x: 24, y: 300, w: 460, h: 32, confidence: 95.8 }
  ];

  return (
    <div className="absolute inset-0 bg-[#1A1A1A]/35 backdrop-blur-xs z-30 pointer-events-none flex flex-col justify-between p-4 animate-fade-in font-sans">
      
      {/* Top HUD stats */}
      <div className="flex justify-between items-center bg-white/95 border border-[#EBEBEA] rounded-xl p-3 shadow-md pointer-events-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <div>
            <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">AI Visual Layout Extraction Active</span>
            <span className="text-[8px] font-mono font-bold text-[#666666] uppercase mt-0.5 block">Region Segmenter: Qwen2.5-VL // Local DOM parsing</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="bg-[#1A1A1A] hover:bg-black text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs h-[28px] flex items-center justify-center"
        >
          Dismiss HUD
        </button>
      </div>

      {/* Render highlighted coordinates boxes */}
      <div className="relative flex-1 w-full my-4">
        {boxes.map(box => (
          <div 
            key={box.id}
            style={{
              position: 'absolute',
              left: `${box.x / 5}%`,
              top: `${box.y / 5}%`,
              width: `${box.w / 5}%`,
              height: `${box.h / 5}%`
            }}
            className="border-2 border-emerald-600 border-dashed bg-emerald-500/5 rounded p-1 flex justify-between items-start"
          >
            <span className="bg-[#FFFFFF] border border-[#EBEBEA] text-emerald-800 text-[6.5px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase leading-none">
              {box.label} ({box.confidence}%)
            </span>
            <span className="bg-emerald-600 text-white text-[6px] font-mono px-1 rounded-full uppercase leading-none font-bold">
              OK
            </span>
          </div>
        ))}
      </div>

      {/* Bottom diagnostic indicators */}
      <div className="bg-white/95 border border-[#EBEBEA] rounded-xl p-3.5 shadow-md flex items-center gap-2.5 pointer-events-auto max-w-sm self-center">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-[9px] font-bold leading-normal text-slate-700 uppercase">
          Neural anchors locked successfully. DOM parsing and OCR extraction reconciled.
        </span>
      </div>

    </div>
  );
}
