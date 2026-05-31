/**
 * OperatorEfficiencyDashboard.tsx
 * Dynamic telemetry workspace mapping operator velocity tracking indexes,
 * clickstream flow friction levels, and input field bottlenecks.
 */

import React, { useState, useEffect } from "react";
import { 
  Gauge, Timer, Keyboard, AlertCircle, Compass, 
  Sparkles, RefreshCw, Layers, CheckCircle2, Skull, MousePointer
} from "lucide-react";
import { 
  OperatorVelocityEngine, 
  VelocityTelemetrySession, 
  VelocitySummaryMetrics 
} from "../modules/operator/services/OperatorVelocityEngine";
import { 
  WorkflowFrictionEngine, 
  FrictionScoreboard, 
  InteractionFrictionEvent 
} from "../modules/operator/services/WorkflowFrictionEngine";

export default function OperatorEfficiencyDashboard() {
  const [velocitySessions, setVelocitySessions] = useState<VelocityTelemetrySession[]>([]);
  const [velocityMetrics, setVelocityMetrics] = useState<VelocitySummaryMetrics>({
    averageShiftDurationMinutes: 0,
    totalCorrectionsLogged: 0,
    averageLedgerLatencyMs: 0,
    overallVelocityIndex: 100
  });

  const [frictionScore, setFrictionScore] = useState<FrictionScoreboard>({
    totalClicks: 0,
    totalValidationFailures: 0,
    focusLossEvents: 0,
    frictionIndex: 0,
    highestFrictionFields: []
  });

  const [frictionEvents, setFrictionEvents] = useState<InteractionFrictionEvent[]>([]);

  // Load telemetry metrics
  const reloadTelemetry = () => {
    const sessions = OperatorVelocityEngine.getAllSessions();
    const metrics = OperatorVelocityEngine.calculateAggregatedMetrics();
    const friction = WorkflowFrictionEngine.analyzeFriction();
    const events = WorkflowFrictionEngine.getEvents();

    setVelocitySessions(sessions);
    setVelocityMetrics(metrics);
    setFrictionScore(friction);
    setFrictionEvents(events);
  };

  useEffect(() => {
    reloadTelemetry();
  }, []);

  const triggerMockInteraction = (type: InteractionFrictionEvent["type"], field: string) => {
    WorkflowFrictionEngine.trackEvent(type, field, { triggeredFromConsole: true });
    reloadTelemetry();
  };

  return (
    <div className="p-8 bg-[#070b13] min-h-screen text-slate-100 font-sans">
      
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Gauge className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent uppercase">
              Attendant Ergonomics & Velocity Deck
            </h1>
            <p className="text-xs text-slate-400 tracking-wider">REAL-TIME CLICKSTREAM TELEMETRY, INPUT FRICTION RATIOS & COGNITIVE WORKFLOW PROFILE AUDITING</p>
          </div>
        </div>

        <button 
          onClick={reloadTelemetry}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetries
        </button>
      </div>

      {/* Main Indicators Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* KPI 1: Velocity Index */}
        <div className="p-5 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-500 -z-10" />
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Attendant Velocity Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-mono font-extrabold text-purple-400">{velocityMetrics.overallVelocityIndex}</span>
            <span className="text-xs text-slate-500">/ 100 max</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-normal">
            Reflects manual closing time durations mapped against field corrections.
          </p>
        </div>

        {/* KPI 2: Average Completion time */}
        <div className="p-5 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500 -z-10" />
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Avg Shift Close Elapsed</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-mono font-extrabold text-blue-400">{velocityMetrics.averageShiftDurationMinutes}m</span>
            <span className="text-xs text-slate-500">per closing sheet</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-normal">
            Total average minutes taken to submit human verified station ledger.
          </p>
        </div>

        {/* KPI 3: Friction Index */}
        <div className="p-5 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-500 -z-10" />
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Workflow Friction Score</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-mono font-extrabold text-rose-400">{frictionScore.frictionIndex}</span>
            <span className="text-xs text-slate-500">/ 100 complexity</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-normal">
            Form level cognitive friction. Lower index implies higher attendant clarity.
          </p>
        </div>

        {/* KPI 4: Ledger Latencies */}
        <div className="p-5 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500 -z-10" />
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Ledger Latency</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-mono font-extrabold text-emerald-400">{velocityMetrics.averageLedgerLatencyMs}ms</span>
            <span className="text-xs text-slate-500">db write delay</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-normal">
            Database state update and rules assertions computation latency bounds.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Interactive Session and Friction hotspots */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Historical Session Velocity Log */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Timer className="w-4.5 h-4.5 text-blue-400" />
              Attendant Telemetry Sessions Profile
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Session Key</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4 text-center">Closing Time</th>
                    <th className="py-3 px-4 text-center">Corrections</th>
                    <th className="py-3 px-4 text-center">Ledger Latency</th>
                    <th className="py-3 px-4 text-center">Velocity Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {velocitySessions.map((session) => {
                    const minutes = session.totalDurationSeconds 
                      ? (session.totalDurationSeconds / 60).toFixed(1) 
                      : "0.0";
                    const isOptimal = (session.totalDurationSeconds || 0) < 900; // < 15 mins
                    
                    return (
                      <tr key={session.sessionId} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-slate-300">
                          {session.sessionId}
                        </td>
                        <td className="py-4 px-4 text-slate-200">
                          <div className="font-bold">{session.operatorId}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{session.shiftId}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`font-bold font-mono ${isOptimal ? "text-emerald-400" : "text-amber-400"}`}>
                            {minutes} mins
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                          {session.manualCorrectionsCount}
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-400">
                          {session.ledgerUpdateTimesMs.length > 0 
                            ? `${Math.round(session.ledgerUpdateTimesMs.reduce((a,b)=>a+b,0)/session.ledgerUpdateTimesMs.length)}ms`
                            : "N/A"}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isOptimal 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {isOptimal ? "EXCELLENT" : "IMPAIRED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Telemetry clickstream playground (Interactive Simulation) */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <MousePointer className="w-4.5 h-4.5 text-purple-400" />
              Simulate Attendant Interception Streams
            </h3>
            <p className="text-[10px] text-slate-500 leading-normal mb-5 uppercase">
              PROMPT COGNITIVE EVENTS ON INTERFACES TO STRESS-TEST LAYOUT BOTTLENECK METRICS DIRECTLY
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => triggerMockInteraction("CLICK", "openingNozzleCounter")}
                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-left rounded-2xl flex flex-col gap-1 transition-all"
              >
                <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase">Trigger Click</span>
                <span className="text-xs font-bold text-slate-200">Nozzle Counter Field</span>
              </button>

              <button
                onClick={() => triggerMockInteraction("VALIDATION_FAILED", "dipStockPhysical")}
                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-left rounded-2xl flex flex-col gap-1 transition-all"
              >
                <span className="text-[9px] text-rose-400 font-mono font-bold uppercase">Trigger Validation Failed</span>
                <span className="text-xs font-bold text-slate-200">Dip physical volume bounds</span>
              </button>

              <button
                onClick={() => triggerMockInteraction("FOCUS_LOSS", "creditAttendantHandover")}
                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-left rounded-2xl flex flex-col gap-1 transition-all"
              >
                <span className="text-[9px] text-amber-400 font-mono font-bold uppercase">Trigger Focus Loss</span>
                <span className="text-xs font-bold text-slate-200">Credit ledger account</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Friction hotspots, telemetry logs */}
        <div className="flex flex-col gap-8">
          
          {/* Friction hotspots */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400" />
                Layout Friction Hotspots
              </h3>
              <p className="text-[9px] text-slate-500 uppercase mt-0.5">Top field coordinates exhibiting input friction</p>
            </div>

            <div className="flex flex-col gap-3">
              {frictionScore.highestFrictionFields.map((field, idx) => (
                <div key={idx} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-mono font-extrabold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 font-mono block">{field}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      {field === "openingNozzleCounter" && "Recurring counter rollback corrections"}
                      {field === "dipStockPhysical" && "Evaporation threshold math warning triggers"}
                      {field === "creditAttendantHandover" && "Focus loops searching digital card ref"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950 border border-slate-900 text-slate-500 text-[10px] uppercase leading-relaxed tracking-wider mt-auto text-center rounded-2xl">
              Friction index metrics above 60.0 flag automated prompts for interface training updates.
            </div>
          </div>

          {/* Clickstream Real-time logger */}
          <div className="p-6 rounded-3xl bg-slate-900/25 border border-slate-800/60 backdrop-blur-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Keyboard className="w-4.5 h-4.5 text-indigo-400" />
              Real-time clickstream events
            </h3>

            <div className="flex flex-col gap-2.5 h-64 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {frictionEvents.map((evt) => (
                <div key={evt.eventId} className="p-3 rounded-xl bg-slate-950/50 border border-slate-900 flex justify-between items-center gap-3 font-mono text-[9px]">
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold mr-2 ${
                      evt.type === "CLICK" ? "bg-purple-500/10 text-purple-400" :
                      evt.type === "VALIDATION_FAILED" ? "bg-rose-500/10 text-rose-400 animate-pulse" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {evt.type}
                    </span>
                    <span className="text-slate-300">{evt.elementId}</span>
                  </div>
                  <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
