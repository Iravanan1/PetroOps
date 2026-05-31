import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Check, 
  UploadCloud, 
  Smartphone, 
  FileText, 
  ArrowRight,
  User,
  Calculator,
  CornerDownLeft,
  X,
  Sun,
  Moon,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { OfflineStatusBar } from '../components/OfflineStatusBar';
import { OfflineRecoveryEngine } from '../modules/shared/OfflineRecoveryEngine';
import { configGet, configSet } from '../modules/shared/LocalDatabaseEngine';

interface NozzleState {
  id: string;
  name: string;
  fuelType: 'Diesel' | 'Petrol' | 'Speed';
  opening: number;
  closing: number;
  rate: number; // Price per liter
}

interface VelocityMetrics {
  startTime: number;
  firstInputTime: number | null;
  lastInputTime: number | null;
  interactionCount: number;
  failedAttempts: number;
  totalDurationMs: number;
  inputDelays: number[];
}

export const OperatorConsole: React.FC = () => {
  // Theme Mode: false = Calm Off-White UI (default), true = High-Contrast Dark Mode
  const [darkTheme, setDarkTheme] = useState<boolean>(false);

  // Carry-Forward values from the previous shift closing states
  const [nozzles, setNozzles] = useState<NozzleState[]>([
    { id: 'noz_1', name: 'Nozzle 1 (Petrol)', fuelType: 'Petrol', opening: 452109.80, closing: 0, rate: 104.20 },
    { id: 'noz_2', name: 'Nozzle 2 (Petrol)', fuelType: 'Petrol', opening: 189320.10, closing: 0, rate: 104.20 },
    { id: 'noz_3', name: 'Nozzle 3 (Diesel)', fuelType: 'Diesel', opening: 890211.50, closing: 0, rate: 92.50 },
  ]);

  // Till cash counting sheets
  const [cashNotes, setCashNotes] = useState<{ [denom: number]: number }>({
    2000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });

  const [upiAmount, setUpiAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [showNumpad, setShowNumpad] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [activeInput, setActiveInput] = useState<{ type: 'nozzle' | 'cash' | 'upi' | 'card'; key: string } | null>(null);
  
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  // Load draft on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const rawDraft = await configGet('operator_console_draft');
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (draft.nozzles) setNozzles(draft.nozzles);
          if (draft.cashNotes) setCashNotes(draft.cashNotes);
          if (draft.upiAmount !== undefined) setUpiAmount(draft.upiAmount);
          if (draft.cardAmount !== undefined) setCardAmount(draft.cardAmount);
          if (draft.remarks !== undefined) setRemarks(draft.remarks);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 5000);
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    loadDraft();
  }, []);

  // Autosave draft every 10 seconds (10000ms)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const draft = {
          nozzles,
          cashNotes,
          upiAmount,
          cardAmount,
          remarks
        };
        await configSet('operator_console_draft', JSON.stringify(draft));
      } catch (err) {
        console.error('Failed to autosave draft:', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [nozzles, cashNotes, upiAmount, cardAmount, remarks]);

  // ----------------------------------------------------
  // SHIFT CLOSING VELOCITY METRICS INTERCEPTOR
  // ----------------------------------------------------
  const metrics = useRef<VelocityMetrics>({
    startTime: Date.now(),
    firstInputTime: null,
    lastInputTime: null,
    interactionCount: 0,
    failedAttempts: 0,
    totalDurationMs: 0,
    inputDelays: []
  });

  const recordInteraction = () => {
    const now = Date.now();
    metrics.current.interactionCount += 1;
    if (!metrics.current.firstInputTime) {
      metrics.current.firstInputTime = now;
    }
    if (metrics.current.lastInputTime) {
      const delay = now - metrics.current.lastInputTime;
      metrics.current.inputDelays.push(delay);
    }
    metrics.current.lastInputTime = now;
  };

  // Computes total cash in till
  const totalCash = useMemo(() => {
    return Object.keys(cashNotes).reduce((sum, denomStr) => {
      const denom = Number(denomStr);
      const count = cashNotes[denom] || 0;
      return sum + (denom * count);
    }, 0);
  }, [cashNotes]);

  // Computes wetstock fuel sales values
  const fuelSummary = useMemo(() => {
    let totalLiters = 0;
    let totalRevenue = 0;

    nozzles.forEach(n => {
      if (n.closing >= n.opening) {
        const sold = n.closing - n.opening;
        totalLiters += sold;
        totalRevenue += sold * n.rate;
      }
    });

    return { totalLiters, totalRevenue };
  }, [nozzles]);

  // Custom numpad triggers
  const handleInputFocus = (type: 'nozzle' | 'cash' | 'upi' | 'card', key: string, currentVal: string) => {
    recordInteraction();
    setActiveInput({ type, key });
    setNumpadValue(currentVal === '0' || currentVal === '' ? '' : currentVal);
    setShowNumpad(true);
  };

  const handleNumpadPress = (val: string) => {
    recordInteraction();
    if (val === 'C') {
      setNumpadValue('');
    } else if (val === 'DEL') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else {
      // Prevent multiple decimals
      if (val === '.' && numpadValue.includes('.')) return;
      setNumpadValue(prev => prev + val);
    }
  };

  const handleNumpadConfirm = () => {
    if (!activeInput) return;
    recordInteraction();

    const num = parseFloat(numpadValue) || 0;

    if (activeInput.type === 'nozzle') {
      setNozzles(prev => prev.map(noz => {
        if (noz.id === activeInput.key) {
          // Validation check: Closing must be greater than opening
          const nextErrors = { ...errors };
          if (num > 0 && num < noz.opening) {
            nextErrors[noz.id] = `Closing meter (${num}) cannot be less than opening meter (${noz.opening})`;
          } else {
            delete nextErrors[noz.id];
          }
          setErrors(nextErrors);
          return { ...noz, closing: num };
        }
        return noz;
      }));
    } else if (activeInput.type === 'cash') {
      const denom = Number(activeInput.key);
      setCashNotes(prev => ({
        ...prev,
        [denom]: Math.floor(num)
      }));
    } else if (activeInput.type === 'upi') {
      setUpiAmount(numpadValue);
    } else if (activeInput.type === 'card') {
      setCardAmount(numpadValue);
    }

    setShowNumpad(false);
    setActiveInput(null);
  };

  // Auto-prefill carry-forward simulation
  const handleAutoPrefill = () => {
    recordInteraction();
    // Simulate smart prefill from current average sales logic
    setNozzles(prev => prev.map(noz => ({
      ...noz,
      closing: noz.opening + parseFloat((Math.random() * 250 + 50).toFixed(2))
    })));

    setCashNotes({
      2000: 2,
      500: 15,
      200: 20,
      100: 30,
      50: 25,
      20: 10,
      10: 20
    });

    setUpiAmount('12400.00');
    setCardAmount('5800.00');
    setRemarks('Auto-prefilled via Smart Attendant System');
  };

  // Submit flow
  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    recordInteraction();

    const finalErrors: Record<string, string> = {};

    // Validate nozzle closures
    nozzles.forEach(noz => {
      if (noz.closing <= 0) {
        finalErrors[noz.id] = `${noz.name} closing value is required.`;
      } else if (noz.closing < noz.opening) {
        finalErrors[noz.id] = `Closing (${noz.closing}) cannot be less than opening (${noz.opening})`;
      }
    });

    // Validate UPI & Card limits
    const upiNum = parseFloat(upiAmount) || 0;
    const cardNum = parseFloat(cardAmount) || 0;
    if (upiNum < 0) finalErrors['upi'] = 'UPI amount cannot be negative';
    if (cardNum < 0) finalErrors['card'] = 'Card amount cannot be negative';

    if (Object.keys(finalErrors).length > 0) {
      metrics.current.failedAttempts += 1;
      setErrors(finalErrors);
      // Scroll to error banner smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Complete transaction speed logs computation
    const submitTime = Date.now();
    metrics.current.totalDurationMs = submitTime - metrics.current.startTime;

    const shiftClosingPayload = {
      id: `shift_close_${Date.now()}`,
      timestamp: new Date().toISOString(),
      branchId: 'station_mumbai_01',
      operatorId: 'operator_demo_ramesh',
      nozzles: nozzles.map(n => ({
        id: n.id,
        opening: n.opening,
        closing: n.closing,
        salesVolume: n.closing - n.opening,
        revenue: (n.closing - n.opening) * n.rate
      })),
      tillCash: totalCash,
      upiSales: upiNum,
      cardSales: cardNum,
      totalSalesRevenue: fuelSummary.totalRevenue,
      remarks,
      metrics: {
        totalDurationMs: metrics.current.totalDurationMs,
        interactionCount: metrics.current.interactionCount,
        failedAttempts: metrics.current.failedAttempts,
        averageDelayMs: metrics.current.inputDelays.length > 0 
          ? Math.round(metrics.current.inputDelays.reduce((s, v) => s + v, 0) / metrics.current.inputDelays.length)
          : 0
      }
    };

    try {
      // Save locally via OfflineRecoveryEngine
      OfflineRecoveryEngine.getInstance().enqueue(
        'shift_entry',
        shiftClosingPayload,
        'station_mumbai_01'
      );
      
      // Clear draft on successful submission
      configSet('operator_console_draft', '').catch(() => {});
      
      // Save closing velocity metrics directly for learn engine feedback
      const velocityLogsKey = 'pumpai_shift_close_velocity_metrics';
      const rawLogs = localStorage.getItem(velocityLogsKey) || '[]';
      const logsList = JSON.parse(rawLogs);
      logsList.push(shiftClosingPayload.metrics);
      localStorage.setItem(velocityLogsKey, JSON.stringify(logsList));

      setSaveSuccess(true);
      setErrors({});

      setTimeout(() => {
        setSaveSuccess(false);
        // Clear inputs for clean state
        setNozzles(prev => prev.map(n => ({ ...n, closing: 0 })));
        setCashNotes({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
        setUpiAmount('');
        setCardAmount('');
        setRemarks('');
        metrics.current = {
          startTime: Date.now(),
          firstInputTime: null,
          lastInputTime: null,
          interactionCount: 0,
          failedAttempts: 0,
          totalDurationMs: 0,
          inputDelays: []
        };
      }, 3500);

    } catch (err) {
      console.error('Failed to write offline cache transaction:', err);
    }
  };

  return (
    <div className={`min-h-screen pb-20 font-sans transition-colors duration-300 select-none ${
      darkTheme 
        ? 'bg-slate-900 text-slate-100' 
        : 'bg-[#F9F9F8] text-[#1A1A1A]'
    }`}>
      {/* Attendant Outdoor Sun-Proof Header */}
      <nav className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 ${
        darkTheme 
          ? 'bg-slate-950 border-slate-800' 
          : 'bg-white border-[#EBEBEA]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#D35400] rounded-full flex items-center justify-center text-white font-black text-lg">
            P
          </div>
          <div>
            <h1 className={`text-sm font-bold tracking-wider uppercase ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Operator Attendant Workstation
            </h1>
            <p className="text-[10px] font-bold text-[#666666] tracking-wider uppercase mt-0.5">
              Mumbai Outdoor Bay-01
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Glove-safe Toggle Theme Button */}
          <button
            type="button"
            onClick={() => {
              recordInteraction();
              setDarkTheme(!darkTheme);
            }}
            className={`flex items-center gap-2 font-bold text-[10px] tracking-wider uppercase px-4 py-3.5 rounded-xl border cursor-pointer min-h-[48px] transition-all active:scale-95 ${
              darkTheme 
                ? 'bg-slate-850 border-slate-700 text-amber-400 hover:bg-slate-800' 
                : 'bg-[#F3F3F1] border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
            title="Toggle contrast mode for high sunlight visibility"
          >
            {darkTheme ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" /> Calm Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#666666]" /> Stark Dark Mode
              </>
            )}
          </button>

          <div className={`hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-bold tracking-widest uppercase ${
            darkTheme ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-[#F3F3F1] border-[#EBEBEA] text-[#666666]'
          }`}>
            <User className="h-4 w-4 text-[#D35400]" />
            <span>Ramesh Attendant</span>
          </div>
        </div>
      </nav>

      {/* Main Console Grid */}
      <form onSubmit={handleSaveShift} className="p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Verification & Success Banner */}
        {saveSuccess && (
          <div className="bg-emerald-900/10 border border-emerald-500 rounded-2xl p-5 flex items-center gap-4 text-emerald-700 animate-bounce">
            <Check className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <div className="font-extrabold text-sm uppercase tracking-wider">Shift Close Buffer Saved Offline</div>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Sync Recovery Engine will push parsing events automatically upon pipeline checkouts.
              </p>
            </div>
          </div>
        )}

        {/* Global Errors Panel */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2 text-rose-800">
            <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm uppercase tracking-wider">
              <AlertCircle className="h-5 w-5" />
              Operational Continuity Alerts ({Object.keys(errors).length})
            </div>
            <ul className="list-disc pl-6 text-xs font-bold space-y-1">
              {(Object.values(errors) as string[]).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* STICKY LOW-FRICTION ACTION BAR */}
        <div className={`sticky top-2 z-30 flex flex-wrap items-center justify-between p-4 rounded-2xl border backdrop-blur-md shadow-lg gap-3 ${
          darkTheme 
            ? 'bg-slate-950/95 border-slate-800 text-slate-100' 
            : 'bg-white/95 border-[#EBEBEA] text-[#1A1A1A]'
        }`}>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[9px] text-[#666666] font-bold uppercase tracking-widest block">Estimated Fuel Volume</span>
              <span className="text-xl font-extrabold font-mono tracking-tight">
                {fuelSummary.totalLiters.toFixed(2)} Liters
              </span>
            </div>
            <div className={`h-8 w-[1px] ${darkTheme ? 'bg-slate-800' : 'bg-[#EBEBEA]'}`} />
            <div>
              <span className="text-[9px] text-[#666666] font-bold uppercase tracking-widest block">Expected Fuel Sales</span>
              <span className="text-xl font-extrabold font-mono tracking-tight text-emerald-600">
                ₹ {fuelSummary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAutoPrefill}
              className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer min-h-[48px] active:scale-95 ${
                darkTheme
                  ? 'bg-indigo-950/60 border border-indigo-800 text-indigo-300 hover:bg-indigo-900'
                  : 'bg-[#F3F3F1] border border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#D35400]" /> Fast Carry prefill
            </button>

            <button
              type="submit"
              className="bg-[#D35400] hover:bg-[#A04000] text-white font-bold px-6 rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer min-h-[48px] active:scale-95"
            >
              <Check className="h-4 w-4" /> Submit Shift Close
            </button>
          </div>
        </div>

        {/* SECTION 1: Carry-Forward Nozzles */}
        <section className={`rounded-2xl p-6 border transition-colors duration-300 ${
          darkTheme 
            ? 'bg-slate-950/60 border-slate-850' 
            : 'bg-white border-[#EBEBEA] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#D35400]">
                1. Nozzle Meter Readings
              </h2>
              <p className="text-[#666666] text-[11px] mt-1 font-medium">
                Verify readings against the pump dial. Closing value MUST be equal or greater than opening.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nozzles.map((noz) => {
              const nozzleError = errors[noz.id];
              return (
                <div 
                  key={noz.id} 
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                    nozzleError 
                      ? 'border-rose-500 bg-rose-50' 
                      : darkTheme 
                        ? 'border-slate-850 bg-slate-900/60' 
                        : 'border-[#EBEBEA] bg-[#F9F9F8]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm">{noz.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                      noz.fuelType === 'Diesel' 
                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]' 
                        : 'bg-[#fbbf24]/10 text-[#fbbf24]'
                    }`}>
                      {noz.fuelType} (₹{noz.rate}/L)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#666666] font-mono font-semibold mt-1">
                    <span>OPENING METER:</span>
                    <span>{noz.opening.toFixed(2)}</span>
                  </div>

                  <div>
                    {/* Massive 48px Glove-Safe touch button */}
                    <button
                      type="button"
                      onClick={() => handleInputFocus('nozzle', noz.id, noz.closing.toString())}
                      className={`w-full text-center font-mono font-black text-xl rounded-xl py-4 border-2 transition-colors duration-200 min-h-[58px] cursor-pointer active:scale-98 ${
                        noz.closing > 0 
                          ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]' 
                          : darkTheme 
                            ? 'border-slate-700 bg-slate-950 text-slate-300' 
                            : 'border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                      }`}
                    >
                      {noz.closing > 0 ? noz.closing.toFixed(2) : 'ENTER CLOSE'}
                    </button>
                    {nozzleError && (
                      <span className="text-[10px] text-rose-600 font-bold block mt-1.5 leading-snug">
                        {nozzleError}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: Till Cash counts */}
        <section className={`rounded-2xl p-6 border transition-colors duration-300 ${
          darkTheme 
            ? 'bg-slate-950/60 border-slate-850' 
            : 'bg-white border-[#EBEBEA] shadow-sm'
        }`}>
          <h2 className="text-xs font-black uppercase tracking-widest text-[#D35400]">
            2. Till Cash Denominations
          </h2>
          <p className="text-[#666666] text-[11px] mt-1 mb-4 font-medium">
            Tap on any denomination button to open the glove-safe overlay and adjust the quantity.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.keys(cashNotes).map((denomStr) => {
              const denom = Number(denomStr);
              const count = cashNotes[denom] || 0;
              return (
                <div 
                  key={denom} 
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                    darkTheme ? 'border-slate-850 bg-slate-900/60' : 'border-[#EBEBEA] bg-[#F9F9F8]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666] text-[10px] font-bold font-mono">₹ {denom}</span>
                    <span className="text-[10px] text-[#666666] font-mono font-bold">
                      ₹ {(denom * count).toLocaleString('en-IN')}
                    </span>
                  </div>
                  
                  {/* Massive glove target */}
                  <button
                    type="button"
                    onClick={() => handleInputFocus('cash', denomStr, count.toString())}
                    className={`w-full py-3.5 rounded-xl text-center font-black font-mono text-base min-h-[48px] cursor-pointer border active:scale-95 transition-all ${
                      count > 0 
                        ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]' 
                        : darkTheme 
                          ? 'border-slate-700 bg-slate-950 text-slate-300' 
                          : 'border-[#D9D9D6] bg-white text-[#1A1A1A] hover:bg-[#F3F3F1]'
                    }`}
                  >
                    {count || '0'} Notes
                  </button>
                </div>
              );
            })}
          </div>

          <div className={`p-4 rounded-xl flex items-center justify-between border mt-4 ${
            darkTheme ? 'bg-slate-900 border-slate-850' : 'bg-[#F3F3F1] border-[#EBEBEA]'
          }`}>
            <span className="text-[#666666] text-[10px] font-bold uppercase tracking-widest">Total Physical Cash in Till:</span>
            <strong className="text-xl text-emerald-600 font-mono font-black">
              ₹ {totalCash.toLocaleString('en-IN')}
            </strong>
          </div>
        </section>

        {/* SECTION 3: Digital QR Settlements & POS Slips */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className={`rounded-2xl p-6 border transition-colors duration-300 ${
            darkTheme ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-[#EBEBEA] shadow-sm'
          } space-y-4`}>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#D35400]">
              3. Digital UPI Payments
            </h2>
            <button
              type="button"
              onClick={() => handleInputFocus('upi', 'upi', upiAmount)}
              className={`w-full border text-center font-mono font-black text-lg rounded-xl py-4 min-h-[58px] cursor-pointer active:scale-98 transition-all ${
                upiAmount 
                  ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]' 
                  : darkTheme 
                    ? 'border-slate-750 bg-slate-900/60 text-slate-100' 
                    : 'border-[#D9D9D6] bg-[#F9F9F8] text-[#1A1A1A] hover:bg-[#F3F3F1]'
              }`}
            >
              {upiAmount ? `₹ ${parseFloat(upiAmount).toLocaleString('en-IN')}` : 'ENTER UPI SETTLED TOTAL'}
            </button>

            <div className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-98 cursor-pointer ${
              darkTheme ? 'border-slate-800 hover:bg-slate-950/40' : 'border-[#D9D9D6] hover:bg-[#F3F3F1]/40'
            }`}>
              <UploadCloud className="h-8 w-8 text-[#D35400]" />
              <div className="text-[10px] font-bold uppercase tracking-widest">PhonePe/GPay QR Scan</div>
              <p className="text-[10px] text-[#666666]">Fast consensus alignment fallback</p>
            </div>
          </div>

          <div className={`rounded-2xl p-6 border transition-colors duration-300 ${
            darkTheme ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-[#EBEBEA] shadow-sm'
          } space-y-4`}>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#D35400]">
              4. Credit Card Slips (POS)
            </h2>
            <button
              type="button"
              onClick={() => handleInputFocus('card', 'card', cardAmount)}
              className={`w-full border text-center font-mono font-black text-lg rounded-xl py-4 min-h-[58px] cursor-pointer active:scale-98 transition-all ${
                cardAmount 
                  ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]' 
                  : darkTheme 
                    ? 'border-slate-750 bg-slate-900/60 text-slate-100' 
                    : 'border-[#D9D9D6] bg-[#F9F9F8] text-[#1A1A1A] hover:bg-[#F3F3F1]'
              }`}
            >
              {cardAmount ? `₹ ${parseFloat(cardAmount).toLocaleString('en-IN')}` : 'ENTER POS MACHINE CARD TOTAL'}
            </button>

            <div className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-98 cursor-pointer ${
              darkTheme ? 'border-slate-800 hover:bg-slate-950/40' : 'border-[#D9D9D6] hover:bg-[#F3F3F1]/40'
            }`}>
              <UploadCloud className="h-8 w-8 text-[#D35400]" />
              <div className="text-[10px] font-bold uppercase tracking-widest">POS Settlement Slip Upload</div>
              <p className="text-[10px] text-[#666666]">JPEG/PNG high accuracy extraction</p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Remarks */}
        <section className={`rounded-2xl p-6 border transition-colors duration-300 ${
          darkTheme ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-[#EBEBEA] shadow-sm'
        } space-y-3`}>
          <span className="text-xs font-black uppercase tracking-widest text-[#D35400]">Shift Remarks / Handover Memo</span>
          <textarea
            value={remarks}
            onChange={(e) => {
              recordInteraction();
              setRemarks(e.target.value);
            }}
            placeholder="Describe any fuel calibration, dispenser downtime, or POS slip variances here..."
            className={`w-full p-4 rounded-xl border text-xs font-semibold focus:outline-none focus:border-[#D35400] min-h-[88px] ${
              darkTheme 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-[#EBEBEA] text-[#1A1A1A]'
            }`}
          />
        </section>
      </form>

      {/* OVERLAY GLOVE-PROOF NUMERIC PAD SYSTEM */}
      {showNumpad && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-[#EBEBEA] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#F9F9F8] p-4 flex items-center justify-between border-b border-[#EBEBEA]">
              <span className="text-[10px] text-[#1A1A1A] font-bold uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-[#D35400]" />
                Glove-Safe Screen Keypad
              </span>
              <button 
                type="button" 
                onClick={() => {
                  recordInteraction();
                  setShowNumpad(false);
                }}
                className="text-[#666666] hover:text-[#1A1A1A] p-2 cursor-pointer min-h-[48px]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Large high-contrast display */}
            <div className="bg-[#F9F9F8] p-6 text-right font-mono text-3xl font-black text-[#1A1A1A] border-b border-[#EBEBEA] min-h-[78px]">
              {numpadValue || '0'}
            </div>

            {/* Touch grid of massive buttons (height strictly 58px+) */}
            <div className="grid grid-cols-3 gap-1.5 p-3 bg-white">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleNumpadPress(key)}
                  className="bg-[#F9F9F8] hover:bg-[#F3F3F1] active:bg-[#D35400] active:text-white text-[#1A1A1A] font-mono font-black text-2xl rounded-2xl py-5 min-h-[58px] cursor-pointer border border-[#EBEBEA] transition-all active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Clear & Confirm Action Footer */}
            <div className="grid grid-cols-2 gap-1.5 p-3 bg-white border-t border-[#EBEBEA]">
              <button
                type="button"
                onClick={() => {
                  recordInteraction();
                  handleNumpadPress('C');
                }}
                className="bg-[#F3F3F1] hover:bg-[#EBEBEA] text-[#1A1A1A] font-bold py-4 rounded-xl text-xs uppercase cursor-pointer min-h-[48px] transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleNumpadConfirm}
                className="bg-[#D35400] hover:bg-[#A04000] text-white font-bold py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer min-h-[48px] transition-all active:scale-95 shadow-sm"
              >
                <CornerDownLeft className="h-4 w-4" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Indicator */}
      <OfflineStatusBar />
    </div>
  );
};

export default OperatorConsole;
