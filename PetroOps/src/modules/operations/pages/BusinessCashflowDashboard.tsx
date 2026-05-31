/**
 * BusinessCashflowDashboard.tsx
 * ──────────────────────────────
 * Live cash inflow parities, cash vs. digital payment ratio gauges, and expense summaries.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Landmark, DollarSign, TrendingUp, ShieldCheck } from 'lucide-react';

export default function BusinessCashflowDashboard() {
  const navigate = useNavigate();
  const [metrics] = useState({
    totalInflow: 325400,
    cashCollected: 145000,
    digitalCollected: 180400,
    ratios: { cash: 45, digital: 55 }
  });

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/owner')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO OWNER CENTER
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EBEBEA]">
          <div className="bg-[#D35400]/10 p-2.5 rounded-2xl text-[#D35400]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Business Cashflow Visibility</h1>
            <p className="text-xs text-[#666666] mt-0.5">Real-time inflows, digital splits, and expense trends.</p>
          </div>
        </div>

        {/* Summary Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Total Inflow */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">
              Net Daily Inflow
            </span>
            <div>
              <span className="text-3xl font-black text-emerald-700">
                ₹{metrics.totalInflow.toLocaleString()}
              </span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                Cash + Digital collections
              </span>
            </div>
          </div>

          {/* Cash */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">
              Till Cash Collected
            </span>
            <div>
              <span className="text-3xl font-black text-[#1A1A1A]">
                ₹{metrics.cashCollected.toLocaleString()}
              </span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                {metrics.ratios.cash}% of total volume
              </span>
            </div>
          </div>

          {/* Digital */}
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#666666]">
              Digital Merchant Clearing
            </span>
            <div>
              <span className="text-3xl font-black text-[#1565C0]">
                ₹{metrics.digitalCollected.toLocaleString()}
              </span>
              <span className="text-[9px] block text-[#666666] uppercase mt-1 font-bold">
                {metrics.ratios.digital}% of total volume
              </span>
            </div>
          </div>

        </div>

        {/* Ratios Gauge Chart Panel */}
        <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#666666] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Cash vs. Digital Payment Splits
          </h3>

          <div className="h-6 bg-[#EBEBEA] rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${metrics.ratios.cash}%` }} 
              className="bg-[#D35400] h-full flex items-center justify-center text-white text-[10px] font-black"
            >
              CASH: {metrics.ratios.cash}%
            </div>
            <div 
              style={{ width: `${metrics.ratios.digital}%` }} 
              className="bg-[#1565C0] h-full flex items-center justify-center text-white text-[10px] font-black"
            >
              DIGITAL: {metrics.ratios.digital}%
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
