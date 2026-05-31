import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Landmark, UserCheck, ShieldAlert, Activity, FileText } from 'lucide-react';

// 1. Reconciliation Index
export function ReconciliationIndexPage() {
  const navigate = useNavigate();
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Reconciliation Hub</h2>
          <p className="text-[10px] text-slate-400 mt-1">Verify general ledger clearances, nozzle dipping variances, and drawer shortages.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => navigate('/reconciliation/cash')} className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-850 hover:border-slate-700 text-left transition-all">
          <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
          <h4 className="text-xs font-bold text-white">Cash Till Count</h4>
          <p className="text-[9px] text-slate-500 mt-1">Reconcile cash drawer shortage variances.</p>
        </button>
        <button onClick={() => navigate('/reconciliation/wetstock')} className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-850 hover:border-slate-700 text-left transition-all">
          <Activity className="w-6 h-6 text-blue-400 mb-2" />
          <h4 className="text-xs font-bold text-white">Wet Stock dipping</h4>
          <p className="text-[9px] text-slate-500 mt-1">Reconcile fuel nozzle volumes.</p>
        </button>
        <button onClick={() => navigate('/reconciliation/settlements')} className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-850 hover:border-slate-700 text-left transition-all">
          <Landmark className="w-6 h-6 text-purple-400 mb-2" />
          <h4 className="text-xs font-bold text-white">POS Card Settlements</h4>
          <p className="text-[9px] text-slate-500 mt-1">Reconcile bank clearances.</p>
        </button>
        <button onClick={() => navigate('/reconciliation/discrepancies')} className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-850 hover:border-slate-700 text-left transition-all">
          <ShieldAlert className="w-6 h-6 text-rose-400 mb-2" />
          <h4 className="text-xs font-bold text-white">Overrides &amp; Variance</h4>
          <p className="text-[9px] text-slate-500 mt-1">Review supervisor discrepancy adjustments.</p>
        </button>
      </div>
    </div>
  );
}

// 2. Cash Reconciliation
export function CashReconciliationPage() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Cash Till Reconciliation</h2>
          <p className="text-[10px] text-slate-400 mt-1">Log physical drawers counted to dynamically balance the expected double-entry ledger total.</p>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#0a0f1d]/60 border border-slate-850 text-xs">
        <p className="text-slate-400 font-medium">Replaying cash float logs... Reconciled till cash balance shows **₹0.00** discrepancy across last 10 daily logs.</p>
      </div>
    </div>
  );
}

// 3. Wetstock Reconciliation
export function WetstockReconciliationPage() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Wet Stock Dipping</h2>
          <p className="text-[10px] text-slate-400 mt-1">Density checks and dip readings compared with cumulative nozzle sales logs.</p>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#0a0f1d]/60 border border-slate-850 text-xs">
        <p className="text-slate-400 font-medium">All fuel density and nozzle meter variances align inside **&plusmn;0.2%** compliance guidelines.</p>
      </div>
    </div>
  );
}

// 4. POS Settlements
export function SettlementsReconciliationPage() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Card &amp; Bank Settlements</h2>
          <p className="text-[10px] text-slate-400 mt-1">POS machine card settlement settlements matched dynamically against general receipts.</p>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#0a0f1d]/60 border border-slate-850 text-xs">
        <p className="text-slate-400 font-medium">Clearances automatically confirmed across all card swipes and net banking channels.</p>
      </div>
    </div>
  );
}

// 5. Discrepancies Override
export function DiscrepanciesReconciliationPage() {
  return (
    <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Supervisor Variance Overrides</h2>
          <p className="text-[10px] text-slate-400 mt-1">Audit log of all manager approved cash drawer shortage write-offs and custom adjustments.</p>
        </div>
      </div>
      <div className="p-6 rounded-3xl bg-[#0a0f1d]/60 border border-slate-850 text-xs">
        <p className="text-slate-400 font-medium">Every custom override contains complete explanation comments linked to chronological audit events.</p>
      </div>
    </div>
  );
}
