import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { ClipboardList, PlusCircle, ArrowRight, CheckCircle, Sun, Moon, User } from 'lucide-react';

export default function OperationsDashboardPage() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);

  // Outdoor Sunlight Toggle State
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_sunlight_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pumpai_sunlight_mode', String(sunlightMode));
  }, [sunlightMode]);

  // Load from draft recovery
  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    if (draft) {
      try {
        setActiveShifts(JSON.parse(draft));
      } catch {}
    } else if (shifts.length > 0) {
      setActiveShifts([shifts[0]]);
    }
  }, [shifts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-bold font-mono">
        <span>Retrieving daily active operational lists...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-200 select-none ${
      sunlightMode ? 'bg-[#ffffff] text-[#000000]' : 'bg-slate-900 text-slate-100'
    }`}>
      {/* Header Bar */}
      <nav className={`px-6 py-4 flex items-center justify-between border-b transition-colors duration-200 ${
        sunlightMode ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className={`text-base font-black tracking-tight ${sunlightMode ? 'text-slate-900' : 'text-white'}`}>
              OPERATIONAL CONTROL ROOM
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase">POTALIYA PETROLEUM ERP</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`flex items-center gap-2 font-black text-xs px-4 py-3.5 rounded-xl uppercase tracking-wider border cursor-pointer min-h-[48px] ${
              sunlightMode 
                ? 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200' 
                : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {sunlightMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
            {sunlightMode ? 'Shade Mode' : 'Sunlight Mode'}
          </button>

          <button
            onClick={() => navigate('/operations/shifts/open')}
            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-1.5 min-h-[48px] cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" /> Start New Shift Float
          </button>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
            Active Station Shift Registers
          </h3>
        </div>
        
        {activeShifts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {activeShifts.map((shift) => (
              <div 
                key={shift.id} 
                className={`p-6 rounded-3xl border transition-colors duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md ${
                  sunlightMode 
                    ? 'bg-white border-slate-200 text-black' 
                    : 'bg-[#0a0f1d]/75 border-slate-850 text-slate-100'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-black">{shift.shiftLabel}</h4>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-black uppercase ${
                      shift.status === 'APPROVED' 
                        ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-indigo-950/20 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {shift.status === 'APPROVED' ? 'LOCKED' : 'ACTIVE'}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold">
                    Shift ID: <span className="font-mono">{shift.id}</span> • Date: {shift.shiftDate}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Operator: {shift.operatorId || 'Ramesh Attendant'}</span>
                  </div>

                  <div className="flex gap-4 mt-2 text-[10px] text-slate-400 font-bold font-mono">
                    <span>Float: <strong className={sunlightMode ? 'text-slate-800' : 'text-white'}>₹{Number(shift.openingCash).toLocaleString()}</strong></span>
                    <span>Expenses: <strong className={sunlightMode ? 'text-slate-800' : 'text-white'}>₹{Number(shift.expenses).toLocaleString()}</strong></span>
                    <span>Credit: <strong className={sunlightMode ? 'text-slate-800' : 'text-white'}>₹{Number(shift.creditSales).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {shift.status !== 'APPROVED' ? (
                    <>
                      <button
                        onClick={() => navigate(`/transactions`)}
                        className={`px-4.5 py-3 border font-black text-xs uppercase tracking-wider rounded-xl min-h-[44px] cursor-pointer ${
                          sunlightMode
                            ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                            : 'bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800'
                        }`}
                      >
                        Log Transactions
                      </button>
                      <button
                        onClick={() => navigate(`/operations/shifts/${shift.id}/reconcile`)}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 min-h-[44px] cursor-pointer shadow-md"
                      >
                        Reconcile Till <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="p-3 bg-emerald-950/20 text-emerald-400 text-xs font-black uppercase rounded-xl flex items-center gap-1 border border-emerald-500/20">
                        <CheckCircle className="w-4 h-4 text-emerald-400" /> Reconciled &amp; Sealed
                      </span>
                      <button
                        onClick={() => navigate(`/operations/shifts/${shift.id}/reconcile`)}
                        className={`px-4.5 py-3 border font-black text-xs uppercase tracking-wider rounded-xl min-h-[44px] cursor-pointer ${
                          sunlightMode
                            ? 'bg-white border-slate-350 text-slate-700 hover:bg-slate-100'
                            : 'bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800'
                        }`}
                      >
                        View Report
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`p-10 text-center text-slate-500 border rounded-3xl ${
            sunlightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0f1d]/20 border-slate-850'
          }`}>
            No active shift registers running. Start a shift float above to begin.
          </div>
        )}
      </div>
    </div>
  );
}
