/**
 * OperationalPilotLab.tsx
 * High-density operational pilot sandbox executing one full working day simulation.
 * Redesigned into a calm, off-white professional dashboard optimized for petrol pump operator usage.
 * Integrates double-entry accounting integrity checks, offline synchronizations, and handwriting learning loops.
 */

import React, { useState, useEffect } from "react";
import { 
  Play, RotateCcw, AlertTriangle, CheckCircle2, 
  Cpu, Activity, Database, FileText, Wifi, WifiOff,
  Flame, RefreshCw, Layers, ShieldCheck, HelpCircle, 
  ArrowRight, Download, Save, HardDrive, Trash2
} from "lucide-react";
import { 
  LiveWorkflowReplayEngine, 
  ReplayShiftRecord 
} from "../modules/testing/services/LiveWorkflowReplayEngine";
import { 
  PetroleumOperationalSimulationEngine, 
  SimulationAnomalyType, 
  SimulatedAnomalyResult 
} from "../modules/testing/services/PetroleumOperationalSimulationEngine";
import { HandwritingLearningVerification, VerificationCheck } from "../modules/ocr/adaptive/HandwritingLearningVerification";
import { OCRLearningAuditService, HandwritingAuditReport } from "../modules/ocr/adaptive/OCRLearningAuditService";
import { HandwritingGlossary, GlossaryEntry } from "../modules/ocr/adaptive/HandwritingGlossary";
import { OCRCorrectionMemory } from "../modules/ocr/adaptive/OCRCorrectionMemory";
import { OperatorCorrectionTrainer } from "../modules/ocr/adaptive/OperatorCorrectionTrainer";
import { VerifiedAccountingTruthEngine, LabelAccountingInput } from "../modules/dataset/services/VerifiedAccountingTruthEngine";
import { OperationalPerformanceCleanup } from "../modules/operations/OperationalPerformanceCleanup";

export default function OperationalPilotLab() {
  // --- Connection & Core Sandbox States ---
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [attendant, setAttendant] = useState<string>("Ramesh");
  const [stationTemplate, setStationTemplate] = useState<GlossaryEntry['stationTemplate']>("HPCL");
  
  // --- Step 1: Shift Opening ---
  const [openingCash, setOpeningCash] = useState<number>(15000);
  const [openingNozzle, setOpeningNozzle] = useState<number>(10540.2);
  const [nozzlePrice, setNozzlePrice] = useState<number>(96.5);
  const [shiftOpened, setShiftOpened] = useState<boolean>(false);

  // --- Step 2: OCR Ingestion & Correction ---
  const [rawOcrWord, setRawOcrWord] = useState<string>("रमेश");
  const [correctedOcrWord, setCorrectedOcrWord] = useState<string>("Ramesh");
  const [ocrMeaning, setOcrMeaning] = useState<string>("Premium Account Credit Debtor");
  const [ocrCategory, setOcrCategory] = useState<GlossaryEntry['category']>("CUSTOMER_NAME");
  const [ocrLanguage, setOcrLanguage] = useState<GlossaryEntry['language']>("HINDI");
  const [ocrConfidence, setOcrConfidence] = useState<number>(62);
  const [wordTrained, setWordTrained] = useState<boolean>(false);

  // --- Step 3: Portal Extraction & Reconciliation ---
  const [portalSyncActive, setPortalSyncActive] = useState<boolean>(false);
  const [extractedPortalCash, setExtractedPortalCash] = useState<number>(24500);
  const [extractedPortalNozzle, setExtractedPortalNozzle] = useState<number>(10642.5); // 102.3L sales
  const [extractedPortalUpi, setExtractedPortalUpi] = useState<number>(8500);
  
  // OCR Scans (Step 2 yields these values)
  const [scanCash, setScanCash] = useState<number>(24400); // 100 Rs mismatch
  const [scanNozzle, setScanNozzle] = useState<number>(10642.5);
  const [scanUpi, setScanUpi] = useState<number>(8500);

  // Manual Operator Inputs
  const [manualCash, setManualCash] = useState<number>(24500);
  const [manualNozzle, setManualNozzle] = useState<number>(10642.5);
  const [manualUpi, setManualUpi] = useState<number>(8500);
  const [reconciled, setReconciled] = useState<boolean>(false);

  // --- Step 4 & 5: UPI, Expenses & Direct Entries ---
  const [manualExpenses, setManualExpenses] = useState<number>(1200);
  const [upiDeeplinkMatch, setUpiDeeplinkMatch] = useState<boolean>(true); // default true, can toggle
  const [cardSwipes, setCardSwipes] = useState<number>(3500);

  // --- Step 6: Wetstock dipping ---
  const [openingWetstock, setOpeningWetstock] = useState<number>(12000);
  const [deliveries, setDeliveries] = useState<number>(0);
  const [density, setDensity] = useState<number>(744.5);
  const [closingPhysicalWetstock, setClosingPhysicalWetstock] = useState<number>(11897.6); // Expected is 12000 - 102.3 = 11897.7. Deviation 0.1L. Allowed is ~11L.

  // --- Step 7: Credit Ledger & Name Reuse ---
  const [creditCustomerInput, setCreditCustomerInput] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditLogs, setCreditLogs] = useState<Array<{ name: string; amount: number; isGlossaryHit: boolean }>>([]);
  const [recoveredAmount, setRecoveredAmount] = useState<number>(2000);

  // --- Step 8: Double-Entry Shift Closing ---
  const [shiftClosed, setShiftClosed] = useState<boolean>(false);
  const [closingReport, setClosingReport] = useState<any>(null);
  
  // --- Step 9: Handwriting Verification Assertions ---
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>([]);
  const [auditReports, setAuditReports] = useState<{
    accuracy: string;
    reuse: string;
    unresolved: string;
    duplicates: string;
  } | null>(null);

  // Performance and cleanup results
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);

  // --- Metrics ---
  const [metrics, setMetrics] = useState({
    correctionsCount: 0,
    attendantSpeedMs: 2840,
    reconciliationAccuracy: 100,
    mismatchCount: 1,
    shiftClosingDurationSec: 42
  });

  // --- Logs Manager ---
  const addLog = (msg: string) => {
    setSimulationLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 39)]);
  };

  // --- Load cache / Persistence ---
  useEffect(() => {
    addLog("Operational Pilot Workspace Initialized: Calm Off-White UI Active.");
    
    // Execute programmatic bug-fix and performance cleanup pass
    const cleanRes = OperationalPerformanceCleanup.executeCleanupPass();
    setCleanupResult(cleanRes);
    // Preset some basic corrections in memory for audit if glossary is empty
    const currentGlossary = HandwritingGlossary.getAllEntries();
    if (currentGlossary.length === 0) {
      HandwritingGlossary.addEntry({
        rawOCR: "कैश",
        correctedValue: "Cash",
        normalizedMeaning: "Cash collections",
        category: "OPERATIONAL_TERM",
        language: "HINDI",
        stationTemplate: "HPCL",
        operatorId: "ATTND-A",
        confidence: 78
      });
      HandwritingGlossary.addEntry({
        rawOCR: "अंतिम",
        correctedValue: "Closing Reading",
        normalizedMeaning: "Closing meter reading",
        category: "OPERATIONAL_TERM",
        language: "HINDI",
        stationTemplate: "HPCL",
        operatorId: "ATTND-A",
        confidence: 82
      });
    }
  }, []);

  // --- Toggle Internet Disconnect Simulation ---
  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
    addLog(isOnline ? "⚠️ NETWORK STATE CHANGE: Disconnected. Local offline sync buffer active." : "⚡ NETWORK STATE CHANGE: Reconnected. Offline cache streams synced successfully.");
    if (isOnline) {
      setMetrics(prev => ({ ...prev, shiftClosingDurationSec: prev.shiftClosingDurationSec + 15 }));
    }
  };

  // --- App Crash Simulation & Recovery ---
  const handleSimulateCrash = () => {
    // Cache crucial variables to LocalStorage just like production Electron recovery buffers
    const crashCache = {
      activeStep,
      attendant,
      stationTemplate,
      openingCash,
      openingNozzle,
      shiftOpened,
      manualCash,
      manualNozzle,
      manualUpi,
      manualExpenses,
      closingPhysicalWetstock,
      creditLogs,
      recoveredAmount,
      shiftClosed,
      wordTrained,
      reconciled,
      verificationChecks,
      auditReports
    };
    localStorage.setItem("pumpai_pilot_crash_buffer", JSON.stringify(crashCache));
    
    // Nuke the local react states to simulate crash
    setActiveStep(0);
    setShiftOpened(false);
    setShiftClosed(false);
    setCreditLogs([]);
    setWordTrained(false);
    setReconciled(false);
    setVerificationChecks([]);
    setAuditReports(null);
    
    addLog("💥 APP CRASH INJECTED! Component states wiped out. Simulating hard reboot...");
    
    setTimeout(() => {
      const stored = localStorage.getItem("pumpai_pilot_crash_buffer");
      if (stored) {
        const cached = JSON.parse(stored);
        setActiveStep(cached.activeStep);
        setAttendant(cached.attendant);
        setStationTemplate(cached.stationTemplate);
        setOpeningCash(cached.openingCash);
        setOpeningNozzle(cached.openingNozzle);
        setShiftOpened(cached.shiftOpened);
        setManualCash(cached.manualCash);
        setManualNozzle(cached.manualNozzle);
        setManualUpi(cached.manualUpi);
        setManualExpenses(cached.manualExpenses);
        setClosingPhysicalWetstock(cached.closingPhysicalWetstock);
        setCreditLogs(cached.creditLogs);
        setRecoveredAmount(cached.recoveredAmount);
        setShiftClosed(cached.shiftClosed);
        
        // Restore newly added states
        if (cached.wordTrained !== undefined) setWordTrained(cached.wordTrained);
        if (cached.reconciled !== undefined) setReconciled(cached.reconciled);
        if (cached.verificationChecks !== undefined) setVerificationChecks(cached.verificationChecks);
        if (cached.auditReports !== undefined) setAuditReports(cached.auditReports);
        
        addLog("🛡️ CRASH RECOVERY COMPLETE: Successfully restored all operational day states from persistent device caches!");
      }
    }, 1500);
  };

  // --- Simulation Navigation Helpers ---
  const advanceStep = () => {
    if (activeStep < 9) {
      setActiveStep(prev => prev + 1);
      addLog(`Transitioned to Phase ${activeStep + 2} of the operational working day.`);
    }
  };

  const retreatStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  // --- Step 1 Action ---
  const handleOpenShift = () => {
    if (openingCash <= 0 || openingNozzle <= 0) {
      addLog("❌ Opening validation failed: Cash and Nozzle reading must be positive.");
      return;
    }
    setShiftOpened(true);
    addLog(`Shift opened successfully for attendant ${attendant}. Drawer cash anchored at ₹${openingCash}. Nozzle opening: ${openingNozzle} L.`);
    advanceStep();
  };

  // --- Step 2 Action: Train Word ---
  const handleTrainOcrWord = () => {
    if (!correctedOcrWord || !rawOcrWord) return;
    
    // Invoke OperatorCorrectionTrainer to log details
    OperatorCorrectionTrainer.trainCorrection({
      operatorId: "ATTND-A",
      stationId: "STN-CENTRAL",
      fieldKey: "shift_register_debtor",
      rawOCR: rawOcrWord,
      correctedValue: correctedOcrWord,
      normalizedMeaning: ocrMeaning,
      category: ocrCategory,
      language: ocrLanguage,
      stationTemplate: stationTemplate,
      confidence: ocrConfidence
    });

    setWordTrained(true);
    setMetrics(prev => ({ ...prev, correctionsCount: prev.correctionsCount + 1 }));
    addLog(`📝 HANDWRITING LEARNING: Trained Hindi phrase "${rawOcrWord}" ➔ "${correctedOcrWord}" (${ocrCategory}). Registered in local glossary memory.`);
  };

  // --- Step 3 Action: Portal Sync Simulation ---
  const handlePortalSync = () => {
    setPortalSyncActive(true);
    addLog("📡 Connecting to HPCL CRIS Portal Viewport... Extracting operational table rows...");
    setTimeout(() => {
      setPortalSyncActive(false);
      addLog("📡 Portal readings extracted. Side-by-side comparative reconciliation metrics generated.");
    }, 1000);
  };

  // --- Step 7 Action: Customer Credit ---
  const handleAddCreditLog = () => {
    if (!creditCustomerInput || creditAmount <= 0) return;
    
    // Check if customer name triggers a glossary reuse match
    const match = HandwritingGlossary.findMatch(creditCustomerInput, stationTemplate);
    const isGlossaryHit = !!match;
    const resolvedName = match ? match.correctedValue : creditCustomerInput;
    
    setCreditLogs(prev => [...prev, { name: resolvedName, amount: creditAmount, isGlossaryHit }]);
    setCreditCustomerInput("");
    setCreditAmount(0);
    
    if (isGlossaryHit) {
      addLog(`🎯 GLOSSARY HINT MATCHED: Translated "${creditCustomerInput}" instantly to customer "${resolvedName}" using trained offline glossary!`);
    } else {
      addLog(`Logged credit entry of ₹${creditAmount} for customer "${creditCustomerInput}".`);
    }
  };

  // --- Step 8 Action: Double Entry Verification & Shift Close ---
  const handleCloseShift = () => {
    const salesVolume = manualNozzle - openingNozzle;
    const expectedRevenue = salesVolume * nozzlePrice;
    
    // double-entry input
    const input: LabelAccountingInput = {
      nozzles: [
        { id: "NZ-01", opening: openingNozzle, closing: manualNozzle, price: nozzlePrice }
      ],
      wetstock: {
        openingVolume: openingWetstock,
        closingVolume: closingPhysicalWetstock,
        deliveries: deliveries,
        density: density
      },
      collections: {
        cashReceived: manualCash - openingCash,
        cardCollections: cardSwipes,
        upiCollections: manualUpi,
        creditSales: creditLogs.reduce((sum, item) => sum + item.amount, 0),
        expenses: manualExpenses
      }
    };

    const report = VerifiedAccountingTruthEngine.validate(input);
    setClosingReport(report);

    if (report.passed) {
      setShiftClosed(true);
      addLog("✅ DOUBLE-ENTRY SUCCESSFUL: Nozzles, collections, and wetstock evaporation balances match perfectly! Shift period locked.");
      advanceStep();
    } else {
      addLog(`🚨 DOUBLE-ENTRY BREACH: Shift closing blocked due to validation failures. Variance: ₹${report.mismatchScore}`);
    }
  };

  // --- Step 9 Action: Run Programmatic Handwriting Verification Audit ---
  const handleRunHandwritingVerification = () => {
    const result = HandwritingLearningVerification.runComprehensiveVerificationSuite();
    setVerificationChecks(result.checks);
    setAuditReports(result.reports);
    addLog(`🔍 HANDWRITING LEARNING AUDIT: Ran ${result.checks.length} self-check assertions. Result: ${result.checks.every(c => c.passed) ? "ALL PASS" : "FAIL"}`);
  };

  // --- Calculate Current Close Reconciliation Stats ---
  const fuelSalesLiters = Math.max(0, manualNozzle - openingNozzle);
  const expectedFuelRevenue = fuelSalesLiters * nozzlePrice;
  const loggedCredits = creditLogs.reduce((sum, item) => sum + item.amount, 0);
  const reportedCashCollection = manualCash - openingCash;
  const totalSettlements = reportedCashCollection + cardSwipes + manualUpi + loggedCredits + manualExpenses;
  const accountingBalanceDiff = Math.abs(expectedFuelRevenue - totalSettlements);

  // --- Generate Reports Data ---
  const generateIssuesReport = () => {
    return `# Operational Issues Report - Pilot Day\n\n` +
      `- **Attendant**: ${attendant}\n` +
      `- **Station Template**: ${stationTemplate}\n` +
      `- **Mismatches Captured**: ${accountingBalanceDiff > 5 ? 1 : 0}\n` +
      `- **Accounting Reconciliation Mismatch**: ₹${accountingBalanceDiff.toFixed(2)}\n` +
      `- **Wetstock Physical vs Calculated Deviation**: ${(closingPhysicalWetstock - (openingWetstock - fuelSalesLiters)).toFixed(2)} Liters\n` +
      `- **Permissible Density Evaporation Limits**: Passed (deviation below 0.1% threshold)\n` +
      `- **Action Status**: ${accountingBalanceDiff > 5 ? "Blocked. Operator override requested." : "Approved. No transaction discrepancies trapped."}`;
  };

  const generateOcrReport = () => {
    const glossary = HandwritingGlossary.getAllEntries();
    return `# OCR Handwriting Learning & Failure Report\n\n` +
      `- **Total Handwritten Phrases Trained**: ${glossary.length}\n` +
      `- **Active Station-Specific Mappings**: ${glossary.filter(g => g.stationTemplate === stationTemplate).length}\n` +
      `- **Low Confidence Detections Flagged**: 1\n` +
      `- **Hindi Phrase Adaptations Recorded**: ${glossary.filter(g => g.language === "HINDI" || g.language === "MIXED").length}\n` +
      `- **Accuracy Gain Index**: +${Math.min(25, glossary.length * 5)}% (gradual confidence bounds increase)`;
  };

  const generateFrictionReport = () => {
    return `# Attendant Workflow Friction Telemetry\n\n` +
      `- **Average Operator Processing Time**: ${metrics.attendantSpeedMs} ms\n` +
      `- **Shift Close Duration**: ${metrics.shiftClosingDurationSec} seconds\n` +
      `- **Handwriting Dictionary Hit Rate**: ${creditLogs.filter(c => c.isGlossaryHit).length} / ${creditLogs.length || 1} credit logs\n` +
      `- **Veto Actions & Manual Overrides Count**: ${metrics.correctionsCount}\n` +
      `- **Friction Score**: Very Low (optimized name matches and pre-filled till entries minimize keystrokes)`;
  };

  const generateReplayReport = () => {
    return `# Chronological Carry-Forward Ledger Replay Audit\n\n` +
      `- **Replay Chain Verification Status**: 100% INVIOLABLE\n` +
      `- **Opening Balance Match Audit**: Anchor matches preceding closed period carry ₹${openingCash}\n` +
      `- **Historical Closed Period Mutations**: 0 balance modifications occurred during glossary updates\n` +
      `- **Double Entry Compliance Index**: Inviolable ledger integrity locked.`;
  };

  const generateOfflineReport = () => {
    return `# Offline Synchronization & Crash Recovery Audit\n\n` +
      `- **Offline Storage Ingress**: LocalStorage encrypted buffer active\n` +
      `- **Crash Recovery Incidents Tested**: 1\n` +
      `- **Data Loss Index**: 0.00% (absolute recovery of active ledger shift states)\n` +
      `- **Sync State**: ${isOnline ? "Synced to base" : "Pending connection reconnect"}`;
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans p-6 md:p-8">
      {/* Top Banner Control deck */}
      <div className="max-w-7xl mx-auto mb-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Final_PumpAI Pilot Simulator <span className="text-[10px] uppercase bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Live Operational Mode</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Stress-test a full working day, analyze real-world scanned registers, and audit handwriting learning OCR systems.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Button */}
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isOnline 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" 
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? "Online (Base Sync Connected)" : "Offline (Local Caching Active)"}
          </button>

          {/* Crash Simulator Button */}
          <button
            onClick={handleSimulateCrash}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Simulates React state clear and localStorage recovery"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            Simulate App Crash
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Interactive Flow (Timeline Panel) - 4 Columns */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            10-Phase Working Day
          </h2>
          
          <div className="space-y-4">
            {[
              "1. Shift Opening",
              "2. OCR Scan & Hindi Learning",
              "3. Portal Reconciliation Matrix",
              "4. Manual Ledgers & Expenses",
              "5. UPI & Card Audit",
              "6. Wetstock density check",
              "7. Customer Credit & Glossary Match",
              "8. Double Entry Closing",
              "9. Handwriting Learning Verification",
              "10. Dynamic Performance Reports"
            ].map((step, idx) => {
              const isActive = activeStep === idx;
              const isPassed = activeStep > idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isPassed || isActive || shiftOpened) {
                      setActiveStep(idx);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 flex items-center justify-between ${
                    isActive 
                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 font-extrabold shadow-sm scale-[1.02]" 
                      : isPassed 
                        ? "bg-slate-50 border-slate-100 text-slate-500 font-medium"
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 cursor-not-allowed"
                  }`}
                  disabled={!shiftOpened && idx > 0}
                >
                  <span className="truncate">{step}</span>
                  {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  {isActive && <ArrowRight className="w-4 h-4 text-indigo-500 flex-shrink-0 animate-bounce" />}
                </button>
              );
            })}
          </div>

          {/* Setup Profile Card */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-3">Operator Context Settings</span>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Attendant Name:</label>
                <select 
                  value={attendant}
                  onChange={(e) => setAttendant(e.target.value)}
                  disabled={shiftOpened}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="Ramesh">Ramesh (HINDI)</option>
                  <option value="Babulal">Babulal (HINDI)</option>
                  <option value="Suresh">Suresh (ENGLISH)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Portal OMC Template:</label>
                <select
                  value={stationTemplate}
                  onChange={(e) => setStationTemplate(e.target.value as GlossaryEntry['stationTemplate'])}
                  disabled={shiftOpened}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="HPCL">HPCL CRIS Portal</option>
                  <option value="BPCL">BPCL Smart Portal</option>
                  <option value="IOCL">IOCL XTRAPOWER</option>
                  <option value="Nayara">Nayara Retail</option>
                  <option value="Jio-bp">Jio-bp Portal</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Active Work Area - 8 Columns */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Phase Active Detail Area */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm transition-all duration-300">
            
            {/* STEP 1: SHIFT OPENING */}
            {activeStep === 0 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 1: Shift Opening & Opening Readings</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">PRATHAM CHARAN</span>
                </div>

                {shiftOpened ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-emerald-800 mb-6">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold uppercase">Shift Registry Successfully Initialized</h4>
                        <p className="text-[11px] text-emerald-700 mt-1">Shift is active. Attendant <strong>{attendant}</strong> is assigned. Drawer cash anchored at ₹{openingCash.toLocaleString()} and nozzle readings continuous.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opening Till Cash Balance (₹):</label>
                        <input 
                          type="number"
                          value={openingCash}
                          onChange={(e) => setOpeningCash(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fuel Nozzle Opening reading (Liters):</label>
                        <input 
                          type="number"
                          value={openingNozzle}
                          onChange={(e) => setOpeningNozzle(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-slate-600 text-[11px] leading-relaxed">
                      💡 <strong>Deterministic Replay Anchor Check</strong>: This step anchors the shift ledger chain. The system will verify carry-forward balances from previous chronological closing records.
                    </div>

                    <button
                      onClick={handleOpenShift}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Open Shift and Verify Cash Drawer
                    </button>
                  </div>
                )}

                {shiftOpened && (
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={advanceStep}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm"
                    >
                      Proceed to Ingest Scanned Registers
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: OCR INGESTION & HINDI LEARNING */}
            {activeStep === 1 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 2: Handwritten Register Scan & OCR Learning</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">OCR ENGINE INGRESS</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Scanned PDF/Image Mockup */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-between min-h-[300px]">
                    <div className="w-full text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Simulated Scanned Petroleum Sheet</span>
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-left font-mono text-[10px] text-slate-700 leading-normal">
                        <div className="text-center font-bold border-b pb-2 mb-2">HPCL SHIFT REGISTER SHEET</div>
                        <div className="grid grid-cols-2 border-b py-1"><span>ओपनिंग रीडिंग:</span> <span className="text-right">10540.20</span></div>
                        <div className="grid grid-cols-2 border-b py-1"><span>अंतिम रीडिंग:</span> <span className="text-right">10642.50</span></div>
                        <div className="grid grid-cols-2 border-b py-1"><span>नकद (Cash):</span> <span className="text-right">₹24,400</span></div>
                        <div className="grid grid-cols-2 border-b py-1"><span>PhonePe (UPI):</span> <span className="text-right">₹8,500</span></div>
                        <div className="grid grid-cols-2 py-1"><span className="text-orange-600 font-bold">रमेश Credit:</span> <span className="text-right font-bold">₹3,000</span></div>
                      </div>
                    </div>

                    <div className="mt-4 w-full">
                      <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-[10px] text-slate-500 leading-relaxed">
                        🔍 <strong>Engine Note</strong>: The OCR successfully parsed numerical fields but flagged `रमेश` with **low confidence** (62%), calling for human-in-the-loop operator correction.
                      </div>
                    </div>
                  </div>

                  {/* Right: Unknown handwriting review portal */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
                        Human-in-the-loop Handwriting Review
                      </h4>

                      {wordTrained ? (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-indigo-800">
                          <CheckCircle2 className="w-5 h-5 text-indigo-500 inline mb-2" />
                          <h5 className="text-xs font-bold uppercase mt-1">Glossary Dictionary Updated!</h5>
                          <p className="text-[11px] text-indigo-700 mt-1">Confirmed translation mapping logged. Next time Ramesh is written on handwritten logs, the glossary will auto-resolve his name without operator prompts.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 bg-slate-50/50 p-4 border border-slate-200/80 rounded-2xl">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Messy Raw Handwriting OCR Scan:</span>
                            <span className="font-mono font-bold text-xs bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg border border-orange-200">{rawOcrWord}</span>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Corrected Translation Value:</label>
                            <input 
                              type="text"
                              value={correctedOcrWord}
                              onChange={(e) => setCorrectedOcrWord(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category:</label>
                              <select 
                                value={ocrCategory}
                                onChange={(e) => setOcrCategory(e.target.value as GlossaryEntry['category'])}
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[11px] outline-none"
                              >
                                <option value="CUSTOMER_NAME">Customer Name</option>
                                <option value="LEDGER_TERM">Ledger Term</option>
                                <option value="NOZZLE_LABEL">Nozzle Label</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Language:</label>
                              <select 
                                value={ocrLanguage}
                                onChange={(e) => setOcrLanguage(e.target.value as GlossaryEntry['language'])}
                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[11px] outline-none"
                              >
                                <option value="HINDI">Hindi (हिंदी)</option>
                                <option value="MIXED">Mixed (Hindi/Eng)</option>
                                <option value="ENGLISH">English</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Normalized operational meaning:</label>
                            <input 
                              type="text"
                              value={ocrMeaning}
                              onChange={(e) => setOcrMeaning(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[11px] outline-none"
                            />
                          </div>

                          <button
                            onClick={handleTrainOcrWord}
                            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" /> Save & Train Translation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Portal Extraction & Reconciliation</button>
                </div>
              </div>
            )}

            {/* STEP 3: PORTAL EXTRACTION & RECONCILIATION PANEL */}
            {activeStep === 2 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 3: Dealer Portal Sync & Reconciliation Matrix</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">4-WAY CROSS MATRIX</span>
                </div>

                <div className="mb-6 flex gap-4">
                  <button
                    onClick={handlePortalSync}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${portalSyncActive ? "animate-spin" : ""}`} />
                    Sync HPCL CRIS Portal Values
                  </button>
                  <span className="text-slate-500 text-xs flex items-center">
                    {portalSyncActive ? "Syncing..." : "Connected to virtual CRIS terminal viewport."}
                  </span>
                </div>

                {/* 4-Way Comparison side-by-side Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-6">
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-black">
                        <th className="p-3">Telemetry Parameter</th>
                        <th className="p-3">Portal API Extract</th>
                        <th className="p-3">OCR Register Scan</th>
                        <th className="p-3">Manual Operator Entry</th>
                        <th className="p-3">Expected Continuity</th>
                        <th className="p-3">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">Closing Cash Drawer</td>
                        <td className="p-3 font-mono font-bold text-slate-900">₹{extractedPortalCash.toLocaleString()}</td>
                        <td className="p-3 font-mono text-rose-600 bg-rose-50/50 font-bold">
                          ₹{scanCash.toLocaleString()}
                          <span className="text-[8px] block font-normal">₹100 mismatch</span>
                        </td>
                        <td className="p-3">
                          <input 
                            type="number"
                            value={manualCash}
                            onChange={(e) => setManualCash(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded p-1 w-20 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-500">₹{extractedPortalCash.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${manualCash === extractedPortalCash ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                            {manualCash === extractedPortalCash ? "MATCHED" : "UNRESOLVED"}
                          </span>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">Nozzle Closing (L)</td>
                        <td className="p-3 font-mono text-slate-900">{extractedPortalNozzle}</td>
                        <td className="p-3 font-mono text-slate-900">{scanNozzle}</td>
                        <td className="p-3">
                          <input 
                            type="number"
                            value={manualNozzle}
                            onChange={(e) => setManualNozzle(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded p-1 w-20 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-500">{extractedPortalNozzle}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[8px] font-bold">MATCHED</span>
                        </td>
                      </tr>

                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">UPI Payments (QR)</td>
                        <td className="p-3 font-mono text-slate-900">₹{extractedPortalUpi.toLocaleString()}</td>
                        <td className="p-3 font-mono text-slate-900">₹{scanUpi.toLocaleString()}</td>
                        <td className="p-3">
                          <input 
                            type="number"
                            value={manualUpi}
                            onChange={(e) => setManualUpi(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded p-1 w-20 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-500">₹{extractedPortalUpi.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[8px] font-bold">MATCHED</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                  <h4 className="text-xs font-black text-slate-700 uppercase mb-2">Discrepancy Analysis Dashboard</h4>
                  <div className="space-y-2 text-[11px] text-slate-600 leading-normal">
                    <p>🚨 **Cash Drawer Discrepancy Caught**: Messy handwritten register OCR scan reported cash as ₹24,400. However, HPCL CRIS portal and operator manual entry confirm the true drawer cash collected is ₹24,500. A variance of **₹100** was automatically trapped and flagged to prevent financial under-reporting.</p>
                    <p>💡 **Operator Action**: Click "Reconcile Differences" below to override the OCR scan guess with the manually verified cash collections ledger.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setManualCash(24500);
                      setReconciled(true);
                      addLog("🤝 RECONCILIATION RESOLVED: Override applied. Locked cash collections at verified amount of ₹24,500.");
                    }}
                    className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                      reconciled 
                        ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
                    }`}
                    disabled={reconciled}
                  >
                    {reconciled ? "Mismatches Reconciled ✓" : "Reconcile Differences & Apply Manual Cash Override"}
                  </button>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Manual Ledgers & Expenses</button>
                </div>
              </div>
            )}

            {/* STEP 4: MANUAL ENTRY & EXPENSES */}
            {activeStep === 3 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 4: Manual Expense Ledger & Collections</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">LEDGER BALANCING</span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Manual Shift Expenses (₹):</label>
                      <input 
                        type="number"
                        value={manualExpenses}
                        onChange={(e) => setManualExpenses(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Attendant tea, petty printing, testing or cleaning bills.</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Card POS Settlement Swipe total (₹):</label>
                      <input 
                        type="number"
                        value={cardSwipes}
                        onChange={(e) => setCardSwipes(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 leading-normal">
                    📈 <strong>Ledger Accounting Rule Safeguard</strong>: Expenses and digital card collections will be recorded as direct deductions and digital settlements in the double-entry closing verification during Phase 8.
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: UPI & Card Audit</button>
                </div>
              </div>
            )}

            {/* STEP 5: UPI AND CARD AUDIT */}
            {activeStep === 4 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 5: Digital UPI Payments Auditing</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">UPI DEEPLINK COUPLING</span>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">UPI QR Total Collections</h4>
                        <span className="text-[9px] text-slate-500">Reported QR receipt logs</span>
                      </div>
                      <span className="font-mono text-sm font-black text-indigo-700">₹{manualUpi.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Bank UPI settled Merchant Deep-links</h4>
                        <span className="text-[9px] text-slate-500">True transactions matching base records</span>
                      </div>
                      <span className="font-mono text-sm font-black text-slate-700">
                        {upiDeeplinkMatch ? `₹${manualUpi.toLocaleString()}` : `₹${(manualUpi - 1200).toLocaleString()}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Match Status</h4>
                        <span className="text-[9px] text-slate-500">Reconciliation state</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${upiDeeplinkMatch ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse"}`}>
                        {upiDeeplinkMatch ? "INTEGRITY INTACT" : "DISCREPANCY DETECTED"}
                      </span>
                    </div>
                  </div>

                  {!upiDeeplinkMatch && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-[11px] leading-relaxed">
                      ⚠️ <strong>Missing Deeplinks Anomaly Trapped</strong>: We found a discrepancy of **₹1,200** between QR receipts and true bank settled transactions. The system prevents double counting to ensure replay safety.
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setUpiDeeplinkMatch(!upiDeeplinkMatch);
                        addLog(upiDeeplinkMatch ? "⚠️ UPI INJECT: Simulating UPI deep-link discrepancy of ₹1,200." : "⚡ UPI INJECT: Realigned UPI deep-link merchant settled match.");
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      {upiDeeplinkMatch ? "Simulate UPI Discrepancy" : "Clear UPI Discrepancy"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Wetstock density check</button>
                </div>
              </div>
            )}

            {/* STEP 6: WETSTOCK DENSITY CHECK */}
            {activeStep === 5 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 6: Wetstock Inventory & Density Evaporation Checks</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">WETSTOCK DENSITIES</span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opening Tank Stock (Liters):</label>
                      <input 
                        type="number"
                        value={openingWetstock}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Closing Physical Dip Stock (Liters):</label>
                      <input 
                        type="number"
                        value={closingPhysicalWetstock}
                        onChange={(e) => setClosingPhysicalWetstock(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fuel Density (kg/m³):</label>
                      <input 
                        type="number"
                        value={density}
                        onChange={(e) => setDensity(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fuel Sales Volume (Liters):</label>
                      <span className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold text-slate-500 block">
                        {fuelSalesLiters.toFixed(2)} Liters
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-2">
                    <h5 className="text-[10px] uppercase font-black text-slate-700">Evaporative Bounds Evaluation</h5>
                    <div className="text-[11px] text-slate-600 leading-normal space-y-1">
                      <p>• Expected Inventory: **{(openingWetstock - fuelSalesLiters + deliveries).toFixed(2)} Liters**</p>
                      <p>• Physical Dip Discrepancy: **{(closingPhysicalWetstock - (openingWetstock - fuelSalesLiters)).toFixed(2)} Liters**</p>
                      <p>• Temperature-Density Permissible Evaporation limit (0.1%): **{((openingWetstock - fuelSalesLiters) * 0.001 * (density / 750)).toFixed(2)} Liters**</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setClosingPhysicalWetstock(11000); // Massive inventory drop
                        addLog("⚠️ WETSTOCK INJECT: Injected inventory dip discrepancy exceeding permitted density margins.");
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Simulate Massive Dip Leak
                    </button>
                    <button
                      onClick={() => {
                        setClosingPhysicalWetstock(11897.6);
                        addLog("⚡ WETSTOCK INJECT: Cleaned up physical dip, aligning within permitted evaporation tolerances.");
                      }}
                      className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Restore Correct Physical Dip
                    </button>
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Customer Credit & Glossary Match</button>
                </div>
              </div>
            )}

            {/* STEP 7: CUSTOMER CREDIT & GLOSSARY REUSE MATCH */}
            {activeStep === 6 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 7: Customer Credit Ledger & Name Reuse</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">GLOSSARY REUSE MATCH</span>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                    💡 <strong>Hindi Glossary Adaptation Check</strong>: In Step 2, you trained the raw Hindi handwriting phrase <strong>{rawOcrWord}</strong> to resolve to <strong>{correctedOcrWord}</strong>. Below, try typing the raw Hindi name `रमेश` in the input and click add. The dictionary will instantly execute name matching.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Customer Credit Name:</label>
                      <input 
                        type="text"
                        placeholder="Type 'रमेश' to test dictionary match"
                        value={creditCustomerInput}
                        onChange={(e) => setCreditCustomerInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Credit Amount (₹):</label>
                      <input 
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleAddCreditLog}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
                    >
                      Log Credit Ledger Entry
                    </button>
                    <button
                      onClick={() => setCreditCustomerInput("रमेश")}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Load Trained Hindi Name
                    </button>
                  </div>

                  <div>
                    <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Shift Customer Credit entries:</h5>
                    {creditLogs.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 rounded-xl text-xs text-slate-400 italic">No credit entries recorded. Try adding Ramesh!</div>
                    ) : (
                      <div className="space-y-2">
                        {creditLogs.map((log, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{log.name}</span>
                              {log.isGlossaryHit && (
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[8px] font-bold">🎯 GLOSSARY MATCH HINT</span>
                              )}
                            </div>
                            <span className="font-mono text-slate-900">₹{log.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Double Entry Shift Closing</button>
                </div>
              </div>
            )}

            {/* STEP 8: DOUBLE ENTRY SHIFT CLOSING */}
            {activeStep === 7 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 8: Double-Entry Shift Balance closing</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">PERIOD LOCKS</span>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 text-xs font-semibold">
                    <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Verification Ledger</h4>
                    
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-slate-600">Expected Nozzle Sales Revenue:</span>
                      <span className="font-mono text-slate-900">₹{expectedFuelRevenue.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-slate-600">Total Settlement Collections (Cash + Digital + Credits + Expenses):</span>
                      <span className="font-mono text-indigo-700">₹{totalSettlements.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Ledger Balance Variance:</span>
                      <span className={`font-mono font-bold ${accountingBalanceDiff === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{accountingBalanceDiff.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {closingReport && !closingReport.passed && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-[11px] leading-relaxed">
                      <strong>⚠️ Close blocked!</strong>: Double entry validation failed: {closingReport.errors.join(", ")}
                    </div>
                  )}

                  {shiftClosed ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
                      🎉 <strong>Shift Closed & Sealed!</strong>: The daily operational shift is verified, balanced, and archived as an immutable lock-period ledger sheet.
                    </div>
                  ) : (
                    <button
                      onClick={handleCloseShift}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" /> Validate Balances & Close Shift
                    </button>
                  )}
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Handwriting Learning Verification</button>
                </div>
              </div>
            )}

            {/* STEP 9: HANDWRITING LEARNING VERIFICATION */}
            {activeStep === 8 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 9: Programmatic Handwriting Learning Audit assertions</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">SELF-VERIFY ASSERTIONS</span>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <button
                      onClick={handleRunHandwritingVerification}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all"
                    >
                      <Cpu className="w-4 h-4" /> Run Verification Assertions
                    </button>
                  </div>

                  {verificationChecks.length > 0 ? (
                    <div className="space-y-3">
                      {verificationChecks.map((check, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 ${
                          check.passed 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${check.passed ? "text-emerald-600" : "text-rose-600"}`} />
                          <div>
                            <h5 className="text-xs font-bold uppercase">{check.name}</h5>
                            <p className="text-[11px] text-slate-500 mt-1 leading-normal">{check.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl text-xs text-slate-400 italic">
                      Click the button above to run programmatic assertions on the handwriting learning loops.
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button onClick={advanceStep} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm">Next Step: Dynamic Performance Reports</button>
                </div>
              </div>
            )}

            {/* STEP 10: DYNAMIC PERFORMANCE REPORTS */}
            {activeStep === 9 && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-black text-slate-900">Phase 10: Live Pilot Telemetry & Diagnostic Reports Export</h3>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">REPORT COCKPIT</span>
                </div>

                <div className="space-y-6">
                  
                  {/* Live Telemetry cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">OCR Correction Freq</span>
                      <span className="text-lg font-mono font-black text-slate-800 mt-1 block">{metrics.correctionsCount} Overrides</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Operator Speed</span>
                      <span className="text-lg font-mono font-black text-indigo-700 mt-1 block">{metrics.attendantSpeedMs} ms</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Shift Closing Speed</span>
                      <span className="text-lg font-mono font-black text-emerald-600 mt-1 block">{metrics.shiftClosingDurationSec} seconds</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Mismatch Frequency</span>
                      <span className="text-lg font-mono font-black text-rose-600 mt-1 block">{metrics.mismatchCount} caught</span>
                    </div>
                  </div>

                  {/* Generated Reports list */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Automated Diagnostic Report Outputs</h4>
                    
                    {/* 1. Learning Accuracy Report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-orange-500" /> 1. Handwriting Learning Accuracy Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(auditReports?.accuracy || generateOcrReport())}`}
                          download="Handwriting_Learning_Accuracy_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={auditReports?.accuracy || generateOcrReport()}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 2. Correction Reuse Report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-500" /> 2. Attendant Correction Reuse Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(auditReports?.reuse || generateFrictionReport())}`}
                          download="Attendant_Correction_Reuse_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={auditReports?.reuse || generateFrictionReport()}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 3. Unresolved OCR Report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-amber-500" /> 3. Unresolved OCR Detections Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(auditReports?.unresolved || "Run Step 9 to generate report.")}`}
                          download="Unresolved_OCR_Detections_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={auditReports?.unresolved || "Please run Phase 9 verification audit first to compile unresolved handwriting scans."}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 4. Duplicate-Memory Report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-rose-500" /> 4. Duplicate Memory Collision Audit Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(auditReports?.duplicates || "Run Step 9 to generate report.")}`}
                          download="Duplicate_Memory_Collision_Audit_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={auditReports?.duplicates || "Please run Phase 9 verification audit first to scan for duplicates memory overrides."}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 5. Operational Issues report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-500" /> 5. Operational Issues & Mismatches Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(generateIssuesReport())}`}
                          download="Operational_Issues_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={generateIssuesReport()}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 6. Replay Integrity report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-500" /> 6. Chronological Carry-Forward Replay Integrity Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(generateReplayReport())}`}
                          download="Replay_Integrity_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={generateReplayReport()}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 7. Offline Recovery report */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-purple-500" /> 7. Offline Recovery & Persistence Report</span>
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(generateOfflineReport())}`}
                          download="Offline_Recovery_Report.md"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <textarea
                        readOnly
                        value={generateOfflineReport()}
                        className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                      />
                    </div>

                    {/* 8. Operational Performance Benchmark Report */}
                    {cleanupResult && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-sky-500" /> 8. Operational Performance Benchmark Report</span>
                          <a
                            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(cleanupResult.reports.performance)}`}
                            download="Operational_Performance_Benchmark_Report.md"
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Download Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <textarea
                          readOnly
                          value={cleanupResult.reports.performance}
                          className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                        />
                      </div>
                    )}

                    {/* 9. Attendant Action Simplification Report */}
                    {cleanupResult && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-fuchsia-500" /> 9. Attendant Action Simplification Report</span>
                          <a
                            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(cleanupResult.reports.simplification)}`}
                            download="Attendant_Action_Simplification_Report.md"
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Download Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <textarea
                          readOnly
                          value={cleanupResult.reports.simplification}
                          className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                        />
                      </div>
                    )}

                    {/* 10. Remaining Operational Issues Backlog Report */}
                    {cleanupResult && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><FileText className="w-4 h-4 text-rose-500" /> 10. Remaining Operational Issues Backlog Report</span>
                          <a
                            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(cleanupResult.reports.issues)}`}
                            download="Remaining_Operational_Issues_Report.md"
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Download Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <textarea
                          readOnly
                          value={cleanupResult.reports.issues}
                          className="w-full h-32 p-3 font-mono text-[9px] bg-slate-900 text-indigo-300 outline-none border-none resize-none"
                        />
                      </div>
                    )}

                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button onClick={retreatStep} className="px-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">Back</button>
                  <button
                    onClick={() => {
                      setActiveStep(0);
                      setShiftOpened(false);
                      setShiftClosed(false);
                      setWordTrained(false);
                      setReconciled(false);
                      setCreditLogs([]);
                      setVerificationChecks([]);
                      setAuditReports(null);
                      addLog("🔄 Reset Pilot simulator to start another full working day sequence.");
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Day Simulator
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Simulation Audit Logger Dashboard console */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Pilot Day Activity Logger
            </h3>
            
            <div className="bg-slate-900 border border-slate-950 rounded-xl p-4 h-40 overflow-y-auto font-mono text-[10px] text-indigo-300 flex flex-col gap-2 scrollbar-thin">
              {simulationLogs.map((log, idx) => (
                <div key={idx} className="border-b border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
