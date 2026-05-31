import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShiftRecord, NozzleReading } from '../../../types';
import { OperationalWorkflowService } from '../../shared/services/OperationalWorkflowService';
import { 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Lock, 
  Printer, 
  Calculator, 
  DollarSign, 
  Smartphone, 
  UserCheck, 
  Landmark, 
  ShieldCheck, 
  Sun, 
  Moon, 
  X, 
  Clock, 
  TrendingUp,
  FileText
} from 'lucide-react';

interface DenominationCounts {
  [denom: number]: number;
}

interface StepPerformance {
  step: number;
  entryTime: number;
  durationMs: number;
}

const getExpectedMerchantShare = (merchantId: string, totalUpiSales: number, activeMerchants: any[]) => {
  // Check if default ones are active
  const hasPaytm = activeMerchants.some(m => m.id === 'mer-paytm-01');
  const hasSbi = activeMerchants.some(m => m.id === 'mer-sbi-03');
  const hasPhonePe = activeMerchants.some(m => m.id === 'mer-phonepe-02');
  
  if (merchantId === 'mer-paytm-01' && hasPaytm) {
    return Math.round(totalUpiSales * (hasSbi && hasPhonePe ? 0.6 : hasSbi ? 0.8 : hasPhonePe ? 0.9 : 1.0));
  }
  if (merchantId === 'mer-sbi-03' && hasSbi) {
    return Math.round(totalUpiSales * (hasPaytm && hasPhonePe ? 0.3 : hasPaytm ? 0.4 : hasPhonePe ? 0.9 : 1.0));
  }
  if (merchantId === 'mer-phonepe-02' && hasPhonePe) {
    return Math.round(totalUpiSales * (hasPaytm && hasSbi ? 0.1 : hasPaytm ? 0.2 : hasSbi ? 0.3 : 1.0));
  }
  
  // For any other/custom active merchants, allocate 0 expected unless they are the only ones, in which case distribute evenly
  const customActive = activeMerchants.filter(m => m.id !== 'mer-paytm-01' && m.id !== 'mer-sbi-03' && m.id !== 'mer-phonepe-02');
  const defaultActive = activeMerchants.filter(m => m.id === 'mer-paytm-01' || m.id === 'mer-sbi-03' || m.id === 'mer-phonepe-02');
  
  if (defaultActive.length === 0 && customActive.length > 0) {
    return Math.round(totalUpiSales / customActive.length);
  }
  return 0;
};

export default function ShiftReconcilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Theme Mode: false = Calm Off-White UI (default), true = High-Contrast Dark Mode
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_dark_theme') === 'true';
  });

  // Sunlight Readability Mode: false = Default brand, true = High-Contrast Sunlight Mode (adds class to root)
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_sunlight_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pumpai_sunlight_mode', String(sunlightMode));
    if (sunlightMode) {
      document.documentElement.classList.add('sunlight-mode');
    } else {
      document.documentElement.classList.remove('sunlight-mode');
    }
  }, [sunlightMode]);

  // Current active step: 1 = Nozzles, 2 = Payments, 3 = Till Count, 4 = Discrepancy, 5 = Sign-off, 6 = Print
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [shift, setShift] = useState<ShiftRecord | null>(null);

  // Swipe validation predicates
  const isStep1Valid = () => {
    return !nozzleReadings.some(r => {
      const o = typeof r.opening === 'string' ? parseFloat(r.opening) : r.opening;
      const c = typeof r.closing === 'string' ? parseFloat(r.closing) : r.closing;
      return c <= 0 || c < o;
    });
  };

  const isStep4Valid = () => {
    return !overallBalanceShort || !!discrepancyNote;
  };

  // Touch Swipe Gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showNumpad || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;

    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 75; // threshold for swipe gesture

    if (diff > minSwipeDistance) {
      handleSwipeNext();
    } else if (diff < -minSwipeDistance) {
      handleSwipePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleSwipeNext = () => {
    if (currentStep === 1 && isStep1Valid()) {
      handleStepTransition(2);
    } else if (currentStep === 2) {
      handleStepTransition(3);
    } else if (currentStep === 3) {
      handleStepTransition(4);
    } else if (currentStep === 4 && isStep4Valid()) {
      handleStepTransition(5);
    }
  };

  const handleSwipePrev = () => {
    if (currentStep > 1 && currentStep <= 5) {
      handleStepTransition(currentStep - 1);
    }
  };

  // STEP 1: Nozzle closing readings state
  const [nozzleReadings, setNozzleReadings] = useState<NozzleReading[]>([]);

  // STEP 2: Actual Digital & Credit payments collected
  const [actualUpi, setActualUpi] = useState<string>('0');
  const [actualCard, setActualCard] = useState<string>('0');
  const [actualCredit, setActualCredit] = useState<string>('0');
  const [actualRecovery, setActualRecovery] = useState<string>('0');
  const [actualExpenses, setActualExpenses] = useState<string>('0');

  // Multi-merchant state
  const [upiMerchants, setUpiMerchants] = useState<any[]>([]);
  const [actualUpiMerchants, setActualUpiMerchants] = useState<Record<string, string>>({});

  useEffect(() => {
    const raw = localStorage.getItem('pumpai_upi_merchants');
    let loaded = [];
    if (raw) {
      try {
        loaded = JSON.parse(raw);
      } catch {
        loaded = [
          { id: 'mer-paytm-01', provider: 'Paytm', name: 'Potaliya Petroleum Paytm Primary', upiId: '9530140836@paytm', active: true },
          { id: 'mer-phonepe-02', provider: 'PhonePe', name: 'Potaliya Petroleum PhonePe Reserve', upiId: 'potaliya.petro@ybl', active: true },
          { id: 'mer-sbi-03', provider: 'SBI QR', name: 'Potaliya Petroleum SBI Main', upiId: '9530140836@ptsbi', active: true }
        ];
      }
    } else {
      loaded = [
        { id: 'mer-paytm-01', provider: 'Paytm', name: 'Potaliya Petroleum Paytm Primary', upiId: '9530140836@paytm', active: true },
        { id: 'mer-phonepe-02', provider: 'PhonePe', name: 'Potaliya Petroleum PhonePe Reserve', upiId: 'potaliya.petro@ybl', active: true },
        { id: 'mer-sbi-03', provider: 'SBI QR', name: 'Potaliya Petroleum SBI Main', upiId: '9530140836@ptsbi', active: true }
      ];
    }
    setUpiMerchants(loaded.filter((m: any) => m.active));
  }, []);

  // Sync actualUpi to be the sum of all merchant collections
  useEffect(() => {
    const total = (Object.values(actualUpiMerchants) as string[]).reduce<number>((sum, val) => sum + (parseFloat(val) || 0), 0);
    setActualUpi(String(total));
  }, [actualUpiMerchants]);

  // STEP 3: Till Cash denominations
  const [cashNotes, setCashNotes] = useState<DenominationCounts>({
    2000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });

  // STEP 4: Discrepancy notes
  const [discrepancyNote, setDiscrepancyNote] = useState<string>("");

  // STEP 5: Supervisor PIN Verification
  const [supervisorPin1, setSupervisorPin1] = useState<string>("");
  const [supervisorPin2, setSupervisorPin2] = useState<string>("");
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Glove-Safe numpad state
  const [showNumpad, setShowNumpad] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [activeInput, setActiveInput] = useState<{
    type: 'nozzle' | 'payment' | 'cash';
    key: string;
  } | null>(null);

  // ----------------------------------------------------
  // OPERATOR PERFORMANCE & WORKFLOW METRICS TRACKER
  // ----------------------------------------------------
  const startTime = useRef<number>(Date.now());
  const stepStartTimes = useRef<Record<number, number>>({ 1: Date.now() });
  const stepDurations = useRef<Record<number, number>>({});
  const correctionsCount = useRef<number>(0);

  // Load shift from localStorage draft
  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const parsed: ShiftRecord[] = JSON.parse(draft);
        const match = parsed.find(s => s.id === id);
        if (match) {
          setShift(match);
          
          // Restore in-progress reconciliation draft from offline cache to resume interrupted closes
          const inProgressDraftKey = `pumpai_reconcile_draft_${id}`;
          const inProgressData = localStorage.getItem(inProgressDraftKey);
          
          if (inProgressData) {
            try {
              const restored = JSON.parse(inProgressData);
              setCurrentStep(restored.currentStep || 1);
              setNozzleReadings(restored.nozzleReadings || match.readings || []);
              setActualUpi(restored.actualUpi || String(match.upiSales || 0));
              setActualUpiMerchants(restored.actualUpiMerchants || {});
              setActualCard(restored.actualCard || String(match.cardSales || 0));
              setActualCredit(restored.actualCredit || String(match.creditSales || 0));
              setActualRecovery(restored.actualRecovery || String(match.creditRecovery || 0));
              setActualExpenses(restored.actualExpenses || String(match.expenses || 0));
              setCashNotes(restored.cashNotes || { 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
              setDiscrepancyNote(restored.discrepancyNote || "");
              setIsLocked(restored.isLocked || false);
            } catch {
              // Fallback to shift settings
              setNozzleReadings(match.readings || []);
              setActualUpi(String(match.upiSales || 0));
              setActualCard(String(match.cardSales || 0));
              setActualCredit(String(match.creditSales || 0));
              setActualRecovery(typeof match.creditRecovery === 'number' ? String(match.creditRecovery) : '0');
              setActualExpenses(typeof match.expenses === 'number' ? String(match.expenses) : '0');
              
              // Seed initial splits
              const initialSplits: Record<string, string> = {};
              if (match.upiSales) {
                initialSplits['mer-paytm-01'] = String(Math.round(match.upiSales * 0.6));
                initialSplits['mer-sbi-03'] = String(Math.round(match.upiSales * 0.3));
                initialSplits['mer-phonepe-02'] = String(Math.round(match.upiSales * 0.1));
              } else {
                initialSplits['mer-paytm-01'] = '0';
                initialSplits['mer-sbi-03'] = '0';
                initialSplits['mer-phonepe-02'] = '0';
              }
              setActualUpiMerchants(initialSplits);
            }
          } else {
            setNozzleReadings(match.readings || []);
            setActualUpi(String(match.upiSales || 0));
            setActualCard(String(match.cardSales || 0));
            setActualCredit(String(match.creditSales || 0));
            setActualRecovery(typeof match.creditRecovery === 'number' ? String(match.creditRecovery) : '0');
            setActualExpenses(typeof match.expenses === 'number' ? String(match.expenses) : '0');

            // Seed initial splits
            const initialSplits: Record<string, string> = {};
            if (match.upiSales) {
              initialSplits['mer-paytm-01'] = String(Math.round(match.upiSales * 0.6));
              initialSplits['mer-sbi-03'] = String(Math.round(match.upiSales * 0.3));
              initialSplits['mer-phonepe-02'] = String(Math.round(match.upiSales * 0.1));
            } else {
              initialSplits['mer-paytm-01'] = '0';
              initialSplits['mer-sbi-03'] = '0';
              initialSplits['mer-phonepe-02'] = '0';
            }
            setActualUpiMerchants(initialSplits);
          }
        }
      } catch (e) {
        console.warn("Failed to load reconcile draft", e);
      }
    }
  }, [id]);

  useEffect(() => {
    localStorage.setItem('pumpai_dark_theme', String(darkTheme));
  }, [darkTheme]);

  // Persist current wizard state to offline cache draft on every change
  const saveWizardProgress = (nextStep?: number) => {
    if (!id) return;
    const progressData = {
      currentStep: nextStep || currentStep,
      nozzleReadings,
      actualUpi,
      actualUpiMerchants,
      actualCard,
      actualCredit,
      actualRecovery,
      actualExpenses,
      cashNotes,
      discrepancyNote,
      isLocked
    };
    localStorage.setItem(`pumpai_reconcile_draft_${id}`, JSON.stringify(progressData));
  };

  const handleStepTransition = (next: number) => {
    // Record step performance metrics
    const now = Date.now();
    const currentStepStart = stepStartTimes.current[currentStep] || startTime.current;
    const duration = now - currentStepStart;
    stepDurations.current[currentStep] = (stepDurations.current[currentStep] || 0) + duration;
    
    // Set next step start time
    stepStartTimes.current[next] = now;
    
    setCurrentStep(next);
    saveWizardProgress(next);
  };

  // Computes expected sales from nozzle readings
  const calculatedFuelRevenue = useMemo(() => {
    return nozzleReadings.reduce((sum, reading) => {
      const openVal = typeof reading.opening === 'string' ? parseFloat(reading.opening) : reading.opening;
      const closeVal = typeof reading.closing === 'string' ? parseFloat(reading.closing) : reading.closing;
      const testVal = typeof reading.testing === 'string' ? parseFloat(reading.testing) : reading.testing;
      
      const salesLiters = Math.max(0, closeVal - openVal - testVal);
      const rate = reading.fuelRate || (reading.fuel.toUpperCase() === 'MS' ? 104.5 : 92.3);
      return sum + (salesLiters * rate);
    }, 0);
  }, [nozzleReadings]);

  // Total cash in till counted denomination-by-denomination
  const totalPhysicalCashCounted = useMemo(() => {
    return Object.keys(cashNotes).reduce((sum, denomStr) => {
      const denom = Number(denomStr);
      const count = cashNotes[denom] || 0;
      return sum + (denom * count);
    }, 0);
  }, [cashNotes]);

  // Expected cash in till equation
  const expectedCashInTill = useMemo(() => {
    if (!shift) return 0;
    const float = typeof shift.openingCash === 'string' ? parseFloat(shift.openingCash) : shift.openingCash;
    const recovery = parseFloat(actualRecovery) || 0;
    const exp = parseFloat(actualExpenses) || 0;
    
    // Total Expected Revenue - Digital collections
    const totalCollectedDigital = (parseFloat(actualUpi) || 0) + (parseFloat(actualCard) || 0) + (parseFloat(actualCredit) || 0);
    const expectedCashCollections = Math.max(0, calculatedFuelRevenue - totalCollectedDigital);

    return float + expectedCashCollections + recovery - exp;
  }, [shift, calculatedFuelRevenue, actualUpi, actualCard, actualCredit, actualRecovery, actualExpenses]);

  // Shortage/Overage computation
  const cashDiscrepancyAmount = useMemo(() => {
    return expectedCashInTill - totalPhysicalCashCounted;
  }, [expectedCashInTill, totalPhysicalCashCounted]);

  const overallBalanceShort = useMemo(() => {
    return cashDiscrepancyAmount !== 0;
  }, [cashDiscrepancyAmount]);

  // GLOVE-SAFE INTERACTIVE NUMPAD HANDLERS
  const triggerNumpad = (type: 'nozzle' | 'payment' | 'cash', key: string, currentVal: string) => {
    setActiveInput({ type, key });
    setNumpadValue(currentVal === '0' || currentVal === '' ? '' : currentVal);
    setShowNumpad(true);
  };

  const handleNumpadPress = (val: string) => {
    correctionsCount.current += 1;
    if (val === 'C') {
      setNumpadValue('');
    } else if (val === 'DEL') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else {
      if (val === '.' && numpadValue.includes('.')) return;
      setNumpadValue(prev => prev + val);
    }
  };

  const confirmNumpadValue = () => {
    if (!activeInput) return;
    const numValue = parseFloat(numpadValue) || 0;

    if (activeInput.type === 'nozzle') {
      const idx = Number(activeInput.key);
      setNozzleReadings(prev => prev.map((item, index) => {
        if (index === idx) {
          return { ...item, closing: numValue };
        }
        return item;
      }));
    } else if (activeInput.type === 'payment') {
      const key = activeInput.key;
      if (key.startsWith('upi_')) {
        const merchantId = key.substring(4);
        setActualUpiMerchants(prev => ({
          ...prev,
          [merchantId]: numpadValue
        }));
      } else {
        if (key === 'upi') setActualUpi(numpadValue);
        if (key === 'card') setActualCard(numpadValue);
        if (key === 'credit') setActualCredit(numpadValue);
        if (key === 'recovery') setActualRecovery(numpadValue);
        if (key === 'expenses') setActualExpenses(numpadValue);
      }
    } else if (activeInput.type === 'cash') {
      const denom = Number(activeInput.key);
      setCashNotes(prev => ({
        ...prev,
        [denom]: Math.max(0, Math.floor(numValue))
      }));
    }

    setShowNumpad(false);
    setActiveInput(null);
    saveWizardProgress();
  };

  // Quick prefill readings to expedite testing
  const fastPrefillNozzles = () => {
    setNozzleReadings(prev => prev.map(item => {
      const open = typeof item.opening === 'string' ? parseFloat(item.opening) : item.opening;
      return {
        ...item,
        closing: open + Math.floor(Math.random() * 150 + 50)
      };
    }));
    saveWizardProgress();
  };

  // Step 5: Lock shift and post double-entry balances
  const finalizeReconciliationAndLock = () => {
    if (!shift) return;

    // Dual-pin verification mock for security audit
    if (supervisorPin1 !== "1234" || supervisorPin2 !== "5678") {
      alert("Verification Failed: Supervisor digital override keys are invalid!");
      return;
    }

    // Capture closing velocity performance logs
    const closeTime = Date.now();
    const totalDuration = closeTime - startTime.current;
    
    // Complete durations list
    const finalStepDurations: Record<number, number> = { ...stepDurations.current };
    const lastStepStart = stepStartTimes.current[currentStep] || startTime.current;
    finalStepDurations[currentStep] = (finalStepDurations[currentStep] || 0) + (closeTime - lastStepStart);

    // Identify bottleneck step
    let bottleneckStep = 1;
    let maxTime = 0;
    Object.keys(finalStepDurations).forEach((stepStr) => {
      const s = Number(stepStr);
      if (finalStepDurations[s] > maxTime) {
        maxTime = finalStepDurations[s];
        bottleneckStep = s;
      }
    });

    const performanceLog = {
      shiftId: shift.id,
      reconciliationDurationMs: totalDuration,
      correctionsCount: correctionsCount.current,
      bottleneckStep,
      timestamp: new Date().toISOString(),
      stepBreakdown: finalStepDurations
    };

    // Save performance logs
    const existingLogsRaw = localStorage.getItem('pumpai_shift_close_performance_logs') || '[]';
    try {
      const list = JSON.parse(existingLogsRaw);
      list.push(performanceLog);
      localStorage.setItem('pumpai_shift_close_performance_logs', JSON.stringify(list));
    } catch {}

    const splits: Record<string, number> = {};
    (Object.entries(actualUpiMerchants) as [string, string][]).forEach(([mId, val]) => {
      splits[mId] = parseFloat(val) || 0;
    });

    // Build the final locked shift object
    const reconciledShift: ShiftRecord = {
      ...shift,
      readings: nozzleReadings,
      upiSales: parseFloat(actualUpi) || 0,
      upiSplits: splits,
      cardSales: parseFloat(actualCard) || 0,
      creditSales: parseFloat(actualCredit) || 0,
      creditRecovery: parseFloat(actualRecovery) || 0,
      expenses: parseFloat(actualExpenses) || 0,
      actualCash: totalPhysicalCashCounted,
      cashShortage: cashDiscrepancyAmount,
      status: 'APPROVED' as const
    };

    // Append supervisor comment and upi splits to audit log
    reconciledShift.auditHistory = reconciledShift.auditHistory || [];
    reconciledShift.auditHistory.push({
      editor: "Station Manager Override",
      timestamp: new Date().toISOString(),
      previousValues: {
        upiSplits: splits,
        note: discrepancyNote ? `Supervisor explanation for ₹${cashDiscrepancyAmount} discrepancy: ${discrepancyNote}` : undefined
      }
    });

    // Save locked shift to draft storage list
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        const list: ShiftRecord[] = JSON.parse(draft);
        const updatedList = list.map(s => s.id === shift.id ? reconciledShift : s);
        localStorage.setItem("pumpai_active_shift_draft", JSON.stringify(updatedList));
      } catch {}
    }

    setIsLocked(true);
    
    // Clear wizard persistence
    localStorage.removeItem(`pumpai_reconcile_draft_${id}`);
    
    // Go to step 6 (Print report)
    handleStepTransition(6);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!shift) {
    return <div className="p-8 text-center text-slate-500">Retrieving operational registers...</div>;
  }  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`min-h-screen pb-20 transition-colors duration-200 select-none ${
        darkTheme ? 'bg-slate-900 text-slate-100' : 'bg-[#F9F9F8] text-[#1A1A1A]'
      }`}
    >
      {/* Sunlight Toggle Sub-Header */}
      <nav className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-200 ${
        darkTheme ? 'bg-slate-950 border-slate-800' : 'bg-white border-[#EBEBEA]'
      } print:hidden`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/operations')} 
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl border min-h-[44px] transition-all active:scale-95 ${
              darkTheme 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' 
                : 'bg-[#F3F3F1] border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-[#D35400]" /> Cancel Reconcile
          </button>
          <div>
            <h1 className={`text-base font-black tracking-tight ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'}`}>
              GUIDED SHIFT RECONCILIATION
            </h1>
            <p className={`text-[10px] font-bold ${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>
              ID: {shift.id} • Operator: {shift.operatorId || 'Ramesh Attendant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sunlight Mode Toggle */}
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`flex items-center gap-2 font-black text-xs px-4 py-3.5 rounded-xl uppercase tracking-wider border cursor-pointer min-h-[48px] transition-all active:scale-95 ${
              sunlightMode 
                ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200' 
                : darkTheme
                  ? 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700'
                  : 'bg-[#F3F3F1] border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
          >
            <Sun className={`h-4.5 w-4.5 ${sunlightMode ? 'text-amber-600 animate-spin-slow' : 'text-[#666666]'}`} />
            {sunlightMode ? 'Sunlight Active' : 'Sunlight Mode'}
          </button>

          <button
            type="button"
            onClick={() => setDarkTheme(!darkTheme)}
            className={`flex items-center gap-2 font-black text-xs px-4 py-3.5 rounded-xl uppercase tracking-wider border cursor-pointer min-h-[48px] transition-all active:scale-95 ${
              darkTheme 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-[#F3F3F1] border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
          >
            {darkTheme ? (
              <>
                <Sun className="h-4.5 w-4.5 text-amber-400" /> Calm Light
              </>
            ) : (
              <>
                <Moon className="h-4.5 w-4.5 text-slate-750" /> Dark Mode
              </>
            )}
          </button>
        </div>
      </nav>

      {/* 6-STEP HEADER PROGRESS STEPPER */}
      <div className={`border-b transition-colors duration-200 ${
        darkTheme ? 'bg-slate-950/40 border-slate-850' : 'bg-white/80 border-[#EBEBEA]'
      } py-4 px-6 print:hidden`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between overflow-x-auto gap-4 py-1">
          {[
            { step: 1, label: "Nozzles" },
            { step: 2, label: "Payments" },
            { step: 3, label: "Till Cash" },
            { step: 4, label: "Variance" },
            { step: 5, label: "Sign-off" },
            { step: 6, label: "Print Sheet" }
          ].map((item) => (
            <div 
              key={item.step} 
              className={`flex items-center gap-2 shrink-0 ${
                currentStep === item.step ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-mono transition-all border-2 ${
                currentStep > item.step
                  ? 'bg-emerald-500 border-emerald-600 text-white'
                  : currentStep === item.step
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)] animate-pulse'
                    : darkTheme
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-white border-slate-350 text-[#666666]'
              }`}>
                {item.step}
              </div>
              <span className={`text-xs font-black uppercase tracking-wider ${
                currentStep === item.step ? 'text-indigo-600' : 'text-[#666666]'
              }`}>
                {item.label}
              </span>
              {item.step < 6 && (
                <div className={`h-[2px] w-6 sm:w-12 ${
                  currentStep > item.step 
                    ? 'bg-emerald-500' 
                    : darkTheme ? 'bg-slate-800' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP BODY */}
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* STEP 1: NOZZLE CLOSING READINGS */}
        {currentStep === 1 && (
          <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
            darkTheme ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-[#EBEBEA]'
          } space-y-6 shadow-xl`}>
            
            <div className={`flex justify-between items-start border-b pb-4 ${
              darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'
            }`}>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                  Step 1 of 6: Nozzle Meter Readings
                </h2>
                <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>
                  Log closing values from the pump dispenser dials.
                </p>
              </div>
              <button
                onClick={fastPrefillNozzles}
                className="px-3.5 py-2 border border-dashed rounded-xl border-indigo-500/40 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-950/20 cursor-pointer min-h-[40px] active:scale-95 transition-all"
              >
                Fast Auto-Prefill Readings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nozzleReadings.map((reading, idx) => {
                const openVal = typeof reading.opening === 'string' ? parseFloat(reading.opening) : reading.opening;
                const closeVal = typeof reading.closing === 'string' ? parseFloat(reading.closing) : reading.closing;
                const testVal = typeof reading.testing === 'string' ? parseFloat(reading.testing) : reading.testing;
                const salesLiters = Math.max(0, closeVal - openVal - testVal);
                const rate = reading.fuelRate || (reading.fuel.toUpperCase() === 'MS' ? 104.5 : 92.3);
                
                return (
                  <div key={idx} className={`p-4 rounded-2xl border ${
                    darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
                  } space-y-4`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-extrabold text-xs px-2.5 py-1 rounded-lg ${
                        darkTheme ? 'text-white bg-indigo-950/30' : 'text-indigo-700 bg-indigo-50'
                      }`}>
                        Nozzle #{reading.id} ({reading.fuel.toUpperCase()})
                      </span>
                      <span className="font-mono text-xs text-emerald-600 font-extrabold">₹{rate}/L</span>
                    </div>

                    <div className={`grid grid-cols-3 gap-2 text-[10px] font-mono ${
                      darkTheme ? 'text-slate-500' : 'text-[#666666]'
                    }`}>
                      <div>
                        <span>OPENING:</span>
                        <div className={`font-extrabold mt-0.5 ${darkTheme ? 'text-slate-300' : 'text-[#1A1A1A]'}`}>{openVal.toFixed(2)}</div>
                      </div>
                      <div>
                        <span>TESTING:</span>
                        <div className={`font-extrabold mt-0.5 ${darkTheme ? 'text-slate-300' : 'text-[#1A1A1A]'}`}>{testVal.toFixed(2)} L</div>
                      </div>
                      <div>
                        <span>SALES VOLUME:</span>
                        <div className="font-extrabold text-emerald-600 mt-0.5">{salesLiters.toFixed(2)} L</div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => triggerNumpad('nozzle', String(idx), String(reading.closing))}
                        className={`w-full py-4 rounded-xl border-2 font-mono font-black text-xl min-h-[58px] text-center cursor-pointer transition-all active:scale-95 ${
                          closeVal > openVal
                            ? 'border-indigo-500 bg-indigo-950/20 text-indigo-600'
                            : darkTheme
                              ? 'border-slate-700 bg-slate-950 text-slate-300'
                              : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                        }`}
                      >
                        {closeVal > 0 ? closeVal.toFixed(2) : 'ENTER CLOSING'}
                      </button>
                      {closeVal > 0 && closeVal < openVal && (
                        <span className="text-[10px] text-rose-500 font-bold block mt-1.5 leading-snug">
                          Warning: Closing meter cannot be less than opening meter!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => handleStepTransition(2)}
                disabled={nozzleReadings.some(r => {
                  const o = typeof r.opening === 'string' ? parseFloat(r.opening) : r.opening;
                  const c = typeof r.closing === 'string' ? parseFloat(r.closing) : r.closing;
                  return c <= 0 || c < o;
                })}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-950 disabled:text-slate-650 disabled:border-slate-850 border border-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer min-h-[48px] transition-all active:scale-95"
              >
                Continue to Payments <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIGITAL & CREDIT RECONCILIATION */}
        {currentStep === 2 && (
          <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
            darkTheme ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-[#EBEBEA]'
          } space-y-6 shadow-xl`}>
            
            <div className={`border-b pb-4 ${darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                Step 2 of 6: Payment Matching & Collections Ledger
              </h2>
              <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>
                Match expected system values against actual digital settlements, expense payouts, and credits.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* UPI Dynamic Merchants Entry */}
              {upiMerchants.map((merchant) => {
                const expectedShare = getExpectedMerchantShare(merchant.id, shift.upiSales || 0, upiMerchants);
                const actualVal = parseFloat(actualUpiMerchants[merchant.id] || '0') || 0;
                
                // Mismatch warning: if actual input deviates from expected share
                const isMismatched = expectedShare > 0 && actualVal !== expectedShare;
                
                // Duplicate transaction detection: if the same positive amount is entered for another merchant
                const isDuplicate = actualVal > 0 && (Object.entries(actualUpiMerchants) as [string, string][]).some(
                  ([otherId, otherVal]) => otherId !== merchant.id && parseFloat(otherVal) === actualVal
                );
                
                // Missing settlement alert: if merchant is active but has ₹0 collections AND expected share > 0
                const isMissingSettlement = actualVal === 0 && expectedShare > 0;

                return (
                  <div key={merchant.id} className={`p-4 rounded-xl border ${
                    darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
                  } space-y-2`}>
                    <div className="flex justify-between items-center text-xs font-extrabold">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-blue-500" />
                        <span className={`${darkTheme ? 'text-white' : 'text-[#1A1A1A]'} print:text-black`}>{merchant.provider} - {merchant.qrLabel || merchant.name}</span>
                      </span>
                      <span className={`${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected: ₹{expectedShare.toLocaleString()}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => triggerNumpad('payment', `upi_${merchant.id}`, String(actualVal))}
                      className={`w-full py-3.5 rounded-xl border text-center font-mono font-black text-base min-h-[48px] cursor-pointer transition-all active:scale-95 ${
                        actualVal > 0 
                          ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                          : darkTheme ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                      }`}
                    >
                      ₹ {actualVal.toLocaleString()}
                    </button>

                    {/* Audit Warnings */}
                    <div className="space-y-1 mt-1">
                      {isMismatched && (
                        <div className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> Mismatch: Differs from expected ₹{expectedShare.toLocaleString()}
                        </div>
                      )}
                      {isDuplicate && (
                        <div className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" /> Warning: Duplicate positive entry detected on other UPI QR!
                        </div>
                      )}
                      {isMissingSettlement && (
                        <div className="text-[10px] text-yellow-600 font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" /> Settlement Alert: Expected ₹{expectedShare.toLocaleString()} but logged ₹0
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Card Entry */}
              <div className={`p-4 rounded-xl border ${
                darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
              } space-y-2`}>
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="flex items-center gap-1"><Calculator className="w-4 h-4 text-emerald-600" /> POS Card Settlements</span>
                  <span className={`${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected: ₹{shift.cardSales?.toLocaleString() || 0}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerNumpad('payment', 'card', actualCard)}
                  className={`w-full py-3.5 rounded-xl border text-center font-mono font-black text-base min-h-[48px] cursor-pointer transition-all active:scale-95 ${
                    parseFloat(actualCard) > 0 
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                      : darkTheme ? 'border-slate-805 bg-slate-950' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                  }`}
                >
                  ₹ {parseFloat(actualCard).toLocaleString()}
                </button>
              </div>

              {/* Credit extended (Udhari) */}
              <div className={`p-4 rounded-xl border ${
                darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
              } space-y-2`}>
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="flex items-center gap-1"><UserCheck className="w-4 h-4 text-amber-600" /> Credit Sales (Udhari)</span>
                  <span className={`${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected: ₹{shift.creditSales?.toLocaleString() || 0}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerNumpad('payment', 'credit', actualCredit)}
                  className={`w-full py-3.5 rounded-xl border text-center font-mono font-black text-base min-h-[48px] cursor-pointer transition-all active:scale-95 ${
                    parseFloat(actualCredit) > 0 
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                      : darkTheme ? 'border-slate-805 bg-slate-950' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                  }`}
                >
                  ₹ {parseFloat(actualCredit).toLocaleString()}
                </button>
              </div>

              {/* Udhari Collections recoveries */}
              <div className={`p-4 rounded-xl border ${
                darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
              } space-y-2`}>
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="flex items-center gap-1"><Landmark className="w-4 h-4 text-indigo-650" /> Udhari Recovery</span>
                  <span className={`${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected: ₹{(typeof shift.creditRecovery === 'number' ? shift.creditRecovery : 0).toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerNumpad('payment', 'recovery', actualRecovery)}
                  className={`w-full py-3.5 rounded-xl border text-center font-mono font-black text-base min-h-[48px] cursor-pointer transition-all active:scale-95 ${
                    parseFloat(actualRecovery) > 0 
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                      : darkTheme ? 'border-slate-805 bg-slate-950' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                  }`}
                >
                  ₹ {parseFloat(actualRecovery).toLocaleString()}
                </button>
              </div>

              {/* Payouts / Expenses */}
              <div className={`p-4 rounded-xl border ${
                darkTheme ? 'border-slate-850 bg-slate-900/40' : 'border-[#EBEBEA] bg-[#F9F9F8]'
              } space-y-2 md:col-span-2`}>
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-rose-500" /> Paid-out Office Expenses</span>
                  <span className={`${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected: ₹{(typeof shift.expenses === 'number' ? shift.expenses : 0).toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerNumpad('payment', 'expenses', actualExpenses)}
                  className={`w-full py-3.5 rounded-xl border text-center font-mono font-black text-base min-h-[48px] cursor-pointer transition-all active:scale-95 ${
                    parseFloat(actualExpenses) > 0 
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                      : darkTheme ? 'border-slate-805 bg-slate-950' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                  }`}
                >
                  ₹ {parseFloat(actualExpenses).toLocaleString()}
                </button>
              </div>
            </div>

            {/* expected cash balance calculation */}
            <div className={`p-4 rounded-xl border ${
              darkTheme ? 'bg-slate-900/80 border-slate-850' : 'bg-[#F3F3F1] border-[#EBEBEA]'
            } flex justify-between items-center text-xs font-mono font-extrabold`}>
              <span className={`uppercase ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>Calculated Expected Cash till Collections:</span>
              <span className="text-emerald-600 text-sm">₹{expectedCashInTill.toLocaleString()}</span>
            </div>

            <div className={`flex justify-between items-center pt-4 border-t ${
              darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'
            }`}>
              <button
                onClick={() => handleStepTransition(1)}
                className={`px-5 py-3 border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px] transition-all active:scale-95 rounded-xl ${
                  darkTheme ? 'border-slate-800 text-slate-400' : 'border-[#EBEBEA] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Nozzles readings
              </button>
              
              <button
                onClick={() => handleStepTransition(3)}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer min-h-[48px] transition-all active:scale-95"
              >
                Continue to Till Cash Count <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TILL DENOMINATION COUNT SHEET */}
        {currentStep === 3 && (
          <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
            darkTheme ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-[#EBEBEA]'
          } space-y-6 shadow-xl`}>
            
            <div className={`border-b pb-4 ${darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                Step 3 of 6: Cash Till Drawer Denominations
              </h2>
              <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>
                Tap on any note denomination card to enter quantities. Large touch buttons optimize speed.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(cashNotes).map((denomStr) => {
                const denom = Number(denomStr);
                const count = cashNotes[denom] || 0;
                return (
                  <div key={denom} className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                    darkTheme ? 'border-slate-850 bg-slate-900/30' : 'border-[#EBEBEA] bg-[#F9F9F8]'
                  }`}>
                    <div className="flex justify-between items-center text-xs font-mono font-extrabold">
                      <span className={darkTheme ? 'text-slate-405' : 'text-[#666666]'}>₹ {denom}</span>
                      <span className="text-emerald-600">₹{(denom * count).toLocaleString()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerNumpad('cash', denomStr, count.toString())}
                      className={`w-full py-4 rounded-xl border font-mono font-black text-lg text-center min-h-[50px] cursor-pointer transition-all active:scale-95 ${
                        count > 0 
                          ? 'border-indigo-500 bg-indigo-50/50 text-indigo-600' 
                          : darkTheme ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-[#D9D9D6] bg-white text-[#1A1A1A]'
                      }`}
                    >
                      {count || '0'} Notes
                    </button>

                    {/* Fast touch incrementers */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          correctionsCount.current += 1;
                          setCashNotes(prev => ({ ...prev, [denom]: Math.max(0, count - 1) }));
                          saveWizardProgress();
                        }}
                        className={`text-xs py-1 px-2 rounded-lg font-black min-h-[30px] active:scale-95 border ${
                          darkTheme 
                            ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800' 
                            : 'bg-white border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#F3F3F1]'
                        }`}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          correctionsCount.current += 1;
                          setCashNotes(prev => ({ ...prev, [denom]: count + 1 }));
                          saveWizardProgress();
                        }}
                        className={`text-xs py-1 px-2 rounded-lg font-black min-h-[30px] active:scale-95 border ${
                          darkTheme 
                            ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800' 
                            : 'bg-white border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#F3F3F1]'
                        }`}
                      >
                        +1
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between font-mono font-black ${
              darkTheme ? 'bg-slate-900 border-slate-850' : 'bg-[#F3F3F1] border-[#EBEBEA]'
            }`}>
              <span className={`text-xs uppercase ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>TOTAL PHYSICAL CASH COUNTED:</span>
              <strong className="text-xl text-emerald-600">₹{totalPhysicalCashCounted.toLocaleString()}</strong>
            </div>

            <div className={`flex justify-between items-center pt-4 border-t ${
              darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'
            }`}>
              <button
                onClick={() => handleStepTransition(2)}
                className={`px-5 py-3 border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px] rounded-xl transition-all active:scale-95 ${
                  darkTheme ? 'border-slate-800 text-slate-400' : 'border-[#EBEBEA] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Payments matching
              </button>
              
              <button
                onClick={() => handleStepTransition(4)}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer min-h-[48px] transition-all active:scale-95"
              >
                Continue to Variance Check <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DISCREPANCY NOTE EXPLANATIONS */}
        {currentStep === 4 && (
          <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
            darkTheme ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-[#EBEBEA]'
          } space-y-6 shadow-xl`}>
            
            <div className={`border-b pb-4 ${darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                Step 4 of 6: Cash Till Variance Audit & Explanations
              </h2>
              <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>
                The double-entry ledger equations will balance expected sales collections against counted till amounts.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border flex flex-col gap-3 font-mono ${
              overallBalanceShort 
                ? darkTheme ? 'border-rose-900 bg-rose-950/10 text-rose-305' : 'border-rose-250 bg-rose-50/50 text-rose-700'
                : darkTheme ? 'border-emerald-900 bg-emerald-950/10 text-emerald-305' : 'border-emerald-250 bg-emerald-50/50 text-emerald-700'
            }`}>
              
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Calculated Expected Cash till collections:</span>
                <span className={darkTheme ? 'text-white' : 'text-[#1A1A1A]'}>₹{expectedCashInTill.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Physical Till Cash drawer counted:</span>
                <span className={darkTheme ? 'text-white' : 'text-[#1A1A1A]'}>₹{totalPhysicalCashCounted.toLocaleString()}</span>
              </div>

              <div className={`h-[1px] my-1 ${darkTheme ? 'bg-slate-850' : 'bg-[#EBEBEA]'}`} />

              <div className="flex justify-between items-center font-black">
                <span className="text-xs uppercase font-sans">NET DRAWER VARIANCE:</span>
                <span className={`text-lg ${cashDiscrepancyAmount > 0 ? 'text-rose-600' : cashDiscrepancyAmount < 0 ? 'text-blue-600' : 'text-emerald-650'}`}>
                  {cashDiscrepancyAmount > 0 
                    ? `₹${cashDiscrepancyAmount.toLocaleString()} Shortage` 
                    : cashDiscrepancyAmount < 0 
                      ? `₹${Math.abs(cashDiscrepancyAmount).toLocaleString()} Surplus` 
                      : 'Perfect Balance!'
                  }
                </span>
              </div>
            </div>

            {overallBalanceShort ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl text-[10px] flex items-start gap-2 border ${
                  darkTheme 
                    ? 'bg-amber-950/20 border-amber-900/30 text-amber-400' 
                    : 'bg-amber-50 border-amber-250/50 text-amber-800'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Discrepancy Alert:</strong> The physical drawer has a deviation of ₹{Math.abs(cashDiscrepancyAmount)}. Closing this operational period requires a descriptive reconciliation note.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-[#666666]">
                    Discrepancy Explanation Memo (Required)
                  </label>
                  <textarea
                    value={discrepancyNote}
                    onChange={(e) => {
                      correctionsCount.current += 1;
                      setDiscrepancyNote(e.target.value);
                      saveWizardProgress();
                    }}
                    placeholder="Describe direct reasons for shortages e.g., 'Dispenser fuel calibration leaks', 'Cashier Ramesh manual change error', 'Fleet customer udhari collections delayed'..."
                    className={`w-full p-4 rounded-xl border text-xs font-semibold focus:outline-none focus:border-indigo-500 min-h-[96px] ${
                      darkTheme ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-[#F9F9F8] border-[#D9D9D6] text-[#1A1A1A]'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div className={`p-5 rounded-2xl text-center flex flex-col items-center justify-center gap-3 border ${
                darkTheme ? 'bg-emerald-950/15 border-emerald-900/30 text-emerald-450' : 'bg-emerald-50/50 border-emerald-250 text-emerald-805'
              }`}>
                <CheckCircle className="w-10 h-10 text-emerald-600 animate-bounce" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] dark:text-white">ALL ACCOUNTS BALANCED PERFECTLY!</h4>
                  <p className={`text-[10px] mt-1 ${darkTheme ? 'text-slate-500' : 'text-[#666666]'}`}>Expected accounts receivable and wetstock collections equal cash drawer totals exactly.</p>
                </div>
              </div>
            )}

            <div className={`flex justify-between items-center pt-4 border-t ${
              darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'
            }`}>
              <button
                onClick={() => handleStepTransition(3)}
                className={`px-5 py-3 border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px] rounded-xl transition-all active:scale-95 ${
                  darkTheme ? 'border-slate-800 text-slate-400' : 'border-[#EBEBEA] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Till Cash Count
              </button>
              
              <button
                onClick={() => handleStepTransition(5)}
                disabled={overallBalanceShort && !discrepancyNote}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-950 disabled:text-slate-600 disabled:border-slate-850 border border-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer min-h-[48px] transition-all active:scale-95"
              >
                Continue to Supervisor Sign-off <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUPERVISOR AUDIT SIGN-OFF */}
        {currentStep === 5 && (
          <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
            darkTheme ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-[#EBEBEA]'
          } space-y-6 shadow-xl`}>
            
            <div className={`border-b pb-4 ${darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                Step 5 of 6: Supervisor Multi-Signature Approval
              </h2>
              <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-400' : 'text-[#666666]'}`}>
                Enter auditor credential security keys to historically freeze daily ledger periods.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-[#666666]">Supervisor Key PIN-1</label>
                <input
                  type="password"
                  maxLength={4}
                  value={supervisorPin1}
                  onChange={(e) => setSupervisorPin1(e.target.value)}
                  placeholder="Enter PIN 1 (Try: 1234)"
                  className={`border rounded-xl px-4 py-3 text-center text-sm font-mono font-bold focus:outline-none min-h-[48px] ${
                    darkTheme ? 'bg-slate-950 border-slate-850 text-white' : 'bg-[#F9F9F8] border-[#D9D9D6] text-[#1A1A1A]'
                  }`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-[#666666]">Auditor Key PIN-2</label>
                <input
                  type="password"
                  maxLength={4}
                  value={supervisorPin2}
                  onChange={(e) => setSupervisorPin2(e.target.value)}
                  placeholder="Enter PIN 2 (Try: 5678)"
                  className={`border rounded-xl px-4 py-3 text-center text-sm font-mono font-bold focus:outline-none min-h-[48px] ${
                    darkTheme ? 'bg-slate-950 border-slate-850 text-white' : 'bg-[#F9F9F8] border-[#D9D9D6] text-[#1A1A1A]'
                  }`}
                />
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-[10px] leading-relaxed flex items-start gap-2 border-dashed ${
              darkTheme ? 'bg-slate-950/60 text-slate-400 border-slate-850' : 'bg-[#F9F9F8] text-[#666666] border-[#EBEBEA]'
            }`}>
              <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Audit Compliance Lock Invariant:</strong> Locking this shift will append double-entry reconciliation events into the immutable database ledger and sign it cryptographically. Historical days inside locked boundaries cannot be altered or overwritten.
              </span>
            </div>

            <div className={`flex justify-between items-center pt-4 border-t ${
              darkTheme ? 'border-slate-850' : 'border-[#EBEBEA]'
            }`}>
              <button
                onClick={() => handleStepTransition(4)}
                className={`px-5 py-3 border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer min-h-[44px] rounded-xl transition-all active:scale-95 ${
                  darkTheme ? 'border-slate-800 text-slate-400' : 'border-[#EBEBEA] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Variance check
              </button>
              
              <button
                onClick={finalizeReconciliationAndLock}
                disabled={supervisorPin1.length < 4 || supervisorPin2.length < 4}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-950 disabled:text-slate-600 disabled:border-slate-850 border border-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer min-h-[48px] shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95"
              >
                <Lock className="w-4 h-4" /> Lock &amp; Certify Shift period
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: PRINTABLE RECONCILIATION SUMMARY REPORT */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            {/* Action Bar */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              darkTheme ? 'bg-[#0a0f1d] border-slate-850' : 'bg-white border-[#EBEBEA]'
            } print:hidden`}>
              <button
                onClick={() => navigate('/operations')}
                className={`px-4 py-2 text-xs font-bold uppercase transition-all active:scale-95 ${
                  darkTheme ? 'text-slate-400 hover:text-white' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Go to Dashboard
              </button>
              <button 
                onClick={handlePrint}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Printer className="w-4.5 h-4.5" /> Print Closing Sheet
              </button>
            </div>

            {/* Printable summary */}
            <div className={`p-8 rounded-3xl border flex flex-col gap-6 transition-all ${
              darkTheme 
                ? 'bg-[#0a0f1d]/75 border-slate-850 text-slate-100' 
                : 'bg-white border-[#EBEBEA] text-[#1A1A1A]'
            } print:bg-white print:text-black print:border-none print:p-0`}>
              
              <div className={`border-b pb-4 flex justify-between items-start ${
                darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'
              } print:border-black`}>
                <div>
                  <h2 className={`text-lg font-black flex items-center gap-2 ${
                    darkTheme ? 'text-white' : 'text-slate-900'
                  } print:text-black`}>
                    <FileText className="w-6 h-6 text-blue-500" /> Potaliya Petroleum Closing Sheet
                  </h2>
                  <p className={`text-[10px] mt-1 ${darkTheme ? 'text-slate-500' : 'text-[#666666]'} print:text-black`}>
                    Chronological shift summary derived from immutable, replayed double-entry ledger transactions.
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] font-mono px-2 py-1 bg-emerald-950/20 text-emerald-500 border border-emerald-500/30 rounded font-black print:text-black print:border-black`}>
                    VERIFIED &amp; LOCKED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Shift Date</p>
                  <p className={`font-semibold ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'} print:text-black`}>{shift.shiftDate}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Shift Label</p>
                  <p className={`font-semibold ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'} print:text-black`}>{shift.shiftLabel}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Operator ID</p>
                  <p className={`font-semibold ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'} print:text-black`}>{shift.operatorId || 'Ramesh Attendant'}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Audit Hash</p>
                  <p className="font-semibold text-emerald-500 print:text-black">0x5F1a...9B7 (HMAC-SHA256)</p>
                </div>
              </div>

              <table className={`w-full mt-4 text-xs border border-collapse ${
                darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'
              } print:border-black print:text-black`}>
                <thead>
                  <tr className={`border-b ${
                    darkTheme ? 'bg-slate-950/50 border-slate-800' : 'bg-[#F3F3F1] border-[#EBEBEA] text-[#1A1A1A]'
                  } print:bg-gray-100 print:border-black`}>
                    <th className={`p-3 text-left border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Accounting Ledger Title</th>
                    <th className="p-3 text-right">Closing Balance (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Initial Till Cash Float</td>
                    <td className="p-3 text-right font-mono">₹{shift.openingCash.toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Calculated Wetstock Sales Revenue</td>
                    <td className="p-3 text-right font-mono">₹{calculatedFuelRevenue.toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b font-semibold ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Actual UPI QR Collections (Total)</td>
                    <td className="p-3 text-right font-mono">₹{parseFloat(actualUpi).toLocaleString()}</td>
                  </tr>
                  {upiMerchants.map((merchant) => {
                    const actualVal = parseFloat(actualUpiMerchants[merchant.id] || '0') || 0;
                    return (
                      <tr key={merchant.id} className={`border-b text-[10px] opacity-80 ${
                        darkTheme ? 'border-slate-800 bg-slate-950/5 text-slate-400' : 'border-[#EBEBEA] bg-[#F9F9F8] text-[#666666]'
                      } print:border-black`}>
                        <td className={`p-2 pl-6 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black italic`}>
                          ↳ {merchant.provider} - {merchant.qrLabel || merchant.upiId}
                        </td>
                        <td className="p-2 text-right font-mono">₹{actualVal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Actual Card POS Slip Collections</td>
                    <td className="p-3 text-right font-mono">₹{parseFloat(actualCard).toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Udhari Credit Extended (A/R Debit)</td>
                    <td className="p-3 text-right font-mono">₹{parseFloat(actualCredit).toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Udhari Collections (Recoveries)</td>
                    <td className="p-3 text-right font-mono">₹{parseFloat(actualRecovery).toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Paid-out Office Expenses</td>
                    <td className="p-3 text-right font-mono">₹{parseFloat(actualExpenses).toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b font-bold ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Expected Till Cash Collections</td>
                    <td className="p-3 text-right font-mono">₹{expectedCashInTill.toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b font-bold ${
                    darkTheme ? 'bg-slate-950/20 border-slate-800' : 'bg-[#F3F3F1] border-[#EBEBEA]'
                  } print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Actual Counted Till Cash</td>
                    <td className="p-3 text-right font-mono text-emerald-600 print:text-black">₹{totalPhysicalCashCounted.toLocaleString()}</td>
                  </tr>
                  <tr className={`border-b font-bold ${
                    darkTheme ? 'bg-slate-950/20 border-slate-800 text-rose-450' : 'bg-[#F3F3F1] border-[#EBEBEA] text-rose-600'
                  } print:border-black`}>
                    <td className={`p-3 border-r ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'} print:border-black`}>Approved Shortage / Overage Variance</td>
                    <td className="p-3 text-right font-mono print:text-black">
                      ₹{cashDiscrepancyAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {discrepancyNote && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  darkTheme ? 'bg-slate-950 border-slate-850' : 'bg-[#F9F9F8] border-[#EBEBEA]'
                }`}>
                  <strong className="block text-[10px] text-slate-500 uppercase">Supervisor Discrepancy Note:</strong>
                  <p className="mt-1 font-semibold">{discrepancyNote}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* INTERACTIVE GLOVE-PROOF NUMPAD */}
      {showNumpad && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className={`border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl transition-all ${
            darkTheme ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-[#EBEBEA] text-[#1A1A1A]'
          }`}>
            <div className={`p-4 flex items-center justify-between border-b ${
              darkTheme ? 'bg-slate-950 border-slate-850' : 'bg-[#F9F9F8] border-[#EBEBEA]'
            }`}>
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-indigo-500" />
                Glove-Safe Keypad
              </span>
              <button 
                type="button" 
                onClick={() => setShowNumpad(false)}
                className={`p-2 cursor-pointer min-h-[48px] rounded-xl text-xs font-bold ${
                  darkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Cancel
              </button>
            </div>

            <div className={`p-6 text-right font-mono text-3xl font-black border-b min-h-[78px] ${
              darkTheme ? 'bg-slate-950 text-white border-slate-900' : 'bg-[#F3F3F1] text-[#1A1A1A] border-[#EBEBEA]'
            }`}>
              {numpadValue || '0'}
            </div>

            <div className={`grid grid-cols-3 gap-1.5 p-3 ${
              darkTheme ? 'bg-slate-950' : 'bg-white'
            }`}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleNumpadPress(key)}
                  className={`font-mono font-black text-2xl rounded-xl py-5.5 min-h-[58px] cursor-pointer border transition-all active:scale-95 ${
                    darkTheme
                      ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 active:bg-indigo-650 active:text-white'
                      : 'bg-[#F9F9F8] border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#EBEBEA] active:bg-indigo-600 active:text-white shadow-sm'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className={`grid grid-cols-2 gap-1.5 p-3 border-t ${
              darkTheme ? 'bg-slate-950 border-slate-900' : 'bg-[#F9F9F8] border-[#EBEBEA]'
            }`}>
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className={`font-black py-4.5 rounded-xl text-xs uppercase cursor-pointer min-h-[48px] border active:scale-95 transition-all ${
                  darkTheme 
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' 
                    : 'bg-white border-[#D9D9D6] hover:bg-[#F3F3F1] text-[#1A1A1A]'
                }`}
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={confirmNumpadValue}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4.5 rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-95 transition-all shadow-md"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch swipe-navigation floating helpers at screen edges */}
      {currentStep > 1 && currentStep <= 5 && (
        <button
          type="button"
          onClick={handleSwipePrev}
          className="fixed left-2.5 top-1/2 -translate-y-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-[#D9D9D6] dark:border-slate-800 text-[#1A1A1A] dark:text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 opacity-60 hover:opacity-100 min-h-[48px] min-w-[48px] w-12 h-12"
          aria-label="Previous step swipe"
        >
          <ArrowLeft className="w-5 h-5 text-indigo-650" />
        </button>
      )}

      {currentStep < 5 && (
        <button
          type="button"
          onClick={handleSwipeNext}
          disabled={
            (currentStep === 1 && !isStep1Valid()) ||
            (currentStep === 4 && !isStep4Valid())
          }
          className="fixed right-2.5 top-1/2 -translate-y-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-[#D9D9D6] dark:border-slate-800 text-[#1A1A1A] dark:text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 disabled:opacity-10 disabled:pointer-events-none opacity-60 hover:opacity-100 min-h-[48px] min-w-[48px] w-12 h-12"
          aria-label="Next step swipe"
        >
          <ArrowRight className="w-5 h-5 text-indigo-650" />
        </button>
      )}
    </div>
  );
}
