import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CreditCard, Search, User, AlertTriangle, 
  CheckCircle2, Plus, Calendar, DollarSign, Activity, FileText
} from 'lucide-react';

export default function CreditOperationsCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Credit customers list
  const [customers, setCustomers] = useState([
    { id: 'c-01', name: 'Rajasthan Transport Corp', outstanding: 124500, lastActive: '2026-05-22', riskRating: 'Low' },
    { id: 'c-02', name: 'Sharma Ji Construction', outstanding: 42800, lastActive: '2026-05-20', riskRating: 'Medium' },
    { id: 'c-03', name: 'Rawat Brick Kiln Logistics', outstanding: 89000, lastActive: '2026-05-21', riskRating: 'Low' },
    { id: 'c-04', name: 'Verma Brothers Fuel Account', outstanding: 6150, lastActive: '2026-05-18', riskRating: 'High' }
  ]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/command-center')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO COMMAND CENTER
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2.5 rounded-2xl text-[#D35400]">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Credit Operations Center</h1>
              <p className="text-xs text-[#666666] mt-0.5">Search credit customer roster, recover ledger payments, track overdue alerts, and download outstanding statement sheets.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main credit customer list and search */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search filter bar */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs flex items-center gap-3 min-h-[54px] glove-safe-target-large">
              <Search className="w-5 h-5 text-[#666666]" />
              <input
                type="text"
                placeholder="Search by credit customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-bold text-[#1A1A1A] focus:outline-none"
              />
            </div>

            {/* Customers list cards */}
            <div className="space-y-3">
              {filteredCustomers.map(c => (
                <div 
                  key={c.id} 
                  className="p-5 bg-white border border-[#EBEBEA] rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#B3B3B3] transition-colors cursor-pointer"
                  onClick={() => navigate(`/credit-ledger/customer/${c.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-[#1A1A1A]">{c.name}</h4>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                        c.riskRating === 'High' 
                          ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                          : c.riskRating === 'Medium'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {c.riskRating} Risk
                      </span>
                    </div>
                    <p className="text-[10px] text-[#666666] mt-1">Last Active: {c.lastActive}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-[#666666] block">Outstanding Balance</span>
                      <span className="text-xs font-mono font-black text-[#C62828]">₹{c.outstanding.toLocaleString()}</span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/credit-ledger/payment');
                      }}
                      className="px-4 py-2.5 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D9D9D6] rounded-xl text-[10px] font-black uppercase tracking-wider min-h-[38px] cursor-pointer"
                    >
                      Recover
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Outstanding metrics and risk analysis sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Ledger summary statistics */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-[#D35400]" /> Credit Dues Summary
              </h3>

              <div className="p-4 bg-[#FAF9F5] border border-[#E4E3DE] rounded-2xl">
                <span className="text-[9px] uppercase font-black text-[#666666] block">Total Roster Outstanding</span>
                <span className="text-2xl font-mono font-black text-[#C62828] block mt-1">₹{totalOutstanding.toLocaleString()}</span>
              </div>

              <div className="text-[10px] text-[#666666] leading-relaxed p-3.5 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl">
                <strong>Attendant Credit Recoveries Rules:</strong>
                <span className="block mt-1">Recovered dues must be split between cashier cash box and Paytm QR receipts instantly to balance ledger variances.</span>
              </div>
            </div>

            {/* Overdue Accounts Warnings */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2">
                Delinquency Warnings
              </h3>
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[10px] font-bold">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span>Verma Brothers has exceeded credit limits! Account locked until ₹6,150 recovered.</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
