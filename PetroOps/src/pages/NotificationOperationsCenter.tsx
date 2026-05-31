import React, { useState, useEffect } from "react";
import { 
  Bell, AlertTriangle, Send, RefreshCw, Terminal, CheckCircle, 
  Mail, MessageSquare, AlertCircle, Eye, Settings, Play, Database, Heart
} from "lucide-react";
import { NotificationQueueEngine, NotificationPayload } from "../modules/notifications/NotificationQueueEngine";
import { DeliveryRetryEngine } from "../modules/notifications/DeliveryRetryEngine";
import { NotificationTemplateRegistry } from "../modules/notifications/NotificationTemplateRegistry";
import { DeliveryAuditEngine, DeliveryReceipt } from "../modules/notifications/DeliveryAuditEngine";

// Static instance bindings
const queueEngine = new NotificationQueueEngine();
const retryEngine = new DeliveryRetryEngine();
const templateRegistry = new NotificationTemplateRegistry();
const auditEngine = new DeliveryAuditEngine();

export default function NotificationOperationsCenter() {
  const [activeTab, setActiveTab] = useState<"QUEUE" | "TEMPLATES" | "AUDITS">("QUEUE");

  // Core structures states
  const [queue, setQueue] = useState<NotificationPayload[]>([]);
  const [auditLogs, setAuditLogs] = useState<DeliveryReceipt[]>([]);

  // Simulation forms
  const [simTitle, setSimTitle] = useState<string>("Wetstock Leak Warning");
  const [simMessage, setSimMessage] = useState<string>("Variance of -152 liters detected on Tank T2.");
  const [simSeverity, setSimSeverity] = useState<"INFO" | "WARNING" | "CRITICAL">("WARNING");
  const [simCategory, setSimCategory] = useState<"WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT">("WETSTOCK_VARIANCE");
  const [selectedChannels, setSelectedChannels] = useState<Array<"WHATSAPP" | "TELEGRAM" | "EMAIL">>(["TELEGRAM"]);

  // Compilers inputs
  const [compCategory, setCompCategory] = useState<"WETSTOCK_VARIANCE" | "SECURITY_TAMPER" | "PAYMENT_DISPUTE" | "HARDWARE_FAULT">("WETSTOCK_VARIANCE");
  const [compiledTelegram, setCompiledTelegram] = useState<string>("");

  // Sync state
  useEffect(() => {
    setQueue(queueEngine.getQueue());
    setAuditLogs(auditEngine.getLogs());
  }, []);

  // Recalculate template compiler preview
  useEffect(() => {
    const preview = templateRegistry.compileTelegramAlert(compCategory, {
      title: compCategory === "WETSTOCK_VARIANCE" ? "Wetstock Alert" : compCategory === "SECURITY_TAMPER" ? "Security Breach" : "Discrepancy Logged",
      message: compCategory === "WETSTOCK_VARIANCE" ? "Volume deviation of 210 liters." : compCategory === "SECURITY_TAMPER" ? "Tampered signature ACC_STAFF." : "SBI deposit matched Rs. 500 short.",
      severity: "CRITICAL",
      timestamp: new Date().toLocaleString()
    });
    setCompiledTelegram(preview);
  }, [compCategory]);

  // Dispatch manual notification simulation
  const handleEnqueue = () => {
    if (!simTitle || !simMessage) return;
    
    // 1. Enqueue payload
    const notif = queueEngine.enqueue(simTitle, simMessage, simSeverity, simCategory, selectedChannels);
    setQueue([...queueEngine.getQueue()]);

    // 2. Trigger async transmission simulation
    selectedChannels.forEach(async (chan) => {
      const startTime = Date.now();
      const success = await retryEngine.transmitToChannel(chan, simMessage);
      const latency = Date.now() - startTime;
      
      const gwResponse = success 
        ? JSON.stringify({ message: "Delivered successfully", id: `GW_${Math.floor(1000 + Math.random() * 9000)}` })
        : JSON.stringify({ error: "Gateway network timeout", code: 504 });

      // Record audit receipt
      auditEngine.logReceipt(
        notif.notificationId,
        chan,
        chan === "EMAIL" ? "owner@pumpai.com" : chan === "WHATSAPP" ? "+91-9876543210" : "chat_id_77812",
        success,
        gwResponse,
        latency
      );

      // Update queue state status
      if (success) {
        queueEngine.updateStatus(notif.notificationId, "SENT", 0);
      } else {
        const retryAudit = retryEngine.evaluateRetry({ ...notif, deliveryStatus: "FAILED" });
        queueEngine.updateStatus(notif.notificationId, retryAudit.updatedStatus, retryAudit.newAttemptCount);
      }

      setQueue([...queueEngine.getQueue()]);
      setAuditLogs([...auditEngine.getLogs()]);
    });

    // Reset fields
    setSimTitle("");
    setSimMessage("");
  };

  const handleChannelToggle = (chan: "WHATSAPP" | "TELEGRAM" | "EMAIL") => {
    setSelectedChannels(prev => {
      if (prev.includes(chan)) {
        return prev.filter(c => c !== chan);
      }
      return [...prev, chan];
    });
  };

  // Dispatch outstanding queued/failed retry runs
  const handleRetrySweep = () => {
    queue.forEach(async (n) => {
      if (n.deliveryStatus === "RETRYING" || n.deliveryStatus === "FAILED") {
        n.channels.forEach(async (chan) => {
          const startTime = Date.now();
          const success = await retryEngine.transmitToChannel(chan, n.message);
          const latency = Date.now() - startTime;

          auditEngine.logReceipt(
            n.notificationId,
            chan,
            chan === "EMAIL" ? "owner@pumpai.com" : "+91-9876543210",
            success,
            success ? "{\"retry\":\"SUCCESS\"}" : "{\"retry\":\"FAILED_MAX_LIMIT\"}",
            latency
          );

          if (success) {
            queueEngine.updateStatus(n.notificationId, "SENT", n.retryAttempts);
          } else {
            const evaluation = retryEngine.evaluateRetry(n);
            queueEngine.updateStatus(n.notificationId, evaluation.updatedStatus, evaluation.newAttemptCount);
          }
        });
      }
    });

    setQueue([...queueEngine.getQueue()]);
    setAuditLogs([...auditEngine.getLogs()]);
  };

  // Count metrics
  const criticalCount = queue.filter(n => n.severity === "CRITICAL").length;
  const warningsCount = queue.filter(n => n.severity === "WARNING").length;
  const dispatchFailures = queue.filter(n => n.deliveryStatus === "FAILED").length;

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-[#e2e8f0]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent uppercase font-sans">
            Alerts & Notifications Dispatch Operations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage event-driven outgoing notifications queue, calibrate templates, and track delivery retry backoff audits
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800/80 pb-4 mb-8">
        <button 
          onClick={() => setActiveTab("QUEUE")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "QUEUE" 
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold" 
              : "text-slate-400 hover:bg-slate-900"
          }`}
        >
          <Bell className="w-4 h-4" /> Live Queue Hub ({queue.length})
        </button>
        <button 
          onClick={() => setActiveTab("TEMPLATES")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "TEMPLATES" 
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold" 
              : "text-slate-400 hover:bg-slate-900"
          }`}
        >
          <Eye className="w-4 h-4" /> Templates Compiler
        </button>
        <button 
          onClick={() => setActiveTab("AUDITS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "AUDITS" 
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold" 
              : "text-slate-400 hover:bg-slate-900"
          }`}
        >
          <Database className="w-4 h-4" /> Outbound Delivery Audit ({auditLogs.length})
        </button>
      </div>

      {/* QUEUE & RETRIES TAB */}
      {activeTab === "QUEUE" && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-500/30 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Critical anomalies spooled</span>
                <div className="text-3xl font-extrabold text-rose-400 mt-2 font-mono">{criticalCount} Active</div>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-400 animate-pulse" />
            </div>

            <div className="p-5 rounded-2xl bg-amber-950/10 border border-amber-500/30 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Warning notifications</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-2 font-mono">{warningsCount} Queued</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <div className="p-5 rounded-2xl bg-[#0b1329]/40 border border-slate-800/60 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Failed dispatch routes</span>
                <div className="text-3xl font-extrabold text-slate-200 mt-2 font-mono">{dispatchFailures} Failed</div>
              </div>
              <RefreshCw className="w-8 h-8 text-slate-500" />
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Queue Spool Table */}
            <div className="lg:col-span-2 bg-[#0b1329]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                  <Heart className="text-blue-400 w-5 h-5" /> Queue Dispatch Workbench
                </h2>
                <button 
                  onClick={handleRetrySweep}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Force Retry Sweep
                </button>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {queue.map((n) => (
                  <div key={n.notificationId} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between gap-4 transition-all ${
                    n.severity === "CRITICAL" ? "bg-rose-950/10 border-rose-500/25" : "bg-slate-900/40 border-slate-800/60"
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                          {n.notificationId}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                          n.severity === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          n.severity === "WARNING" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {n.severity}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mt-2">{n.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">{n.message}</p>
                      <div className="text-[10px] text-slate-500 mt-2 font-mono">{new Date(n.timestamp).toLocaleString()}</div>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between items-end gap-2 text-right">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                        n.deliveryStatus === "SENT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        n.deliveryStatus === "FAILED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {n.deliveryStatus} {n.retryAttempts > 0 && `(Retry #${n.retryAttempts})`}
                      </span>

                      <div className="flex gap-1">
                        {n.channels.map((chan) => (
                          <span key={chan} className="p-1 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[9px] font-bold uppercase" title={chan}>
                            {chan === "EMAIL" ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingest simulator compiler tool */}
            <div className="bg-[#0b1329]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 uppercase tracking-wide">
                <Send className="text-blue-400 w-5 h-5" /> Simulate Outbound Incident Dispatch
              </h2>

              <div className="space-y-4 text-xs mb-6">
                <div>
                  <label className="text-slate-500 block mb-1">Alert Title</label>
                  <input 
                    type="text" 
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Alert Message</label>
                  <textarea 
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-300"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 block mb-1">Severity</label>
                    <select 
                      value={simSeverity}
                      onChange={(e: any) => setSimSeverity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                    >
                      <option value="INFO">Info Bulletin</option>
                      <option value="WARNING">Warning alert</option>
                      <option value="CRITICAL">Critical anomaly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Incident Category</label>
                    <select 
                      value={simCategory}
                      onChange={(e: any) => setSimCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300"
                    >
                      <option value="WETSTOCK_VARIANCE">Wetstock leak/evaporation</option>
                      <option value="SECURITY_TAMPER">Ledger hash compromise</option>
                      <option value="PAYMENT_DISPUTE">PhonePe/Paytm dispute</option>
                      <option value="HARDWARE_FAULT">ATG/Nozzle offline</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-2">Delivery Channels</label>
                  <div className="flex gap-2">
                    {["TELEGRAM", "WHATSAPP", "EMAIL"].map((c: any) => (
                      <button 
                        key={c}
                        onClick={() => handleChannelToggle(c)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                          selectedChannels.includes(c) 
                            ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold" 
                            : "bg-slate-950 border-slate-900 text-slate-500"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleEnqueue}
                disabled={!simTitle || !simMessage || selectedChannels.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg disabled:opacity-50"
              >
                Spool Alert Outbound
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TEMPLATE COMPILER PREVIEW TAB */}
      {activeTab === "TEMPLATES" && (
        <div className="bg-[#0b1329]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
              <Settings className="text-blue-400 w-5 h-5" /> Outgoing Templates Registry Compiler
            </h2>
            
            <select 
              value={compCategory}
              onChange={(e: any) => setCompCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="WETSTOCK_VARIANCE">Wetstock Leak Alert Format</option>
              <option value="SECURITY_TAMPER">Ledger Security Breach Format</option>
              <option value="PAYMENT_DISPUTE">Reconciliation Dispute Format</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Telegram Bot Markdown Preview</h3>
              <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-6 font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                {compiledTelegram}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp HSM Template Registry Parameters</h3>
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs space-y-3 leading-normal">
                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">HSM Meta Name</span>
                  <span className="font-bold text-slate-200">{templateRegistry.getTemplate(compCategory)?.whatsappTemplateName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Category Scope</span>
                  <span className="font-bold text-slate-200">UTILITY_INCIDENT_DISPATCH</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[9px] font-bold">Language Parameters</span>
                  <span className="font-bold text-slate-200">en_US (UTF-8 format)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* OUTBOUND AUDITS TAB */}
      {activeTab === "AUDITS" && (
        <div className="bg-[#0b1329]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 uppercase tracking-wide">
            <Terminal className="text-blue-400 w-5 h-5" /> Outbound Transmission Receipts Ledger
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                  <th className="py-3 px-4">Receipt ID</th>
                  <th className="py-3 px-4">Notification ID</th>
                  <th className="py-3 px-4 text-center">Channel</th>
                  <th className="py-3 px-4">Receiver Gateway Address</th>
                  <th className="py-3 px-4 text-right">Gateway Latency</th>
                  <th className="py-3 px-4 text-center">Dispatch Status</th>
                  <th className="py-3 px-4">Raw Gateway Response payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic font-sans">
                      No spooled transmission records archived. Send alerts to generate audit logs.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.receiptId} className="hover:bg-slate-900/30">
                      <td className="py-3.5 px-4 font-bold text-slate-300">{log.receiptId}</td>
                      <td className="py-3.5 px-4 text-slate-400">{log.notificationId}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-300 font-sans">
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">{log.destinationAddress}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">{log.latencyMs} ms</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-sans ${
                          log.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {log.success ? "SUCCESS_CLEAR" : "ROUTING_FAILED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[10px] break-all whitespace-pre-wrap select-all font-mono leading-normal max-w-[280px]">
                        {log.gatewayResponse}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
