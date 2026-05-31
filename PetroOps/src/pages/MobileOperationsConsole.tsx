import React, { useState, useEffect } from "react";
import { 
  Smartphone, Wifi, WifiOff, Camera, RefreshCw, Send, CheckCircle, Database, Plus, Trash2, ShieldAlert
} from "lucide-react";
import { MobileSyncEngine, SyncPayload } from "../mobile/MobileSyncEngine";
import { MobileOfflineQueue } from "../mobile/MobileOfflineQueue";
import { MobileCameraOCRBridge, CapturedImageDetails } from "../mobile/MobileCameraOCRBridge";
import { PushNotificationEngine } from "../mobile/PushNotificationEngine";

export default function MobileOperationsConsole() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<SyncPayload[]>([]);
  const [syncedVersion, setSyncedVersion] = useState(12); // Simulated server sequence

  // Form states
  const [shiftData, setShiftData] = useState({
    nozzleId: "nz-super-01",
    totalizerLiters: 14592,
    operatorSignature: "Op. Shreyansh"
  });

  const [ocrCapturedImage, setOcrCapturedImage] = useState<CapturedImageDetails | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // Sync Log traces
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Read spooled offline queue on component mounting
  useEffect(() => {
    setOfflineQueue(MobileOfflineQueue.getQueue());
  }, []);

  const handleNetworkToggle = () => {
    setIsOnline(prev => !prev);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Network state manually switched to: ${!isOnline ? "ONLINE" : "OFFLINE"}`, ...prev]);
  };

  const handleSubmitOfflineTransaction = () => {
    const payload = {
      operationType: "SUBMIT_NOZZLE_TOTALIZER" as const,
      sequenceNumber: syncedVersion + offlineQueue.length + 1,
      dataPayload: {
        nozzleId: shiftData.nozzleId,
        totalizerLiters: shiftData.totalizerLiters,
        operatorSignature: shiftData.operatorSignature,
        capturedImage: ocrCapturedImage?.base64Data ? "[Compressed Asset Attached]" : "None"
      }
    };

    // Save to LocalStorage queue
    const queuedEntry = MobileOfflineQueue.enqueue(payload);
    
    setOfflineQueue(prev => [...prev, queuedEntry]);
    setSyncLogs(prev => [`📥 [${new Date().toLocaleTimeString()}] Transaction spooled offline: Nozzle=${shiftData.nozzleId}, Liters=${shiftData.totalizerLiters}`, ...prev]);
    
    // Clear image
    setOcrCapturedImage(null);
    setCapturedFile(null);
  };

  const handleTriggerSync = async () => {
    if (!isOnline) {
      setSyncLogs(prev => [`🚨 [Sync Aborted] Cannot synchronize. Console is in OFFLINE mode.`, ...prev]);
      return;
    }

    if (offlineQueue.length === 0) {
      setSyncLogs(prev => [`[Sync aborted] Offline queue is empty.`, ...prev]);
      return;
    }

    setSyncing(true);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Establishing secure backend sync loop...`, ...prev]);

    // Simulated callback to confirm items
    const onSuccess = async (syncId: string) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Network delay simulation
      MobileOfflineQueue.dequeue(syncId);
      setSyncedVersion(prev => prev + 1);
    };

    // Collision callback
    const onCollision = (local: SyncPayload, serverSeq: number) => {
      // Re-index sequence to resolve collision
      return {
        ...local,
        sequenceNumber: serverSeq + 1
      };
    };

    try {
      const result = await MobileSyncEngine.executeSyncLoop(
        offlineQueue,
        syncedVersion,
        onSuccess,
        onCollision
      );

      const remaining = MobileOfflineQueue.getQueue();
      setOfflineQueue(remaining);
      setSyncLogs(prev => [
        `✅ [Sync Finished] Mapped ${result.syncedCount} items. Collisions resolved: ${result.collisionsResolved}. Server Sequence at: ${syncedVersion + result.syncedCount}`,
        ...prev
      ]);
    } catch (e: any) {
      setSyncLogs(prev => [`🚨 [Sync Failed] ${e.message}`, ...prev]);
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      try {
        setSyncLogs(prev => [`📷 [Camera] Compressing captured asset...`, ...prev]);
        const optimized = await MobileCameraOCRBridge.optimizeImageForOCR(file);
        setOcrCapturedImage(optimized);
        setSyncLogs(prev => [`📷 [Camera] Asset optimized successfully: width=${optimized.width}px, size=${(optimized.byteSize/1024).toFixed(1)} KB`, ...prev]);
      } catch (err: any) {
        setSyncLogs(prev => [`🚨 [Camera Failed] Image optimization failed: ${err.message}`, ...prev]);
      }
    }
  };

  const handleRegisterDevice = async () => {
    try {
      const registration = await PushNotificationEngine.registerDevice("user-shreyansh", "Web");
      setSyncLogs(prev => [`🔔 Registered device token: ${registration.token.substring(0, 24)}...`, ...prev]);
      
      // Send welcome push
      await PushNotificationEngine.sendPushNotification(registration.token, {
        title: "PumpAI Mobile Synced",
        body: "Your device is securely paired to Delhi Fuel Corp.",
        category: "COMPLIANCE",
        priority: "NORMAL"
      });
    } catch (e: any) {
      setSyncLogs(prev => [`🚨 Notification setup blocked: ${e.message}`, ...prev]);
    }
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans flex items-center justify-center">
      {/* Mobile/Tablet physical frame casing wrapper */}
      <div className="w-full max-w-4xl bg-[#090f1d] border border-slate-800 rounded-[30px] p-6 shadow-2xl relative overflow-hidden glass-panel">
        
        {/* Phone/Tablet Dynamic Casing Top Speaker Bar */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-4 w-40 bg-slate-950 rounded-b-xl border border-slate-900 flex justify-center items-center">
          <div className="h-1 w-16 bg-slate-800 rounded-full" />
        </div>

        {/* Console Header Bar */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Mobile Operator Cockpit
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline status pills */}
            <button 
              onClick={handleNetworkToggle}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                isOnline 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  ONLINE
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  OFFLINE
                </>
              )}
            </button>

            <button 
              onClick={handleRegisterDevice}
              className="text-[9px] px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition"
            >
              Link Device Push
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel: Ingestion shift inputs */}
          <div className="bg-[#0b1329]/50 border border-slate-800/60 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Offline Event Logger</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Fuel Nozzle ID</label>
                <select
                  value={shiftData.nozzleId}
                  onChange={(e) => setShiftData({ ...shiftData, nozzleId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="nz-super-01">nz-super-01 (Petrol Nozzle 1)</option>
                  <option value="nz-super-02">nz-super-02 (Petrol Nozzle 2)</option>
                  <option value="nz-diesel-01">nz-diesel-01 (Diesel Nozzle 1)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Totalizer Liters</label>
                <input
                  type="number"
                  value={shiftData.totalizerLiters}
                  onChange={(e) => setShiftData({ ...shiftData, totalizerLiters: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Operator Signature</label>
                <input
                  type="text"
                  value={shiftData.operatorSignature}
                  onChange={(e) => setShiftData({ ...shiftData, operatorSignature: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* VLM Camera Scan widget */}
              <div className="pt-2">
                <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  Attach Log Paper Capture (VLM/OCR Scan)
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="mobile-ocr-capture-input" 
                />
                
                <label 
                  htmlFor="mobile-ocr-capture-input"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 hover:bg-slate-900/20 transition cursor-pointer text-xs text-slate-400 hover:text-white"
                >
                  <Camera className="w-4 h-4" />
                  {capturedFile ? "Captured (Change Log Image)" : "Take Log Capture Picture"}
                </label>

                {ocrCapturedImage && (
                  <div className="mt-3 p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Ready: {(ocrCapturedImage.byteSize / 1024).toFixed(0)} KB
                    </span>
                    <button 
                      onClick={() => setOcrCapturedImage(null)}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmitOfflineTransaction}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Register Record (Spooled Offline)
              </button>
            </div>
          </div>

          {/* Right panel: sync queues, log indicators */}
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="bg-[#0b1329]/50 border border-slate-800/60 rounded-2xl p-5 flex flex-col h-56">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Spooled Offline Queue
                </h2>

                <button
                  onClick={handleTriggerSync}
                  disabled={syncing || offlineQueue.length === 0}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-850 disabled:text-slate-600 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                  Sync delta
                </button>
              </div>

              {/* Sync queue spooled list items */}
              <div className="flex-1 bg-slate-950/40 rounded-xl border border-slate-900 p-3 overflow-y-auto space-y-2">
                {offlineQueue.length === 0 ? (
                  <div className="text-slate-600 italic text-center pt-14 text-xs">Offline transaction buffer is empty.</div>
                ) : (
                  offlineQueue.map((item, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-850 flex justify-between items-center text-[10px]">
                      <div>
                        <div className="font-bold text-slate-300">{item.operationType}</div>
                        <div className="text-slate-500 font-mono text-[9px] mt-0.5">Seq: {item.sequenceNumber}</div>
                      </div>
                      <button 
                        onClick={() => {
                          MobileOfflineQueue.dequeue(item.syncId);
                          setOfflineQueue(MobileOfflineQueue.getQueue());
                        }}
                        className="text-rose-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sync telemetry console logs */}
            <div className="bg-[#0b1329]/50 border border-slate-800/60 rounded-2xl p-5 flex flex-col h-48">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Sync Telemetry Log</h2>
              <div className="flex-1 bg-slate-950/40 rounded-xl border border-slate-900 p-3 font-mono text-[9px] text-slate-400 overflow-y-auto space-y-1.5">
                {syncLogs.length === 0 ? (
                  <div className="text-slate-600 italic text-center pt-12">No synchronization telemetry spooled.</div>
                ) : (
                  syncLogs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap leading-relaxed break-all">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
