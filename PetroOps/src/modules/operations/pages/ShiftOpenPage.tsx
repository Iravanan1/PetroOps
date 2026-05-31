import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationalWorkflowService } from '../../shared/services/OperationalWorkflowService';
import { Play, ArrowLeft, Sun, Moon, User, Check, Calculator, Clock, Sparkles } from 'lucide-react';

const RECENT_OPERATORS_KEY = 'pumpai_recent_operators';

export default function ShiftOpenPage() {
  const navigate = useNavigate();
  
  // Theme Mode: false = Calm Off-White UI (default), true = High-Contrast Dark Mode
  const [darkTheme, setDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_dark_theme') === 'true';
  });

  // Sunlight Readability Mode: false = Default, true = High-Contrast Sunlight
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

  const [openFloat, setOpenFloat] = useState(5000);
  const [openLabel, setOpenLabel] = useState("Morning Shift - A");
  const [selectedOperator, setSelectedOperator] = useState("Ramesh Attendant");
  
  // Custom keypad state
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');

  // Operator list simulation with local cache memory
  const [recentOperators, setRecentOperators] = useState<string[]>([
    "Ramesh Attendant",
    "Suresh Kumar",
    "Dinesh Sharma",
    "Anil Singh"
  ]);

  useEffect(() => {
    localStorage.setItem('pumpai_dark_theme', String(darkTheme));
  }, [darkTheme]);

  useEffect(() => {
    const cached = localStorage.getItem(RECENT_OPERATORS_KEY);
    if (cached) {
      try {
        setRecentOperators(JSON.parse(cached));
      } catch {}
    }
  }, []);

  const handleOpenShift = () => {
    // Add current operator to recents
    const nextRecents = [selectedOperator, ...recentOperators.filter(o => o !== selectedOperator)].slice(0, 5);
    localStorage.setItem(RECENT_OPERATORS_KEY, JSON.stringify(nextRecents));

    const baseShift = OperationalWorkflowService.openShift(
      'potaliya-petroleum', 
      new Date().toISOString().split('T')[0], 
      openLabel, 
      openFloat
    );
    
    // Enrich shift with selected operator
    const newShift = {
      ...baseShift,
      operatorId: selectedOperator,
      status: 'NEEDS_REVIEW' as const
    };

    // Auto-save draft lists
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    let currentList = [];
    if (draft) {
      try { currentList = JSON.parse(draft); } catch {}
    }
    
    const updated = [newShift, ...currentList];
    localStorage.setItem("pumpai_active_shift_draft", JSON.stringify(updated));
    
    // Save active state to resume easily
    localStorage.setItem("pumpai_current_active_shift_id", newShift.id);
    
    // Redirect to active Operations dashboard list
    navigate('/operations');
  };

  const handleNumpadConfirm = () => {
    const val = parseFloat(numpadValue) || 0;
    setOpenFloat(val);
    setShowNumpad(false);
  };

  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setNumpadValue('');
    } else if (val === 'DEL') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else {
      if (val === '.' && numpadValue.includes('.')) return;
      setNumpadValue(prev => prev + val);
    }
  };

  const shiftLabelPresets = [
    "Morning Shift - A",
    "Afternoon Shift - B",
    "Night Shift - C"
  ];

  const cashFloatPresets = [
    1000,
    2000,
    5000,
    10000,
    15000
  ];

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-200 select-none ${
      darkTheme ? 'bg-slate-900 text-slate-100' : 'bg-[#F9F9F8] text-[#1A1A1A]'
    }`}>
      {/* Header */}
      <nav className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-200 ${
        darkTheme ? 'bg-slate-950 border-slate-800' : 'bg-white border-[#EBEBEA]'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/operations')} 
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-xl border min-h-[44px] active:scale-95 transition-all ${
              darkTheme 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' 
                : 'bg-[#F3F3F1] border-[#EBEBEA] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-[#D35400]" /> Back
          </button>
          <div>
            <h1 className={`text-sm font-bold tracking-wider uppercase ${darkTheme ? 'text-white' : 'text-[#1A1A1A]'}`}>
              Shift Opening Station
            </h1>
            <p className="text-[10px] text-[#666666] font-bold tracking-widest uppercase">Potaliya Petroleum</p>
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
                ? 'bg-slate-850 border-slate-700 text-amber-400 hover:bg-slate-800' 
                : 'bg-[#F3F3F1] border-[#D9D9D6] text-[#1A1A1A] hover:bg-[#EBEBEA]'
            }`}
          >
            {darkTheme ? (
              <>
                <Sun className="h-4.5 w-4.5 text-amber-400" /> Calm Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4.5 w-4.5 text-[#666666]" /> Stark Dark Mode
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-xl mx-auto space-y-6">
        {/* Main Card */}
        <div className={`p-6 rounded-3xl border transition-colors duration-200 ${
          darkTheme ? 'bg-slate-950 border-slate-850' : 'bg-white border-[#EBEBEA] shadow-lg'
        } flex flex-col gap-6`}>
          
          <div className={`border-b pb-4 flex items-center justify-between ${darkTheme ? 'border-slate-800' : 'border-[#EBEBEA]'}`}>
            <h3 className="text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5 text-[#D35400]">
              <Play className="w-5 h-5 fill-current" /> Start Daily Shift
            </h3>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
              darkTheme ? 'bg-slate-900 text-slate-400' : 'bg-[#F3F3F1] text-[#666666]'
            }`}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* STEP 1: SELECT OPERATOR */}
          <div className="space-y-3">
            <label className="text-[10px] text-[#666666] uppercase tracking-widest font-extrabold flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#D35400]" /> 1. Select Shift Operator
            </label>
            
            {/* Recent Operators Horizontal Grid */}
            <div className="grid grid-cols-2 gap-2">
              {recentOperators.map((operator) => (
                <button
                  type="button"
                  key={operator}
                  onClick={() => setSelectedOperator(operator)}
                  className={`px-4 py-3.5 rounded-xl border-2 text-xs font-bold tracking-wide transition-all flex items-center justify-between min-h-[54px] glove-safe-target-large cursor-pointer active:scale-95 ${
                    selectedOperator === operator
                      ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]'
                      : darkTheme
                        ? 'border-slate-850 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                        : 'border-[#EBEBEA] bg-[#F9F9F8] text-[#1A1A1A] hover:bg-[#F3F3F1]'
                  }`}
                >
                  <span className="truncate">{operator}</span>
                  {selectedOperator === operator && <Check className="w-4.5 h-4.5 text-[#D35400] shrink-0 ml-1" />}
                </button>
              ))}
            </div>

            {/* Custom Operator Entry */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[9px] text-[#666666] font-bold uppercase tracking-wider">Or enter new operator name</span>
              <input
                type="text"
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className={`border rounded-xl px-4 py-3 text-xs font-bold focus:outline-none min-h-[54px] glove-safe-target-large transition-all focus:border-[#D35400] ${
                  darkTheme 
                    ? 'bg-[#060a13] border-slate-850 text-white' 
                    : 'bg-white border-[#EBEBEA] text-[#1A1A1A]'
                }`}
                placeholder="Type name..."
              />
            </div>
          </div>

          {/* STEP 2: SHIFT LABEL PRESETS */}
          <div className="space-y-3">
            <label className="text-[10px] text-[#666666] uppercase tracking-widest font-extrabold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D35400]" /> 2. Shift Label / Timing
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {shiftLabelPresets.map((label) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setOpenLabel(label)}
                  className={`px-3 py-3 rounded-xl border text-center text-[10px] font-bold tracking-wider transition-all min-h-[54px] glove-safe-target-large cursor-pointer active:scale-95 ${
                    openLabel === label
                      ? 'border-[#D35400] bg-[#D35400]/5 text-[#D35400]'
                      : darkTheme
                        ? 'border-slate-850 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        : 'border-[#EBEBEA] bg-[#F9F9F8] text-[#666666] hover:bg-[#F3F3F1]'
                  }`}
                >
                  {label.split(" - ")[0]}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={openLabel}
              onChange={(e) => setOpenLabel(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-xs font-bold focus:outline-none min-h-[54px] glove-safe-target-large transition-all focus:border-[#D35400] ${
                darkTheme 
                  ? 'bg-[#060a13] border-slate-850 text-white' 
                  : 'bg-white border-[#EBEBEA] text-[#1A1A1A]'
              }`}
              placeholder="Shift label name..."
            />
          </div>

          {/* STEP 3: OPENING CASH FLOAT PRESETS */}
          <div className="space-y-3">
            <label className="text-[10px] text-[#666666] uppercase tracking-widest font-extrabold flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#D35400]" /> 3. Opening Cash Float (INR)
            </label>

            {/* Quick Cash Float presets */}
            <div className="flex flex-wrap gap-2">
              {cashFloatPresets.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  onClick={() => setOpenFloat(amount)}
                  className={`px-4 py-3 rounded-xl border font-mono font-bold text-xs transition-all min-h-[54px] glove-safe-target-large cursor-pointer active:scale-95 ${
                    openFloat === amount
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold'
                      : darkTheme
                        ? 'border-slate-850 bg-slate-900/60 text-slate-450 hover:border-slate-700'
                        : 'border-[#EBEBEA] bg-[#F9F9F8] text-[#666666] hover:bg-[#F3F3F1]'
                  }`}
                >
                  ₹{amount.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {/* Huge numeric interactive display trigger */}
            <button
              type="button"
              onClick={() => {
                setNumpadValue(openFloat ? openFloat.toString() : '');
                setShowNumpad(true);
              }}
              className={`w-full text-left font-mono font-extrabold text-2xl rounded-2xl py-4 px-5 border-2 transition-all min-h-[64px] cursor-pointer flex justify-between items-center active:scale-98 ${
                openFloat > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : darkTheme
                    ? 'border-slate-700 bg-slate-950 text-slate-300'
                    : 'border-[#D9D9D6] bg-[#F9F9F8] text-[#1A1A1A]'
              }`}
            >
              <span>₹ {openFloat.toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-sans font-bold tracking-widest uppercase text-[#D35400] border border-[#D35400]/30 px-2 py-1 rounded-lg">
                Tap Keypad
              </span>
            </button>
          </div>

          {/* START BUTTON */}
          <button
            onClick={handleOpenShift}
            className="w-full py-4 mt-2 bg-[#D35400] hover:bg-[#A04000] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[54px] active:scale-98"
          >
            <Play className="w-5 h-5 fill-current" /> Start Active Shift Now
          </button>
        </div>
      </div>

      {/* OVERLAY GLOVE-PROOF NUMPAD */}
      {showNumpad && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-[#EBEBEA] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#F9F9F8] p-4 flex items-center justify-between border-b border-[#EBEBEA]">
              <span className="text-[10px] text-[#1A1A1A] font-bold uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-[#D35400]" />
                Glove-Safe Float Keypad
              </span>
              <button 
                type="button" 
                onClick={() => setShowNumpad(false)}
                className="text-[#666666] hover:text-[#1A1A1A] p-2 cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>

            <div className="bg-[#F9F9F8] p-6 text-right font-mono text-3xl font-black text-[#1A1A1A] border-b border-[#EBEBEA] min-h-[78px]">
              ₹ {numpadValue || '0'}
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-3 bg-white">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleNumpadPress(key)}
                  className="bg-[#F9F9F8] hover:bg-[#F3F3F1] active:bg-[#D35400] active:text-white text-[#1A1A1A] font-mono font-black text-2xl rounded-2xl py-5 min-h-[64px] glove-safe-target-large cursor-pointer border border-[#EBEBEA] transition-all active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-3 bg-white border-t border-[#EBEBEA]">
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className="bg-[#F3F3F1] hover:bg-[#EBEBEA] text-[#1A1A1A] font-bold py-4 rounded-xl text-xs uppercase cursor-pointer min-h-[54px] glove-safe-target-large transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleNumpadConfirm}
                className="bg-[#D35400] hover:bg-[#A04000] text-white font-bold py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 cursor-pointer min-h-[54px] glove-safe-target-large transition-all active:scale-95 shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
