/**
 * OperationsAlertsCenter.tsx
 * Premium operations alert control terminal and incident manager.
 * Features customizable notification triggers, real-time alert logs, and response controllers.
 */

import React, { useState, useEffect } from "react";
import { 
  Bell, ShieldAlert, Wifi, MessageSquare, Send, CheckCircle, 
  Settings, Volume2, PlusCircle, RefreshCw, Smartphone
} from "lucide-react";
import { IncidentEscalationEngine, type IncidentRecord } from "../modules/alerts/services/IncidentEscalationEngine";
import { AlertDispatchEngine, type DispatchLog } from "../modules/alerts/services/AlertDispatchEngine";
import { RealtimeAnomalyMonitor } from "../modules/alerts/services/RealtimeAnomalyMonitor";

export default function OperationsAlertsCenter() {
  const branchId = "branch_central_hq_9";
  
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  
  // Custom Action inputs
  const [actionComments, setActionComments] = useState<Record<string, string>>({});
  
  // Custom threshold parameters
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [smtpEnabled, setSmtpEnabled] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setIncidents(IncidentEscalationEngine.getIncidents());
    setDispatchLogs(AlertDispatchEngine.getHistory());
  };

  const handleTriggerMockAnomaly = async (type: "payment" | "leak" | "lock_mutation" | "ocr_fail") => {
    if (type === "payment") {
      await RealtimeAnomalyMonitor.monitorPaymentSettlements(branchId, 14500.00, 14250.00);
    } else if (type === "leak") {
      await RealtimeAnomalyMonitor.monitorWetstockVariance(branchId, "tank_ms_01", -145.50);
    } else if (type === "lock_mutation") {
      await RealtimeAnomalyMonitor.monitorPeriodLockMutations(branchId, "MH_PERIOD_APRIL_2026", "operator_active_user_1");
    } else if (type === "ocr_fail") {
      await RealtimeAnomalyMonitor.monitorOcrIngestionFailures(branchId, "daily_sheet_hpcl_folded.jpg", 54.5);
    }
    loadLogs();
  };

  const handleUpdateStatus = (id: string, nextStatus: "acknowledged" | "resolved") => {
    const comment = actionComments[id] || "Attendant team dispatched to verify physical meters.";
    IncidentEscalationEngine.updateIncidentStatus(id, nextStatus, comment);
    
    // Clear comment input field
    setActionComments(prev => ({ ...prev, [id]: "" }));
    loadLogs();
  };

  const handlePurgeHistory = () => {
    IncidentEscalationEngine.purgeIncidents();
    loadLogs();
  };

  return (
    <div className="min-h-screen text-slate-100 p-8 flex flex-col gap-8">
      
      {/* Alert Center Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-rose-400 bg-rose-950/50 border border-rose-900 px-3 py-1 rounded-full">
            Phase 4: Enterprise Alerting & Incident Response
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
            Operations Alerts Center
          </h1>
        </div>

        {/* Action controls */}
        <div className="flex gap-3">
          <button 
            onClick={handlePurgeHistory}
            className="px-4 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl cursor-pointer text-rose-400 font-semibold"
          >
            Clear Active Incident Logs
          </button>
        </div>
      </div>

      {/* Main split dashboard grids */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* PANEL 1: Active Incidents Board */}
        <div className="xl:col-span-2 p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-6">
          <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Active Security & Audit Incidents
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Total Raised: {incidents.filter(i => i.status !== "resolved").length} Active
            </span>
          </div>

          {/* Simulated anomalies triggers panel */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col gap-3">
            <span className="text-xs text-slate-400 font-semibold uppercase">Inject Mock Failure Events (Ledger Replay Confirmed)</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button 
                onClick={() => handleTriggerMockAnomaly("payment")}
                className="py-2 px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold"
              >
                ₹ UPI Mismatch
              </button>
              <button 
                onClick={() => handleTriggerMockAnomaly("leak")}
                className="py-2 px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold"
              >
                🛢️ Volumetric Leak
              </button>
              <button 
                onClick={() => handleTriggerMockAnomaly("lock_mutation")}
                className="py-2 px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold"
              >
                🔒 Lock Violation
              </button>
              <button 
                onClick={() => handleTriggerMockAnomaly("ocr_fail")}
                className="py-2 px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold"
              >
                📸 Low OCR Ingest
              </button>
            </div>
          </div>

          {/* Active Incidents List Cards */}
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px]">
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-8">No incident alerts raised. Monitoring channels active.</p>
            ) : (
              [...incidents].reverse().map(incident => (
                <div key={incident.id} className="p-5 bg-slate-950 border border-slate-900 rounded-2xl flex flex-col gap-4">
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        incident.severity === "critical_emergency" ? "bg-rose-950 text-rose-400 border border-rose-900" :
                        incident.severity === "medium_severity" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                        "bg-slate-900 text-slate-400"
                      }`}>
                        {incident.severity}
                      </span>
                      <h3 className="text-sm font-bold text-slate-200">{incident.title}</h3>
                    </div>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      incident.status === "resolved" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                      incident.status === "acknowledged" ? "bg-blue-950 text-blue-400 border border-blue-900 animate-pulse" :
                      "bg-rose-950 text-rose-400 border border-rose-900"
                    }`}>
                      {incident.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>

                  {/* Actions Taken Audit Trail */}
                  {incident.actionsTaken.length > 0 && (
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-900 flex flex-col gap-1 text-[11px] text-slate-500 font-mono">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Intervention Log:</span>
                      {incident.actionsTaken.map((act, index) => (
                        <span key={index} className="block">{act}</span>
                      ))}
                    </div>
                  )}

                  {/* Incident actions trigger inputs */}
                  {incident.status !== "resolved" && (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add resolution or acknowledgment comments ..."
                        value={actionComments[incident.id] || ""}
                        onChange={e => setActionComments({ ...actionComments, [incident.id]: e.target.value })}
                        className="flex-1 p-2 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                      />
                      
                      <button 
                        onClick={() => handleUpdateStatus(incident.id, "acknowledged")}
                        className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 rounded-lg cursor-pointer font-semibold"
                      >
                        Acknowledge
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(incident.id, "resolved")}
                        className="px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer font-bold"
                      >
                        Resolve
                      </button>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

        </div>

        {/* PANEL 2: Communications Webhooks Config & Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Notification channel toggles */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Notification Delivery Channels
            </h2>
            
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl cursor-pointer hover:bg-slate-900/35">
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  WhatsApp Business API
                </span>
                <input 
                  type="checkbox" 
                  checked={whatsappEnabled} 
                  onChange={() => setWhatsappEnabled(!whatsappEnabled)}
                  className="w-4 h-4 accent-emerald-400"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl cursor-pointer hover:bg-slate-900/35">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Telegram Bot Webhook
                </span>
                <input 
                  type="checkbox" 
                  checked={telegramEnabled} 
                  onChange={() => setTelegramEnabled(!telegramEnabled)}
                  className="w-4 h-4 accent-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl cursor-pointer hover:bg-slate-900/35">
                <span className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  SMTP email dispatch
                </span>
                <input 
                  type="checkbox" 
                  checked={smtpEnabled} 
                  onChange={() => setSmtpEnabled(!smtpEnabled)}
                  className="w-4 h-4 accent-purple-400"
                />
              </label>
            </div>
          </div>

          {/* External Dispatches API Logs */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Webhook Dispatches Trail
            </h2>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px]">
              {dispatchLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-6">No API webhook dispatches sent yet.</p>
              ) : (
                [...dispatchLogs].reverse().map(log => (
                  <div key={log.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-1.5 font-mono text-[10px]">
                    <div className="flex justify-between items-center font-bold">
                      <span className="uppercase text-blue-400">{log.channel}</span>
                      <span className={log.success ? "text-emerald-400" : "text-rose-400"}>
                        {log.success ? "DELIVERED" : "SUPPRESSED"}
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed truncate">{log.body}</p>
                    <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
