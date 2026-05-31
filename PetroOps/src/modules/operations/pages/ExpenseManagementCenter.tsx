import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, FileText, CheckCircle2, ShieldAlert, 
  UploadCloud, Search, Calendar, ChevronRight, X
} from 'lucide-react';
import { CashbookEngine, CashbookRecord } from '../CashbookEngine';

export default function ExpenseManagementCenter() {
  const [selectedMonth] = useState<string>('2026-05');
  const [cashbookRecords, setCashbookRecords] = useState<CashbookRecord[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // New Expense form
  const [formData, setFormData] = useState({
    description: '',
    category: 'maintenance',
    amount: '',
    vendor: '',
    gstin: ''
  });

  // Load cashbook logs
  useEffect(() => {
    const rawLogs = CashbookEngine.generateMockLogs(selectedMonth);
    const replayed = CashbookEngine.replayCashbook(rawLogs, 75000); // 75000 baseline float cash
    setCashbookRecords(replayed);
  }, [selectedMonth]);

  // Simulate receipt OCR parsing
  const handleOcrSimulate = () => {
    setOcrLoading(true);
    setTimeout(() => {
      setFormData({
        description: 'Monthly office stationeries and printer ink cartridges',
        category: 'stationery',
        amount: '2450',
        vendor: 'Ganesh Stationery & Xerox',
        gstin: '27GNS1122D1Z4'
      });
      setOcrLoading(false);
    }, 1200);
  };

  // Submit expense record
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const newRecord: Omit<CashbookRecord, 'runningBalance' | 'auditSignature'> = {
      id: `cb-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'EXPENSE',
      description: `[OCR Approved - ${formData.vendor || 'Petty cash'}] ${formData.description}`,
      debit: 0,
      credit: Number(formData.amount)
    };

    setCashbookRecords(prev => {
      // Re-run double-entry constraints to maintain replay safety
      const updatedList = [...prev.map(r => ({ id: r.id, date: r.date, type: r.type, description: r.description, debit: r.debit, credit: r.credit })), newRecord];
      return CashbookEngine.replayCashbook(updatedList, 75000);
    });

    // Reset and close
    setFormData({ description: '', category: 'maintenance', amount: '', vendor: '', gstin: '' });
    setIsDrawerOpen(false);
  };

  // Expenses categories summary
  const totalsByCategory = cashbookRecords
    .filter(r => r.type === 'EXPENSE')
    .reduce((acc: Record<string, number>, curr) => {
      const desc = curr.description.toLowerCase();
      let key = 'miscellaneous';
      if (desc.includes('electric') || desc.includes('utility')) key = 'utilities';
      else if (desc.includes('salary') || desc.includes('attendant') || desc.includes('advance')) key = 'advances';
      else if (desc.includes('grease') || desc.includes('generator') || desc.includes('maintenance')) key = 'maintenance';
      else if (desc.includes('stationery')) key = 'stationery';

      acc[key] = (acc[key] || 0) + curr.credit;
      return acc;
    }, {});

  const currentBalance = cashbookRecords.length > 0 ? cashbookRecords[cashbookRecords.length - 1].runningBalance : 75000;

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Overview stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F9F9F8] border border-[#EBEBEA] p-5 rounded-2xl">
        <div>
          <span className="text-[10px] font-black uppercase text-[#666666] tracking-wider block">Authoritative Cashbook Balance</span>
          <span className="text-2xl font-black text-[#1A1A1A] mt-1 block">₹{currentBalance.toLocaleString()}</span>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="px-5 py-3 bg-[#D35400] hover:bg-[#A04000] text-white text-xs font-black uppercase tracking-wider rounded-2xl min-h-[48px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
        >
          <PlusCircle className="w-4.5 h-4.5" /> File Petty Cash / OCR
        </button>
      </div>

      {/* Grid: Category totals vs Running logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cashbook running ledger lines */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Running Cashbook Ledger</h4>
          
          <div className="border border-[#EBEBEA] rounded-2xl overflow-hidden bg-white">
            <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[9px] sticky top-0">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Cash In</th>
                    <th className="p-4">Cash Out</th>
                    <th className="p-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
                  {cashbookRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9F9F8]/50 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-[#666666]">{r.date}</td>
                      <td className="p-4 max-w-[260px] truncate">
                        <span className="block text-xs font-bold text-[#1A1A1A]">{r.description}</span>
                        <span className="block text-[8px] font-mono text-[#999999] uppercase mt-0.5">{r.type.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4 text-emerald-700">{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : '-'}</td>
                      <td className="p-4 text-rose-700">{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : '-'}</td>
                      <td className="p-4 text-right font-mono">₹{r.runningBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Expenses category summaries & approvals */}
        <div className="space-y-6">
          <div className="border border-[#EBEBEA] rounded-2xl p-5 space-y-4">
            <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Outflow by Category</h4>
            <div className="space-y-3">
              {Object.entries(totalsByCategory).map(([cat, val]) => {
                const valNum = val as number;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#666666] uppercase text-[10px]">{cat}</span>
                      <span>₹{valNum.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-[#F3F3F1] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D35400] rounded-full" 
                        style={{ width: `${Math.min(100, (valNum / 50000) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 text-amber-950">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#D35400]" />
              <span className="text-xs font-black uppercase tracking-wider">Accountant Review Gates</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              All petty cash vouchers are locked into immutable periods once Shift closing is sealed. Adjustments require supervisor credential keys.
            </p>
          </div>
        </div>
      </div>

      {/* Expense ingestion Sidebar drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white h-full p-6 flex flex-col justify-between border-l border-[#EBEBEA] animate-slide-in shadow-2xl">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-[#EBEBEA]">
                <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-tight">Ingest Expense Voucher</h4>
                <button onClick={() => setIsDrawerOpen(false)} className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* OCR simulation button */}
              <button
                type="button"
                onClick={handleOcrSimulate}
                disabled={ocrLoading}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#D35400]/40 hover:border-[#D35400] bg-amber-50/50 hover:bg-amber-50 p-4 rounded-2xl text-xs font-bold text-[#D35400] cursor-pointer transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-5 h-5" />
                {ocrLoading ? 'Parsing Receipt OCR metrics...' : 'Upload & Auto-Simulate OCR Scan'}
              </button>

              <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-bold text-[#1A1A1A]">
                <div className="space-y-1.5">
                  <label className="text-[#666666] uppercase text-[9px] tracking-wider block">Description details</label>
                  <input 
                    type="text" 
                    placeholder="Generator grease refill, printer cartridg..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#B3B3B3]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] tracking-wider block">Amount (INR)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 1500"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#B3B3B3]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] tracking-wider block">Expense Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="utilities">Utilities</option>
                      <option value="stationery">Stationery</option>
                      <option value="advances">Attendant advances</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#EBEBEA]">
                  <span className="text-[10px] font-black uppercase text-[#666666] block">OCR Scanned Meta (Simulated)</span>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-[8px] text-[#666666] block">Vendor Name</label>
                      <input 
                        type="text" 
                        value={formData.vendor} 
                        onChange={e => setFormData({...formData, vendor: e.target.value})}
                        className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-2 py-1.5 text-[10px] font-mono text-[#1A1A1A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-[#666666] block">Vendor GSTIN</label>
                      <input 
                        type="text" 
                        value={formData.gstin} 
                        onChange={e => setFormData({...formData, gstin: e.target.value})}
                        className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-2 py-1.5 text-[10px] font-mono text-[#1A1A1A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {Number(formData.amount) > 2000 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#D35400] flex-shrink-0 mt-0.5" />
                    <span className="text-[9px] leading-relaxed block">
                      Amounts exceeding ₹2,000 will be flagged for Manager authorization approval queue.
                    </span>
                  </div>
                )}
              </form>
            </div>

            <div className="flex gap-3 border-t border-[#EBEBEA] pt-4 mt-6">
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 px-4 py-3 bg-[#F9F9F8] hover:bg-[#EBEBEA] text-[#1A1A1A] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
              >
                Discard
              </button>
              <button 
                onClick={handleAddExpense}
                className="flex-1 px-4 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
              >
                Log Outflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
