import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, PlusCircle, CheckCircle, Sun, Moon, User, 
  AlertTriangle, CheckSquare, ShieldCheck, ChevronRight, Activity, CreditCard, 
  Layers, Landmark, Settings, AlertOctagon, HelpCircle, Thermometer, UserCheck
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { OperatorTaskEngine, OperatorTask } from '../OperatorTaskEngine';
import { ShiftApprovalFlow } from '../ShiftApprovalFlow';
import { OCRCorrectionMemory } from '../../ocr/adaptive/OCRCorrectionMemory';
import OperationsHealthPanel from '../components/OperationsHealthPanel';
import RecoveryAssistant from '../components/RecoveryAssistant';

export default function OperationsCommandCenter() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  
  // Outdoor Sunlight Toggle State
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

  // Load shifts and compute Operator tasks
  useEffect(() => {
    const draft = localStorage.getItem("pumpai_active_shift_draft");
    let currentShifts: ShiftRecord[] = [];
    
    if (draft) {
      try {
        currentShifts = JSON.parse(draft);
      } catch {}
    } else if (shifts.length > 0) {
      currentShifts = [shifts[0]];
    }

    setActiveShifts(currentShifts);

    if (currentShifts.length > 0) {
      const activeShift = currentShifts[0];
      
      // Look up locks
      const approval = ShiftApprovalFlow.getFlowForShift(activeShift.id);
      const isOcrReviewed = approval ? approval.status === 'LOCKED' : false;

      // Extract details
      const nozzles = (activeShift.readings || []).map(r => ({
        nozzleId: `noz-0${r.id}`,
        fuelType: r.fuel as any,
        openingMeter: r.opening,
        closingMeter: r.closing,
        testingQty: r.testing,
        netSales: Math.max(0, r.closing - r.opening - r.testing),
        fuelRate: r.rate
      })) || [
        { nozzleId: 'noz-01', fuelType: 'HSD' as const, openingMeter: 125100, closingMeter: 125350, netSales: 250, fuelRate: 94.2, testingQty: 0 },
        { nozzleId: 'noz-02', fuelType: 'MS' as const, openingMeter: 94820, closingMeter: 95100, netSales: 280, fuelRate: 104.5, testingQty: 0 }
      ];

      const creditEntries: any[] = [];

      // Generate operator checklist tasks
      const activeTasks = OperatorTaskEngine.generateChecklist({
        shiftId: activeShift.id,
        nozzles,
        creditEntries,
        upiSales: Number(activeShift.upiSales || 0),
        actualUpiSales: Number(activeShift.upiSales || 0) + 120, // simulate slight gap for mismatch
        wetstockVarianceRecorded: activeShift.status === 'APPROVED',
        ocrReviewCompleted: isOcrReviewed
      });

      setTasks(activeTasks);
    }
  }, [shifts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center text-[#666666] text-xs font-bold font-mono">
        <span>Retrieving daily command metrics...</span>
      </div>
    );
  }

  const activeShift = activeShifts[0];

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] pb-20 font-sans">
      {/* Header bar */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-[#EBEBEA] bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400]">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-[#1A1A1A]">
              DAILY COMMAND CENTER
            </h1>
            <p className="text-[9px] text-[#666666] font-bold uppercase tracking-wider">HINDUSTAN PETROLEUM ERP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-3 rounded-2xl border transition-all cursor-pointer min-h-[48px] ${
              sunlightMode 
                ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100' 
                : 'bg-white border-[#D9D9D6] hover:bg-[#F3F3F1] text-[#1A1A1A]'
            }`}
          >
            {sunlightMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-600 animate-spin-slow" />}
            {sunlightMode ? 'Attendant Shade' : 'Sunlight Mode'}
          </button>

          <button
            onClick={() => navigate('/operations/shifts/open')}
            className="px-5 py-3 bg-[#D35400] hover:bg-[#A04000] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 min-h-[48px] cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" /> Start Shift Float
          </button>
        </div>
      </nav>

      {/* Workspace Grid */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Real-time Hardware, Sync, and Diagnostic HUD */}
        <OperationsHealthPanel />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Shift register workspace details */}
          <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#666666] mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D35400]" /> Active Station Shift Register
            </h3>
            
            {activeShift ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-black text-[#1A1A1A]">{activeShift.shiftLabel || 'Morning Attendant Shift'}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-black uppercase ${
                        activeShift.status === 'APPROVED' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {activeShift.status === 'APPROVED' ? 'LOCKED' : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#666666] font-mono mt-1">
                      ID: {activeShift.id} • Date: {activeShift.shiftDate}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/operations/shift-workspace`)}
                    className="px-5 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase tracking-wider rounded-2xl min-h-[48px] flex items-center gap-1 cursor-pointer"
                  >
                    Open Workspace <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Dashboard Metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl p-4">
                    <span className="text-[9px] font-black uppercase text-[#666666]">Opening Cash</span>
                    <span className="text-base font-black text-[#1A1A1A] block mt-1">₹{Number(activeShift.openingCash).toLocaleString()}</span>
                  </div>
                  <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl p-4">
                    <span className="text-[9px] font-black uppercase text-[#666666]">Expenses</span>
                    <span className="text-base font-black text-[#1A1A1A] block mt-1">₹{Number(activeShift.expenses).toLocaleString()}</span>
                  </div>
                  <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl p-4">
                    <span className="text-[9px] font-black uppercase text-[#666666]">UPI Collections</span>
                    <span className="text-base font-black text-[#1A1A1A] block mt-1">₹{Number(activeShift.upiSales).toLocaleString()}</span>
                  </div>
                  <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl p-4">
                    <span className="text-[9px] font-black uppercase text-[#666666]">Credit Sales</span>
                    <span className="text-base font-black text-[#1A1A1A] block mt-1">₹{Number(activeShift.creditSales).toLocaleString()}</span>
                  </div>
                </div>

                {/* Operational Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button 
                    onClick={() => navigate('/operations/reconciliation')}
                    className="p-4 bg-white border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl text-left transition-colors flex items-center justify-between group min-h-[64px]"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#666666] block">Reconciliation Center</span>
                      <span className="text-xs font-bold text-[#D35400] mt-0.5 block flex items-center gap-1">Validate sources</span>
                    </div>
                    <Layers className="w-4 h-4 text-[#D35400]" />
                  </button>

                  <button 
                    onClick={() => navigate('/operations/wetstock')}
                    className="p-4 bg-white border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl text-left transition-colors flex items-center justify-between group min-h-[64px]"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#666666] block">Wetstock Dips</span>
                      <span className="text-xs font-bold text-[#D35400] mt-0.5 block flex items-center gap-1">Monitor shrinkage</span>
                    </div>
                    <Thermometer className="w-4 h-4 text-[#D35400]" />
                  </button>

                  <button 
                    onClick={() => navigate('/operations/credit')}
                    className="p-4 bg-white border border-[#EBEBEA] hover:border-[#B3B3B3] rounded-2xl text-left transition-colors flex items-center justify-between group min-h-[64px]"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#666666] block">Credit Customers</span>
                      <span className="text-xs font-bold text-[#D35400] mt-0.5 block flex items-center gap-1">Outstanding collections</span>
                    </div>
                    <CreditCard className="w-4 h-4 text-[#D35400]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[#999999] border-2 border-dashed border-[#D9D9D6] rounded-2xl bg-[#F9F9F8]">
                No active shifts initialized. Start a shift float above to begin.
              </div>
            )}
          </div>

          {/* Quick-links secondary row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#666666] mb-4 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#1565C0]" /> Digital Collections Hub
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed mb-4">
                Verify Paytm, PhonePe, and Card receipts logs. Auto-match settlement reports with bank deposits.
              </p>
              <button 
                onClick={() => navigate('/operations/digital')}
                className="w-full py-3 bg-[#F3F3F1] hover:bg-[#EBEBEA] text-[#1A1A1A] border border-[#D9D9D6] rounded-xl text-xs font-bold uppercase tracking-wider min-h-[44px] cursor-pointer"
              >
                Open Collections Workspace
              </button>
            </div>

            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#666666] mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#2E7D32]" /> Reporting Console
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed mb-4">
                Export comprehensive daily operations closing summaries, GST ledgers, and attendant shortage audit reports.
              </p>
              <button 
                onClick={() => navigate('/operations/reports')}
                className="w-full py-3 bg-[#F3F3F1] hover:bg-[#EBEBEA] text-[#1A1A1A] border border-[#D9D9D6] rounded-xl text-xs font-bold uppercase tracking-wider min-h-[44px] cursor-pointer"
              >
                View Reporting Center
              </button>
            </div>
          </div>

          {/* Supervisor Recovery assistant Console */}
          <RecoveryAssistant />
        </div>

        {/* Dynamic Operator task list sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#666666] mb-4 flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-[#2E7D32]" /> Operations Checklist
            </h3>

            {tasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#2E7D32] bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center p-4">
                <ShieldCheck className="w-8 h-8 mb-2 animate-bounce" />
                <strong className="block font-black uppercase text-[10px]">ALL SYSTEMS CLEAR</strong>
                <span className="text-[9.5px] mt-1">Ready for shift lock sealing.</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => navigate(task.actionPath)}
                    className="p-4 bg-[#F9F9F8] hover:bg-[#F3F3F1] border border-[#EBEBEA] rounded-2xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <AlertOctagon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#1A1A1A]">{task.title}</h4>
                      <p className="text-[9.5px] text-[#666666] mt-1 leading-relaxed">{task.description}</p>
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-[#D35400] block mt-2">
                        Resolve &gt;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
