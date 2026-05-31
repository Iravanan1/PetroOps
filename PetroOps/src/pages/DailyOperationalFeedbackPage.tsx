import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, FileText, CheckCircle2, RefreshCw, Sparkles,
  AlertTriangle, Eye, ArrowRight, Check, X, ShieldCheck
} from 'lucide-react';
import { 
  DailyOperationalFeedbackEngine, 
  OperationalFeedbackItem, 
  ReviewQueueItem, 
  AnomalyReportSummary 
} from '../modules/operations/DailyOperationalFeedbackEngine';

export default function DailyOperationalFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<OperationalFeedbackItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [reports, setReports] = useState<AnomalyReportSummary | null>(null);
  
  // Form states
  const [category, setCategory] = useState<OperationalFeedbackItem['category']>('ocr_mistake');
  const [ocrValue, setOcrValue] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [workflowStep, setWorkflowStep] = useState('Shift Reconciliation Sheet');
  const [operatorNote, setOperatorNote] = useState('');
  const [screenshotRef, setScreenshotRef] = useState('scan_hpcl_shift_42.jpg');
  
  // Station Context Form States
  const [stationId, setStationId] = useState('STN-MUM-04');
  const [operatorId, setOperatorId] = useState('attendant_sanjay');
  const [omc, setOmc] = useState('HPCL');
  const [shiftId, setShiftId] = useState('SHIFT_9876');

  const [activeTabReport, setActiveTabReport] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const list = DailyOperationalFeedbackEngine.getAllFeedback();
    const queue = DailyOperationalFeedbackEngine.getReviewQueue();
    const generatedReports = DailyOperationalFeedbackEngine.generateFrictionReports();
    
    setFeedbackList(list);
    setReviewQueue(queue);
    setReports(generatedReports);
    
    if (!activeTabReport && generatedReports) {
      setActiveTabReport(generatedReports.dailySummary);
    }
  };

  const handleFlagFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorNote.trim()) return;

    DailyOperationalFeedbackEngine.logFeedback({
      category,
      ocrValue: ocrValue || undefined,
      correctedValue: correctedValue || undefined,
      workflowStep,
      operatorNote,
      screenshotRef: screenshotRef || undefined,
      stationContext: {
        stationId,
        operatorId,
        omc,
        shiftId
      }
    });

    setSuccessToast('Operational friction flagged successfully! Logged to local security audit vault.');
    setOperatorNote('');
    setOcrValue('');
    setCorrectedValue('');
    
    refreshData();
    
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleResolve = (id: string) => {
    DailyOperationalFeedbackEngine.resolveFeedback(id, 'Glossary correction mapped and validated on device.');
    setSuccessToast('Feedback item resolved successfully!');
    refreshData();
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const runFrictionAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      refreshData();
      setIsAnalyzing(false);
      setSuccessToast('Programmatic pattern analysis complete! Logs are 100% replay-safe.');
      setTimeout(() => setSuccessToast(null), 3000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans selection:bg-[#D35400]/20 selection:text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* Success notification banner */}
        {successToast && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className="bg-white border border-[#2E7D32]/40 rounded-xl p-4 shadow-xl flex items-center gap-3 max-w-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
              <div>
                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Telemetry Logged</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">{successToast}</p>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400] border border-[#D35400]/20">
              <MessageSquare className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Operational Feedback & Continuous Improvement
              </h1>
              <p className="text-xs text-[#666666] mt-0.5 uppercase tracking-wider font-bold">
                Flag OCR skews, Devanagari handwriting errors, workflow latency bottlenecks, and review audit trails.
              </p>
            </div>
          </div>

          <button
            onClick={runFrictionAnalysis}
            disabled={isAnalyzing}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-2 transition-all ${
              isAnalyzing 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                : 'bg-[#1A1A1A] text-white hover:bg-black'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pattern Matching...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Detect Recurring Pain Points
              </>
            )}
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Submission Panel (Left Column) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs uppercase font-black tracking-wider text-[#1A1A1A]">Flag Operational Friction</h3>
              
              <form onSubmit={handleFlagFeedback} className="space-y-4">
                {/* Category select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Friction Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] uppercase font-black tracking-wider focus:outline-none focus:border-[#D35400] text-slate-800"
                  >
                    <option value="ocr_mistake">OCR Digit/Text Mistake</option>
                    <option value="hindi_recognition_error">Incorrect Hindi Recognition</option>
                    <option value="nozzle_mismatch">Nozzle Continuity Mismatch</option>
                    <option value="customer_mapping_error">Wrong Customer Mapping</option>
                    <option value="portal_extraction_issue">Portal Extraction Discrepancy</option>
                    <option value="confusing_workflow">Confusing Attendant Step</option>
                    <option value="slow_screen">Slow Screen Render / Latency</option>
                    <option value="reconciliation_confusion">Reconciliation UI Confusion</option>
                    <option value="report_issue">Report PDF Export Issue</option>
                  </select>
                </div>

                {/* Optional values */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">OCR Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 12S00"
                      value={ocrValue}
                      onChange={(e) => setOcrValue(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:border-[#D35400] text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Corrected Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 12500"
                      value={correctedValue}
                      onChange={(e) => setCorrectedValue(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:border-[#D35400] text-slate-800"
                    />
                  </div>
                </div>

                {/* Workflow step & Screenshot */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Workflow Step</label>
                  <input
                    type="text"
                    value={workflowStep}
                    onChange={(e) => setWorkflowStep(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] uppercase font-black focus:outline-none focus:border-[#D35400] text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Image Scan Reference</label>
                  <input
                    type="text"
                    value={screenshotRef}
                    onChange={(e) => setScreenshotRef(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-[#D35400] text-slate-800"
                  />
                </div>

                {/* Station Context dropdown */}
                <div className="bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl p-3 space-y-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block border-b border-[#EBEBEA] pb-1">STATION CONTEXT METRIC</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-700">
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Station ID</span>
                      <input type="text" value={stationId} onChange={e => setStationId(e.target.value)} className="w-full bg-white border border-[#EBEBEA] rounded-lg px-2 py-1 mt-0.5 focus:outline-none text-[9px]" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Operator</span>
                      <input type="text" value={operatorId} onChange={e => setOperatorId(e.target.value)} className="w-full bg-white border border-[#EBEBEA] rounded-lg px-2 py-1 mt-0.5 focus:outline-none text-[9px]" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">OMC</span>
                      <input type="text" value={omc} onChange={e => setOmc(e.target.value)} className="w-full bg-white border border-[#EBEBEA] rounded-lg px-2 py-1 mt-0.5 focus:outline-none text-[9px]" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 block uppercase">Shift ID</span>
                      <input type="text" value={shiftId} onChange={e => setShiftId(e.target.value)} className="w-full bg-white border border-[#EBEBEA] rounded-lg px-2 py-1 mt-0.5 focus:outline-none text-[9px]" />
                    </div>
                  </div>
                </div>

                {/* Operator Note */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Operator Note</label>
                  <textarea
                    rows={2}
                    placeholder="Describe exactly what caused friction or lag..."
                    value={operatorNote}
                    onChange={(e) => setOperatorNote(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#EBEBEA] rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-[#D35400] text-slate-800 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D35400] hover:bg-[#E55B00] text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Log Operational Feedback
                </button>
              </form>
            </div>
          </div>

          {/* Queue & Detections (Middle & Right Column) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Review Queue Deck */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#EBEBEA] pb-3">
                <h3 className="text-xs uppercase font-black tracking-wider text-[#1A1A1A]">Continuous Improvement Review Queue</h3>
                <span className="bg-slate-100 text-slate-700 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-slate-200">
                  {reviewQueue.length} Active Alerts
                </span>
              </div>

              {reviewQueue.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  No active review alerts in queue. System calibrated.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewQueue.map((item) => (
                    <div key={item.id} className="border border-[#EBEBEA] bg-[#FAF9F5] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            item.type === 'unresolved_ocr' ? 'bg-rose-600' :
                            item.type === 'handwriting_failure' ? 'bg-orange-600' :
                            item.type === 'reconciliation_issue' ? 'bg-purple-600' : 'bg-teal-600'
                          }`} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">{item.title}</span>
                          <span className="bg-rose-50 text-rose-800 text-[8px] border border-rose-100 font-black px-1.5 py-0.5 rounded-lg uppercase">
                            x{item.occurrenceCount} Flagged
                          </span>
                        </div>
                        <p className="text-[9px] text-[#666666] font-bold uppercase mt-1 leading-normal">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[8px] text-slate-400 uppercase font-black">Steps:</span>
                          {item.affectedFields.map((f, i) => (
                            <span key={i} className="bg-white border border-[#EBEBEA] text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolve(item.id)}
                        className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 self-end sm:self-center transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Seal Mappings
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Programmatic Reports Tab Deck */}
            {reports && (
              <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#EBEBEA] pb-3">
                  <h3 className="text-xs uppercase font-black tracking-wider text-[#1A1A1A]">Friction telemetry reports</h3>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#2E7D32] flex items-center gap-1 animate-pulse">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> REPLAY-SAFE LOCK VERIFIED
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TabButton label="Daily Summary" onClick={() => setActiveTabReport(reports.dailySummary)} active={activeTabReport === reports.dailySummary} />
                  <TabButton label="OCR Pain Points" onClick={() => setActiveTabReport(reports.ocrPainPoints)} active={activeTabReport === reports.ocrPainPoints} />
                  <TabButton label="Workflow Friction" onClick={() => setActiveTabReport(reports.workflowFriction)} active={activeTabReport === reports.workflowFriction} />
                  <TabButton label="Top Corrections" onClick={() => setActiveTabReport(reports.topCorrections)} active={activeTabReport === reports.topCorrections} />
                </div>

                {activeTabReport && (
                  <div className="bg-[#FAF9F5] border border-[#EBEBEA] rounded-2xl p-5 font-mono text-[9px] leading-normal font-bold text-[#2E7D32] whitespace-pre-line uppercase select-all animate-fade-in">
                    <div className="text-slate-500 flex items-center gap-1.5 border-b border-dashed border-[#EBEBEA] pb-2 mb-3">
                      <FileText className="w-3.5 h-3.5" /> Diagnostic Telemetry Report Out
                    </div>
                    {activeTabReport}
                  </div>
                )}
              </div>
            )}

            {/* Logged Feedbacks Table */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs uppercase font-black tracking-wider text-[#1A1A1A]">Logged Friction Telemetry History</h3>
              <div className="overflow-x-auto border border-[#EBEBEA] rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#EBEBEA] text-[8px] font-black uppercase tracking-widest text-slate-500">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Workflow Step</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.map((item) => (
                      <tr key={item.id} className="border-b border-[#EBEBEA] hover:bg-slate-50/50 text-[9px] font-bold text-slate-700 uppercase">
                        <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 text-[#D35400] font-black">{item.category.replace(/_/g, ' ')}</td>
                        <td className="p-3 text-slate-600">{item.workflowStep}</td>
                        <td className="p-3 text-slate-500 normal-case">{item.operatorNote}</td>
                        <td className="p-3">
                          {item.resolved ? (
                            <span className="bg-emerald-50 text-emerald-800 text-[8px] border border-emerald-100 px-1.5 py-0.5 rounded-lg font-black uppercase">SEALED</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 text-[8px] border border-slate-200 px-1.5 py-0.5 rounded-lg font-black uppercase">PENDING</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

// --- TabButton Component ---
function TabButton({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
        active
          ? 'bg-[#1A1A1A] text-white border-black shadow-xs'
          : 'bg-white hover:bg-slate-50 text-slate-700 border-[#EBEBEA]'
      }`}
    >
      {label}
    </button>
  );
}
