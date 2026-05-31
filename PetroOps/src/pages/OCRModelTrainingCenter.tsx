import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Settings, 
  RotateCcw, 
  CheckCircle, 
  Layers, 
  FileText, 
  Download, 
  Sparkles, 
  Gauge, 
  AlertTriangle, 
  User, 
  History,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { 
  OCRTrainingPipeline, 
  OCRCorrectionSample, 
  TrainingBatch 
} from "../modules/ocr/training/OCRTrainingPipeline";
import { 
  HandwritingAdaptationEngine, 
  OperatorStrokeProfile 
} from "../modules/ocr/training/HandwritingAdaptationEngine";
import { 
  SyntheticRegisterGenerator, 
  SyntheticRegisterOutput, 
  AugmentationParams 
} from "../modules/ocr/training/SyntheticRegisterGenerator";
import { 
  OCRModelVersionRegistry, 
  ModelWeightConfig 
} from "../modules/ocr/training/OCRModelVersionRegistry";
import { 
  FieldAccuracyTrainer, 
  FieldAccuracyMetrics 
} from "../modules/ocr/training/FieldAccuracyTrainer";

export default function OCRModelTrainingCenter() {
  // State variables for synthetic image generator
  const [synthValueOverrides, setSynthValueOverrides] = useState<Record<string, string>>({
    nozzle_1_open: "450912.3",
    nozzle_1_close: "451240.8",
    credit_sales_amt: "4500",
    credit_customer_name: "SHER-E-PUNJAB TRUCKS",
  });
  
  const [augmentation, setAugmentation] = useState<AugmentationParams>({
    injectGreaseSmudges: true,
    shadowIntensity: 0.35,
    paperCreasesCount: 2,
    rotationSkewDegrees: 0.8,
    handwritingVariation: "SLANTED",
  });

  const [syntheticResult, setSyntheticResult] = useState<SyntheticRegisterOutput | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // States for batches and active model versions
  const [correctionSamples, setCorrectionSamples] = useState<OCRCorrectionSample[]>([]);
  const [compiledBatches, setCompiledBatches] = useState<TrainingBatch[]>([]);
  const [modelRegistry, setModelRegistry] = useState<ModelWeightConfig[]>([]);
  const [activeModel, setActiveModel] = useState<ModelWeightConfig | null>(null);
  const [fieldKPIs, setFieldKPIs] = useState<FieldAccuracyMetrics[]>([]);
  
  // Model creation inputs
  const [newVersion, setNewVersion] = useState("v1.1.0");
  const [newModelType, setNewModelType] = useState<ModelWeightConfig["modelType"]>("TESSERACT_FINETUNE");
  
  // Toast warning
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRegistryData();
    triggerSyntheticGeneration();
  }, []);

  const loadRegistryData = () => {
    // Fill dummy corrections to populate dashboard state if empty
    const samples = OCRTrainingPipeline.getCorrectionSamples();
    if (samples.length === 0) {
      OCRTrainingPipeline.registerCorrectionSample("nozzle_1_open", "450912.0", "450912.3", 0.94, "OP-102");
      OCRTrainingPipeline.registerCorrectionSample("nozzle_1_close", "451240.0", "451240.8", 0.88, "OP-102");
      OCRTrainingPipeline.registerCorrectionSample("credit_sales_amt", "4500", "4500", 0.98, "OP-104");
      OCRTrainingPipeline.registerCorrectionSample("credit_customer_name", "SHER-E-PUNJAB", "SHER-E-PUNJAB TRUCKS", 0.72, "OP-104");
    }

    const updatedSamples = OCRTrainingPipeline.getCorrectionSamples();
    setCorrectionSamples(updatedSamples);
    setCompiledBatches(OCRTrainingPipeline.getCompiledBatches());
    
    const models = OCRModelVersionRegistry.getModels();
    setModelRegistry(models);
    setActiveModel(OCRModelVersionRegistry.getActiveModel());
    
    // Compute field accuracies
    setFieldKPIs(FieldAccuracyTrainer.calculateFieldAccuracies(updatedSamples));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const triggerSyntheticGeneration = () => {
    try {
      const result = SyntheticRegisterGenerator.generateRegister(synthValueOverrides, augmentation);
      setSyntheticResult(result);
      showToast("Synthetic register generated with applied degradation matrices!");
    } catch (e: any) {
      showToast(`Generation error: ${e.message}`);
    }
  };

  const handleCompileBatch = () => {
    try {
      const active = OCRModelVersionRegistry.getActiveModel();
      OCRTrainingPipeline.compileTrainingBatch(active.version, "JSONL_ANNOTATED");
      loadRegistryData();
      showToast("Training batch compiled successfully! Saved to persistence.");
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleRegisterNewModel = () => {
    try {
      const overallAcc = Math.floor(90 + Math.random() * 8);
      OCRModelVersionRegistry.registerModel({
        version: newVersion,
        releasedAt: Date.now(),
        accuracyScore: overallAcc,
        modelType: newModelType,
        weightSizeMb: 45.2,
        fieldAccuracies: {
          nozzle_1_open: overallAcc + 1,
          nozzle_1_close: overallAcc - 1,
          nozzle_1_test: overallAcc - 2,
          credit_sales_amt: overallAcc,
          credit_customer_name: overallAcc - 4
        },
        checksum: Math.random().toString(36).substring(2, 15).toUpperCase(),
      });
      loadRegistryData();
      showToast(`Model ${newVersion} registered in STAGING state.`);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handlePromoteModel = (ver: string) => {
    try {
      OCRModelVersionRegistry.promoteToActive(ver);
      loadRegistryData();
      showToast(`Model version ${ver} promoted to PRODUCTION!`);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleRollbackModel = (rollbackVer: string) => {
    if (!activeModel) return;
    try {
      OCRModelVersionRegistry.rollbackModel(activeModel.version, rollbackVer);
      loadRegistryData();
      showToast(`Emergency rollback complete! Active model is now ${rollbackVer}.`);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] p-6 space-y-6">
      {/* Header HUD */}
      <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="text-emerald-500 w-6 h-6 animate-pulse" />
            OCR EVOLUTION PIPELINE & TRAINING COCKPIT
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Accelerate the localized accuracy of Tesseract and CNN models via continuous feedback loops and paper degradation models.
          </p>
        </div>
        
        {/* Metric summary HUD */}
        <div className="flex gap-4 items-center">
          <div className="bg-[#141f35] border border-slate-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Active Weights</div>
            <div className="text-emerald-400 font-bold text-sm">{activeModel?.version || "v1.0.0"}</div>
          </div>
          <div className="bg-[#141f35] border border-slate-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Field Precision</div>
            <div className="text-cyan-400 font-bold text-sm">
              {fieldKPIs.length > 0 
                ? `${(fieldKPIs.reduce((sum, f) => sum + f.exactMatchAccuracy, 0) / fieldKPIs.length).toFixed(1)}%` 
                : "92.1%"}
            </div>
          </div>
          <div className="bg-[#141f35] border border-slate-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Unbatched Corrections</div>
            <div className="text-purple-400 font-bold text-sm">{correctionSamples.length}</div>
          </div>
        </div>
      </div>

      {/* Main layout grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Synthetic Register Engine & Realtime Previews (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                <Sparkles className="text-yellow-500 w-4 h-4" />
                SYNTHETIC REGISTER GENERATOR & AUGMENTATION ENGINE
              </h2>
              <button
                onClick={triggerSyntheticGeneration}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow"
              >
                <Layers className="w-3.5 h-3.5" />
                Generate Sample
              </button>
            </div>

            {/* Config controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Field Inputs */}
              <div className="space-y-2 bg-[#10192e] border border-slate-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Register Values</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">NZ-1 OPEN</label>
                    <input
                      type="text"
                      value={synthValueOverrides.nozzle_1_open}
                      onChange={(e) => setSynthValueOverrides({...synthValueOverrides, nozzle_1_open: e.target.value})}
                      className="w-full bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">NZ-1 CLOSE</label>
                    <input
                      type="text"
                      value={synthValueOverrides.nozzle_1_close}
                      onChange={(e) => setSynthValueOverrides({...synthValueOverrides, nozzle_1_close: e.target.value})}
                      className="w-full bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">CREDIT RS.</label>
                    <input
                      type="text"
                      value={synthValueOverrides.credit_sales_amt}
                      onChange={(e) => setSynthValueOverrides({...synthValueOverrides, credit_sales_amt: e.target.value})}
                      className="w-full bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">CUSTOMER</label>
                    <input
                      type="text"
                      value={synthValueOverrides.credit_customer_name}
                      onChange={(e) => setSynthValueOverrides({...synthValueOverrides, credit_customer_name: e.target.value})}
                      className="w-full bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Degradation Options */}
              <div className="space-y-2 bg-[#10192e] border border-slate-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Paper Degradation</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400">Shadow Darkness</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={augmentation.shadowIntensity}
                      onChange={(e) => setAugmentation({...augmentation, shadowIntensity: parseFloat(e.target.value)})}
                      className="w-24 accent-cyan-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400">Folds count</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={augmentation.paperCreasesCount}
                      onChange={(e) => setAugmentation({...augmentation, paperCreasesCount: parseInt(e.target.value)})}
                      className="w-12 bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400">Tilt Skew (deg)</label>
                    <input
                      type="number"
                      min="-5"
                      max="5"
                      step="0.2"
                      value={augmentation.rotationSkewDegrees}
                      onChange={(e) => setAugmentation({...augmentation, rotationSkewDegrees: parseFloat(e.target.value)})}
                      className="w-16 bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400">Handwriting Style</label>
                    <select
                      value={augmentation.handwritingVariation}
                      onChange={(e) => setAugmentation({...augmentation, handwritingVariation: e.target.value as any})}
                      className="bg-[#17223b] border border-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded"
                    >
                      <option value="NEAT">Georgia Neat</option>
                      <option value="SLANTED">Cursive Slanted</option>
                      <option value="CRAWDED">Cramped Impact</option>
                      <option value="PRINT">Trebuchet Print</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated canvas preview */}
            <div className="flex-1 bg-[#090f1a] border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
              {syntheticResult ? (
                <div className="relative">
                  <img
                    src={syntheticResult.imageDataUrl}
                    alt="Synthetic Register Preview"
                    className="max-h-[340px] object-contain rounded border border-slate-700 shadow"
                  />
                  {/* Bounding box projections overlay */}
                  {syntheticResult.fields.map((f) => (
                    <div
                      key={f.fieldName}
                      onClick={() => setSelectedField(f.fieldName)}
                      className={`absolute cursor-pointer border ${
                        selectedField === f.fieldName
                          ? "border-yellow-500 bg-yellow-500/10 scale-105"
                          : "border-cyan-500/40 bg-cyan-500/5 hover:border-cyan-400"
                      } transition-all duration-150`}
                      style={{
                        // Scale coordinates to fit image bounds on UI
                        left: `${(f.coords.x / 800) * 100}%`,
                        top: `${(f.coords.y / 600) * 100}%`,
                        width: `${(f.coords.width / 800) * 100}%`,
                        height: `${(f.coords.height / 600) * 100}%`,
                      }}
                      title={`${f.fieldName}: ${f.expectedValue}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">No active synthetic canvas rendered.</div>
              )}
            </div>

            {/* Selected field diagnostics */}
            {selectedField && syntheticResult && (
              <div className="mt-3 bg-[#111c33] border border-cyan-800/40 rounded-lg p-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-cyan-400 uppercase">Field Focus:</span> {selectedField}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Coordinates: [X: {syntheticResult.fields.find(f => f.fieldName === selectedField)?.coords.x}, Y: {syntheticResult.fields.find(f => f.fieldName === selectedField)?.coords.y}]
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Ground Truth:</span>{" "}
                  <code className="bg-slate-900 px-2 py-0.5 rounded text-yellow-400 font-mono">
                    {syntheticResult.fields.find(f => f.fieldName === selectedField)?.expectedValue}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Model Registry Version Controller (Phase 1 SPEC 4) */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold tracking-wide text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <History className="text-cyan-400 w-4 h-4" />
              MODEL WEIGHTS VERSION REGISTRY
            </h2>

            {/* Register new staging model inputs */}
            <div className="bg-[#10192e] border border-slate-800 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold text-slate-300">Deploy Weights:</div>
              <input
                type="text"
                placeholder="v1.1.0"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded w-20 text-center font-mono"
              />
              <select
                value={newModelType}
                onChange={(e) => setNewModelType(e.target.value as any)}
                className="bg-[#17223b] border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded"
              >
                <option value="TESSERACT_FINETUNE">TESSERACT FINETUNE</option>
                <option value="PUMPAI_CNN_V3">PUMPAI CNN V3</option>
                <option value="PROPRIETARY_TRANSFORMER">TRANSFORMER SECURE</option>
              </select>
              <button
                onClick={handleRegisterNewModel}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3 py-1 rounded transition ml-auto"
              >
                Deploy to Staging
              </button>
            </div>

            {/* Registered versions list */}
            <div className="space-y-2">
              {modelRegistry.map((model) => (
                <div 
                  key={model.version} 
                  className={`border ${
                    model.status === "ACTIVE" 
                      ? "border-emerald-500/40 bg-emerald-950/10" 
                      : "border-slate-800 bg-[#0f1626]"
                  } rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">{model.version}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        model.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                        model.status === "STAGING" ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {model.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({model.modelType})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Released: {new Date(model.releasedAt).toLocaleString()} • Size: {model.weightSizeMb}MB
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Accuracy rating */}
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Baseline Accuracy</div>
                      <div className={`font-bold text-xs ${model.accuracyScore > 92 ? "text-emerald-400" : "text-yellow-400"}`}>
                        {model.accuracyScore}%
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      {model.status === "STAGING" && (
                        <button
                          onClick={() => handlePromoteModel(model.version)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] px-2.5 py-1 rounded transition"
                        >
                          Promote
                        </button>
                      )}
                      {model.status !== "ACTIVE" && model.status !== "STAGING" && (
                        <button
                          onClick={() => handleRollbackModel(model.version)}
                          className="bg-[#1e2a45] hover:bg-[#28375c] text-white font-semibold text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Training Batches & Accuracy Analysis (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Field-level accuracies and drift indicators (Phase 1 SPEC 5) */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold tracking-wide text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <TrendingUp className="text-emerald-400 w-4 h-4" />
              FIELD-LEVEL DRIFT & PRECISION KPI MATRIX
            </h2>

            {/* SVGs line tracking drift visualizations */}
            <div className="bg-[#090f1a] border border-slate-800 rounded-lg p-3 mb-4">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Historical Accuracy Trend</div>
              <svg viewBox="0 0 200 60" className="w-full h-16 overflow-visible">
                <path
                  d="M 10 50 Q 50 35 90 28 T 170 12"
                  fill="none"
                  stroke="url(#gradient-line)"
                  strokeWidth="2.5"
                />
                <circle cx="10" cy="50" r="3" fill="#3b82f6" />
                <circle cx="90" cy="28" r="3" fill="#8b5cf6" />
                <circle cx="170" cy="12" r="3.5" fill="#10b981" />
                <text x="12" y="46" fill="#64748b" fontSize="8" fontFamily="sans-serif">v1.0</text>
                <text x="92" y="24" fill="#64748b" fontSize="8" fontFamily="sans-serif">Staging</text>
                <text x="160" y="8" fill="#10b981" fontSize="8" fontFamily="sans-serif" fontWeight="bold">v1.1</text>
                
                <defs>
                  <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* List field indicators */}
            <div className="space-y-3">
              {fieldKPIs.map((kpi) => (
                <div key={kpi.fieldName} className="bg-[#10192e] border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-slate-300 font-bold">{kpi.fieldName}</span>
                    <span className={`text-[10px] font-bold ${
                      kpi.accuracyDriftDirection === "IMPROVING" ? "text-emerald-400" :
                      kpi.accuracyDriftDirection === "REGRESSING" ? "text-red-400" : "text-slate-400"
                    }`}>
                      {kpi.accuracyDriftDirection}
                    </span>
                  </div>
                  
                  {/* Accuracy Bar */}
                  <div className="w-full bg-[#18233c] h-1.5 rounded-full overflow-hidden my-1.5">
                    <div 
                      className={`h-full rounded-full ${
                        kpi.exactMatchAccuracy > 92 
                          ? "bg-emerald-500" 
                          : kpi.exactMatchAccuracy > 85 
                          ? "bg-yellow-500" 
                          : "bg-red-500"
                      }`}
                      style={{ width: `${kpi.exactMatchAccuracy}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 text-[9px] text-slate-400 mt-1">
                    <div>Accuracy: <span className="font-bold text-white">{kpi.exactMatchAccuracy}%</span></div>
                    <div>Avg Conf: <span className="font-bold text-slate-200">{kpi.averageConfidenceScore * 100}%</span></div>
                    <div>Lev Dist: <span className="font-bold text-slate-200">{kpi.averageLevenshteinDistance}ch</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training batches fine-tuning controls */}
          <div className="border border-slate-800 bg-[#0c1322] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                <FileText className="text-purple-400 w-4 h-4" />
                FINE-TUNING BATCH GENERATOR
              </h2>
              <button
                onClick={handleCompileBatch}
                disabled={correctionSamples.length === 0}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs px-2.5 py-1 rounded transition flex items-center gap-1 shadow"
              >
                <Download className="w-3 h-3" />
                Compile Batch
              </button>
            </div>

            {/* List correction samples */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Correction Backlog ({correctionSamples.length} samples)
              </div>
              
              {correctionSamples.map((sample) => (
                <div key={sample.sampleId} className="bg-[#10192e] border border-slate-800 rounded p-2 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                    <span>{sample.fieldName}</span>
                    <span className="bg-[#1b263b] px-1 rounded text-cyan-400">Conf: {sample.confidenceScore * 100}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-red-400 line-through truncate max-w-[80px]">{sample.originalText}</span>
                    <span className="text-slate-400 text-[10px]">corrected to</span>
                    <span className="text-emerald-400 font-bold truncate max-w-[120px]">{sample.correctedText}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Compiled batches registry list */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Compiled Fine-tuning Batches ({compiledBatches.length})
              </div>

              {compiledBatches.length > 0 ? (
                <div className="space-y-2">
                  {compiledBatches.map((batch) => (
                    <div key={batch.batchId} className="bg-[#142038] border border-slate-800 rounded p-2.5 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-mono text-white font-bold">{batch.batchId}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Samples: {batch.samples.length} • Format: {batch.exportFormat}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const jsonl = OCRTrainingPipeline.serializeBatchToJsonl(batch);
                          const blob = new Blob([jsonl], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${batch.batchId}_huggingface_dataset.jsonl`;
                          a.click();
                          showToast(`Exported ${batch.batchId} JSONL dataset file!`);
                        }}
                        className="bg-[#243557] hover:bg-[#324978] text-white p-1 rounded transition"
                        title="Download JSONL dataset"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-[10px] italic py-2">No compiled fine-tuning batches yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 border border-cyan-800 text-cyan-200 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-xs z-50 animate-bounce">
          <AlertTriangle className="text-cyan-400 w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
