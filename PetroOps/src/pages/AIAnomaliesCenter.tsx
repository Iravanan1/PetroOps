import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AIAnomaliesCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#e2e8f0] font-sans p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1f212d] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
            PUMP_AI // SYSTEM_ANOMALIES_AUDITOR
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Forensic fraud audits, suspicious nozzle actions, density alterations, and dip variances.</p>
        </div>
        <button 
          onClick={() => navigate('/ai-review')}
          className="text-xs text-sky-400 hover:text-white font-mono bg-[#1c1d27] border border-[#2b2d3c] px-4 py-2 rounded transition"
        >
          GO TO AUDITS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Density Alert */}
        <div className="bg-[#14151f] border border-red-500/30 rounded p-4 flex flex-col justify-between font-mono">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded uppercase">
                DENSITY_COMPLIANCE_FAIL
              </span>
              <span className="text-xs text-gray-500">12:15 PM</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase">Adulteration / Temperature Risk</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Measured density of petrol at Gujarat Branch is 741.0 kg/m³, which varies from standard stock specs of 745.5 kg/m³ by 4.5 kg/m³. Exceeds regional IOCL legal limit of +/- 3 kg/m³.
            </p>
          </div>
          <div className="pt-4 border-t border-[#232637] mt-4 flex items-center justify-between">
            <span className="text-xs text-red-400 font-bold">HIGH RISK SCORE: 85%</span>
            <button 
              onClick={() => navigate('/ai-review/shift_demo_987')}
              className="text-[10px] text-sky-400 hover:text-white uppercase"
            >
              INVESTIGATE →
            </button>
          </div>
        </div>

        {/* Card 2: Shortage Warning */}
        <div className="bg-[#14151f] border border-amber-500/30 rounded p-4 flex flex-col justify-between font-mono">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                CASH_RECONCILIATION_WARNING
              </span>
              <span className="text-xs text-gray-500">11:04 AM</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase">Cash Deficit Detected</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Physical cash collection reported as ₹48,500, but expectations computed by nozzle movement is ₹48,900. Unresolved shortage discrepancy of ₹400 logged.
            </p>
          </div>
          <div className="pt-4 border-t border-[#232637] mt-4 flex items-center justify-between">
            <span className="text-xs text-amber-500 font-bold">MEDIUM RISK SCORE: 60%</span>
            <button 
              onClick={() => navigate('/ai-review/shift_demo_987')}
              className="text-[10px] text-sky-400 hover:text-white uppercase"
            >
              INVESTIGATE →
            </button>
          </div>
        </div>

        {/* Card 3: Wetstock Variance */}
        <div className="bg-[#14151f] border border-sky-500/30 rounded p-4 flex flex-col justify-between font-mono">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-sky-500/10 text-sky-500 border border-sky-500/20 px-2 py-0.5 rounded uppercase">
                WETSTOCK_LEAK_DETECTION
              </span>
              <span className="text-xs text-gray-500">09:30 AM</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase">Physical Dip Stock Variance</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              HSD Tank physical measurement is 15 litres short of computed ledger balances. Variance lies within normal evap thresholds (+/- 50 litres). No actions required.
            </p>
          </div>
          <div className="pt-4 border-t border-[#232637] mt-4 flex items-center justify-between">
            <span className="text-xs text-sky-400 font-bold">LOW RISK SCORE: 20%</span>
            <span className="text-[10px] text-gray-500 uppercase">RESOLVED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
