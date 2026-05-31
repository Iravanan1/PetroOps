/**
 * CreditRecoveryIntelligence.tsx
 * ──────────────────────────────
 * Customer outstanding credit concentration, aging, payment latency, and follow-up queues.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, Search, Smartphone } from 'lucide-react';

interface OverdueCustomer {
  id: string;
  name: string;
  outstanding: number;
  overdueDays: number;
  recoveryProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  lastPaymentDate: string;
  phone: string;
}

export default function CreditRecoveryIntelligence() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [customers] = useState<OverdueCustomer[]>([
    { id: 'c-01', name: 'Karanja Logistics Pvt Ltd', outstanding: 125000, overdueDays: 45, recoveryProbability: 'HIGH', lastPaymentDate: '2026-04-10', phone: '+91 98765 43210' },
    { id: 'c-02', name: 'Malwa Travels', outstanding: 45000, overdueDays: 62, recoveryProbability: 'MEDIUM', lastPaymentDate: '2026-03-15', phone: '+91 87654 32109' },
    { id: 'c-03', name: 'Shiva Stone Crusher', outstanding: 14500, overdueDays: 95, recoveryProbability: 'LOW', lastPaymentDate: '2026-02-05', phone: '+91 76543 21098' }
  ]);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

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
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Credit Recovery Intelligence</h1>
            <p className="text-xs text-[#666666] mt-0.5">Aging analysis of outstanding balances, customer risk metrics, and priority recovery lists.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666666]">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search overdue customers or fleets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBEBEA] rounded-2xl text-xs font-bold focus:outline-none focus:border-[#D35400] transition-colors min-h-[44px]"
          />
        </div>

        {/* Concentration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                  c.recoveryProbability === 'HIGH' ? 'bg-emerald-50 text-emerald-800' : c.recoveryProbability === 'MEDIUM' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  RECOVERY: {c.recoveryProbability}
                </span>
                <h3 className="text-xs font-black text-[#1A1A1A] mt-2.5">{c.name}</h3>
                <span className="text-[9px] text-[#666666] font-mono block mt-0.5">Exposure aging: {c.overdueDays} days overdue</span>
              </div>

              <div className="py-2.5 px-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-2xl font-black text-[#1A1A1A]">₹{c.outstanding.toLocaleString()}</span>
                  <span className="text-[8.5px] block text-[#666666] uppercase mt-0.5 font-bold">Outstanding balance</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-bold text-[#1A1A1A]">
                <div className="flex justify-between border-b border-[#EBEBEA] pb-1.5">
                  <span className="text-[#666666]">Last Payment</span>
                  <span>{c.lastPaymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Phone</span>
                  <span>{c.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`tel:${c.phone}`}
                  className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl text-[10px] font-black uppercase tracking-wider min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Call att.
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
