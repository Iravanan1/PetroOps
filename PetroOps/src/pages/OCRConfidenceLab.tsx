import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RotateCcw, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
  Terminal,
  Activity
} from 'lucide-react';
import { RegisterImageEnhancer } from '../modules/ocr/preprocessing/RegisterImageEnhancer';
import { RegisterLayoutDetectionEngine, SegmentedRegion } from '../modules/ocr/layout/RegisterLayoutDetectionEngine';
import { OCRReplayBenchmark, DegradationParameters, BenchmarkReport } from '../modules/ocr/testing/OCRReplayBenchmark';
import { OCRCorrectionLearningEngine } from '../modules/ocr/feedback/OCRCorrectionLearningEngine';

export const OCRConfidenceLab: React.FC = () => {
  // Degradation Controls
  const [blur, setBlur] = useState<number>(2);
  const [shadow, setShadow] = useState<number>(0.2);
  const [skew, setSkew] = useState<number>(1.5);
  const [smudge, setSmudge] = useState<number>(0.1);
  const [template, setTemplate] = useState<string>('IOCL');

  // Benchmark results state
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [regions, setRegions] = useState<SegmentedRegion[]>([]);
  const [activeRegion, setActiveRegion] = useState<SegmentedRegion | null>(null);
  const [ocrLog, setOcrLog] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Redraw canvas with degradation overlays
  useEffect(() => {
    drawSampleRegister();
  }, [blur, shadow, skew, smudge, template]);

  const drawSampleRegister = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Standard high-density grid proportions
    canvas.width = 600;
    canvas.height = 700;

    // Draw mock printed register template
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title Header
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${template} - SHIFT CLOSING REGISTER REGISTER`, 40, 45);

    ctx.fillStyle = '#6B7280';
    ctx.font = '12px monospace';
    ctx.fillText('DATE: 2026-05-21  |  SHIFT: NIGHT (B)', 40, 65);

    // Table Nozzle Readings
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 90, 520, 160);

    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(40, 90, 520, 30);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('NOZZLE ID | OPENING MTR | CLOSING MTR | TEST CONT | TOTAL SALES (L)', 50, 110);

    // Draw rows
    ctx.font = '12px monospace';
    ctx.fillStyle = '#111827';
    const rows = [
      ['MS-1 (Noz 1)', '452109.80', '452980.50', '5.00', '865.70'],
      ['MS-2 (Noz 2)', '189320.10', '190412.30', '5.00', '1087.20'],
      ['HSD-1 (Noz 3)', '890211.50', '891500.40', '0.00', '1288.90'],
    ];

    rows.forEach((row, i) => {
      const y = 145 + i * 35;
      ctx.beginPath();
      ctx.moveTo(40, y - 15);
      ctx.lineTo(560, y - 15);
      ctx.stroke();

      ctx.fillText(row[0], 50, y);
      ctx.fillText(row[1], 150, y);
      ctx.fillText(row[2], 260, y);
      ctx.fillText(row[3], 380, y);
      ctx.fillText(row[4], 470, y);
    });

    // Payments Section
    ctx.strokeRect(40, 280, 520, 140);
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(40, 280, 520, 30);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SETTLEMENT HEAD | EXPECTED VOLUME | ACTUAL RECEIVED | SHIFT DISCREPANCY', 50, 300);

    const payRows = [
      ['UPI QR Online', '₹ 1,45,200', '₹ 1,45,200', '₹ 0 (RECONCILED)'],
      ['Card POS Swipe', '₹ 89,450', '₹ 87,450', '- ₹ 2,000 (REVIEW)'],
      ['Cash collected', '₹ 45,900', '₹ 45,900', '₹ 0 (RECONCILED)'],
    ];

    ctx.font = '12px monospace';
    ctx.fillStyle = '#111827';
    payRows.forEach((row, i) => {
      const y = 335 + i * 32;
      ctx.beginPath();
      ctx.moveTo(40, y - 15);
      ctx.lineTo(560, y - 15);
      ctx.stroke();

      ctx.fillText(row[0], 50, y);
      ctx.fillText(row[1], 180, y);
      ctx.fillText(row[2], 320, y);
      ctx.fillText(row[3], 440, y);
    });

    // Wet stock tank dips section
    ctx.strokeRect(40, 450, 250, 120);
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(40, 450, 250, 25);
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('TANK PHYSICAL DIP LEVELS', 50, 467);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#111827';
    ctx.fillText('Tank 1 (MS):  5,240 L  [Dip: 142cm]', 50, 495);
    ctx.fillText('Tank 2 (HSD): 8,950 L  [Dip: 210cm]', 50, 525);

    // Expenses Section
    ctx.strokeRect(310, 450, 250, 120);
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(310, 450, 250, 25);
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('PETTY CASH EXPENSES LOG', 320, 467);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#111827';
    ctx.fillText('1. Attendant Tea:   ₹ 150', 320, 495);
    ctx.fillText('2. Generator Fuel:  ₹ 1,200', 320, 525);
    ctx.fillText('3. Pump Cleaning:   ₹ 300', 320, 550);

    // QR Codes Section
    ctx.strokeRect(40, 600, 520, 60);
    ctx.fillText('QR Settlements Log: Paytm_32890 (Reconciled)', 55, 635);

    // Apply benchmark distortion filters
    const params: DegradationParameters = {
      motionBlurRadius: blur,
      shadowOpacity: shadow,
      skewAngle: skew,
      inkSmudgeDensity: smudge,
    };
    OCRReplayBenchmark.applyDegradations(canvas, params);

    // Run layout detection using high-contrast simulation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImg = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      const enhanced = RegisterImageEnhancer.applyGrayscaleAndContrastStretching(tempImg);
      const layout = RegisterLayoutDetectionEngine.detectLayout(enhanced, template);
      setRegions(layout.regions);
    }

    // Run diagnostics
    const diag = OCRReplayBenchmark.runDiagnosticSuite(params);
    setReport(diag);
  };

  const handleTestImageEnhancement = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = RegisterImageEnhancer.enhance(canvas);
    setOcrLog(prev => [
      ...prev,
      `[Preprocessing] Enhanced register. Density: ${(result.metadata.handwrittenDensity * 100).toFixed(1)}%. Folds: ${result.metadata.foldCreases.length}`
    ]);
  };

  const handleCorrectionFeedback = (region: SegmentedRegion, correctedVal: string) => {
    OCRCorrectionLearningEngine.logCorrection(
      'register_scan_1.jpg',
      template,
      region.id,
      region.extractedText || 'OriginalOCR',
      correctedVal,
      { x: region.box.x, y: region.box.y, width: region.box.width, height: region.box.height }
    );
    setOcrLog(prev => [
      ...prev,
      `[Feedback] Captured correction for ${region.name} -> "${correctedVal}"`
    ]);
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.90) return 'border-emerald-500 bg-emerald-500/10 text-emerald-700';
    if (conf >= 0.70) return 'border-amber-500 bg-amber-500/10 text-amber-700';
    return 'border-rose-500 bg-rose-500/10 text-rose-700';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-mono">
      <header className="border-b border-slate-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm tracking-wider uppercase">
            <Activity className="h-4 w-4" />
            Phase 1 Diagnostics
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">OCR Confidence Lab</h1>
          <p className="text-slate-400 text-xs mt-1">Real-World Camera Degradations & Consolidated Consensus Inspector</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleTestImageEnhancement}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded text-xs transition duration-200"
          >
            <Cpu className="h-4 w-4" />
            Apply Enhancer Filters
          </button>
          <button 
            onClick={() => {
              setBlur(0);
              setShadow(0);
              setSkew(0);
              setSmudge(0);
              setOcrLog([]);
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded text-xs transition duration-200 border border-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Camera
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Controls & Settings */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-5">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Degradation Controls
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Motion Blur</span>
                  <span className="text-indigo-400">{blur}px</span>
                </label>
                <input 
                  type="range" min="0" max="10" step="1" 
                  value={blur} onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Shadow Obstruction</span>
                  <span className="text-indigo-400">{(shadow * 100).toFixed(0)}%</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={shadow} onChange={(e) => setShadow(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Skew Alignment</span>
                  <span className="text-indigo-400">{skew}°</span>
                </label>
                <input 
                  type="range" min="-15" max="15" step="0.5" 
                  value={skew} onChange={(e) => setSkew(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Oily Ink Smudges</span>
                  <span className="text-indigo-400">{(smudge * 100).toFixed(0)}%</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={smudge} onChange={(e) => setSmudge(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block">Template Standard</label>
                <select 
                  value={template} 
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded p-2 text-xs mt-1 outline-none focus:border-indigo-500"
                >
                  <option value="IOCL">Indian Oil Corporation (IOCL)</option>
                  <option value="HPCL">Hindustan Petroleum (HPCL)</option>
                  <option value="BPCL">Bharat Petroleum (BPCL)</option>
                  <option value="CUSTOM">Custom Private Station</option>
                </select>
              </div>
            </div>
          </div>

          {/* Core Accuracy Diagnostics */}
          <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Consensus Accuracy
            </h2>

            {report && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">PaddleOCR (Local)</span>
                  <span className="font-bold text-slate-200">{(report.paddleOcrAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">EasyOCR (Local)</span>
                  <span className="font-bold text-slate-200">{(report.easyOcrAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-slate-400">Qwen2.5 (VLM Local)</span>
                  <span className="font-bold text-sky-400">{(report.qwenVlmAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-indigo-400 font-bold">Consensus Verdict</span>
                  <span className="font-bold text-emerald-400 text-sm">{(report.consensusAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Replay Latency</span>
                  <span>{report.averageLatencyMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Register Scan */}
        <div className="xl:col-span-5 flex flex-col items-center">
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 w-full relative" ref={containerRef}>
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Interactive Register Canvas</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-indigo-400 px-2 py-0.5 rounded uppercase font-bold">Live Scan</span>
            </div>

            <div className="relative overflow-auto flex justify-center bg-slate-900 border border-slate-800 rounded">
              <canvas ref={canvasRef} className="max-w-full block" />

              {/* Layout overlays (HTML elements mapped over canvas) */}
              {regions.map((region) => {
                const isSelected = activeRegion?.id === region.id;
                return (
                  <div
                    key={region.id}
                    onClick={() => setActiveRegion(region)}
                    style={{
                      left: `${region.box.x}%`,
                      top: `${region.box.y}%`,
                      width: `${region.box.width}%`,
                      height: `${region.box.height}%`,
                    }}
                    className={`absolute cursor-pointer border-2 transition duration-150 hover:bg-indigo-500/10 flex flex-col justify-between p-1 text-[9px] font-bold ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/20 z-20' 
                        : 'border-slate-500/60 bg-slate-800/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="bg-slate-950 px-1 rounded text-slate-300">{region.name}</span>
                      <span className="bg-indigo-900 text-white px-1 rounded text-[8px]">
                        {(region.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Split Consensus Inspector & Logs */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Consensus Disagreement Inspector
            </h2>

            {activeRegion ? (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">SELECTED GRID AREA</div>
                  <div className="font-bold text-sm text-slate-200 mt-1">{activeRegion.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Type: {activeRegion.type}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border-l-2 border-slate-500">
                    <span className="text-slate-400">PaddleOCR</span>
                    <span className="text-slate-300 font-bold">145200</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border-l-2 border-slate-500">
                    <span className="text-slate-400">EasyOCR</span>
                    <span className="text-slate-300 font-bold">14520O</span> {/* common OCR mismatch */}
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border-l-2 border-sky-500">
                    <span className="text-sky-400">Qwen2.5 (VLM)</span>
                    <span className="text-slate-200 font-bold">145200</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-900 border-l-2 border-indigo-500">
                    <span className="text-indigo-400 font-bold">Claude (Escalation)</span>
                    <span className="text-white font-bold">₹ 1,45,200</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-2">
                  <div className="text-[10px] text-indigo-400 font-bold">LEARNING FEEDBACK OFFSET</div>
                  <p className="text-[10px] text-slate-400">
                    Submit layout adjustment if layout grid requires shift or handwriting correction:
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Corrected Value..." 
                      className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-200 flex-1 outline-none focus:border-indigo-500"
                      id="correction-input"
                    />
                    <button 
                      onClick={() => {
                        const el = document.getElementById('correction-input') as HTMLInputElement;
                        if (el && el.value) {
                          handleCorrectionFeedback(activeRegion, el.value);
                          el.value = '';
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 rounded text-[10px]"
                    >
                      Save Bias
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-8 text-center bg-slate-900/50 rounded border border-slate-900">
                Click any layout region overlay on the register scan to inspect multi-model consensus details.
              </div>
            )}
          </div>

          {/* Diagnostic Console Logs */}
          <div className="bg-slate-950/80 rounded-lg p-5 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Terminal Console logs</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <div className="bg-slate-900 p-3 rounded border border-slate-800 h-40 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
              <div>&gt; PumpAI OCR Diagnostics Shell Initialized...</div>
              <div>&gt; Templates cached: IOCL, HPCL, BPCL, Custom.</div>
              {ocrLog.map((log, idx) => (
                <div key={idx} className="text-indigo-400">&gt; {log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRConfidenceLab;
