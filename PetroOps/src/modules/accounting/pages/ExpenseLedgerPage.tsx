import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, Search, ShieldCheck, ShieldAlert, Plus, Download, 
  RefreshCw, Calculator, HelpCircle, FileText, ChevronRight
} from 'lucide-react';
import { AccountingService } from '../AccountingService';
import { LedgerTransaction } from '../TransactionNormalizer';

export default function ExpenseLedgerPage() {
  const [branchId, setBranchId] = useState<string>('potaliya-petroleum');
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');

  // GST Calculator State
  const [gstAmountInput, setGstAmountInput] = useState<string>('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstCalculations, setGstCalculations] = useState<{
    taxableValue: number;
    totalGst: number;
    cgst: number;
    sgst: number;
  } | null>(null);

  const lockDate = AccountingService.getPeriodLockDate(branchId);

  useEffect(() => {
    loadExpenseData();
  }, [branchId]);

  const loadExpenseData = async () => {
    setLoading(true);
    try {
      const txs = await AccountingService.getAllTransactions(branchId);
      setTransactions(txs);
    } catch (e) {
      console.error('[ExpenseLedger] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions related to Expense Accounts
  const expenseTransactions = transactions.filter(t => t.debitAccount === 'Expense Accounts' || t.creditAccount === 'Expense Accounts');

  // Identify expense category based on remarks
  const categorizeExpenseText = (text: string): string => {
    const clean = text.toLowerCase();
    if (clean.includes('tea') || clean.includes('snack') || clean.includes('food')) return 'Tea & Food';
    if (clean.includes('repair') || clean.includes('maintenance') || clean.includes('supply')) return 'Station Repairs';
    if (clean.includes('testing') || clean.includes('calibration') || clean.includes('nozzle')) return 'Fuel Testing';
    if (clean.includes('staff') || clean.includes('advance') || clean.includes('salary')) return 'Staff Advance';
    return 'Miscellaneous';
  };

  const filteredExpenses = expenseTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const cat = categorizeExpenseText(t.description);
    const matchesCat = selectedSubcategory === 'ALL' || cat === selectedSubcategory;
    return matchesSearch && matchesCat;
  });

  const expenseBreakdown = React.useMemo(() => {
    let total = 0;
    const map: Record<string, number> = {
      'Tea & Food': 0,
      'Station Repairs': 0,
      'Fuel Testing': 0,
      'Staff Advance': 0,
      'Miscellaneous': 0
    };

    expenseTransactions.forEach(t => {
      total += t.amount;
      const cat = categorizeExpenseText(t.description);
      map[cat] = (map[cat] || 0) + t.amount;
    });

    return {
      total,
      breakdown: map
    };
  }, [expenseTransactions]);

  // GST Calculation handler
  const handleCalculateGST = () => {
    const totalBill = parseFloat(gstAmountInput);
    if (isNaN(totalBill) || totalBill <= 0) return;

    // Formula: Taxable Value = Total Bill / (1 + (Rate / 100))
    const taxableValue = totalBill / (1 + (gstRate / 100));
    const totalGst = totalBill - taxableValue;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;

    setGstCalculations({
      taxableValue,
      totalGst,
      cgst,
      sgst
    });
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Date,Sequence,Category,Remark,Amount (INR),Est Taxable Value (INR),Est GST (18%) (INR)\n";
    
    filteredExpenses.forEach(t => {
      const cat = categorizeExpenseText(t.description);
      const estTaxable = t.amount / 1.18;
      const estGst = t.amount - estTaxable;
      csvContent += `"${t.id}","${t.date}",${t.sequenceId},"${cat}","${t.description.replace(/"/g, '""')}",${t.amount.toFixed(2)},${estTaxable.toFixed(2)},${estGst.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pumpai_expenses_${branchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 md:p-8 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-[#EBEBEA] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#D35400] bg-[#FDF2E9] border border-[#F5CBA7] rounded-full uppercase">
              Operations Spending
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full uppercase">
              GST Tax-Deductible
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A]">
            Expense Ledgers & GST Breakdown
          </h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            Replay-audited operations spending lists, calibration test adjustments, and tax breakdown calculator.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="bg-white p-1 rounded-xl border border-[#EBEBEA] shadow-sm flex">
          <button
            onClick={() => setBranchId('potaliya-petroleum')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
              branchId === 'potaliya-petroleum'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Paddle (Local)
          </button>
          <button
            onClick={() => setBranchId('potaliya-petroleum-google')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
              branchId === 'potaliya-petroleum-google'
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Google VLM
          </button>
        </div>
      </div>

      {/* Expense KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Operations Spending</p>
          <h4 className="text-3xl font-black text-[#D35400]">
            ₹{expenseBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h4>
          <span className="text-[9px] text-slate-400 font-medium block mt-2">
            Replay-determined aggregated ledger cash outflows
          </span>
        </div>

        {Object.entries(expenseBreakdown.breakdown).map(([cat, amt]) => {
          const amount = amt as number;
          return (
            <div key={cat} className="bg-white p-5 rounded-2xl border border-[#EBEBEA] shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">{cat}</p>
              <h5 className="text-base font-black text-slate-800">
                ₹{amount.toLocaleString()}
              </h5>
              <span className="text-[8px] text-slate-400 font-medium block mt-1">
                {((amount / (expenseBreakdown.total || 1)) * 100).toFixed(0)}% of total
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Expenses Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-base font-bold text-[#1A1A1A]">Operations Expense Log</h3>
            <button
              onClick={handleExportCSV}
              className="bg-[#F9F9F8] border border-[#EBEBEA] hover:bg-slate-50 text-[#1A1A1A] font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export Expenses CSV
            </button>
          </div>

          {/* Search / Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#F4F4F3] pb-6">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search descriptions/remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-4 py-2.5 pl-10 rounded-xl outline-none focus:border-slate-800"
              />
            </div>

            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Category: All</option>
              <option value="Tea & Food">Tea & Food</option>
              <option value="Station Repairs">Station Repairs</option>
              <option value="Fuel Testing">Fuel Testing</option>
              <option value="Staff Advance">Staff Advance</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-500">Compiling expense ledger cache...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic text-xs">
              No operations expense records match the filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EBEBEA] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-3 pl-4">Date / Seq</th>
                    <th className="pb-3">Subcategory</th>
                    <th className="pb-3">Description / Remarks</th>
                    <th className="pb-3">Offset Account</th>
                    <th className="pb-3 text-right pr-4">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F3]">
                  {filteredExpenses.slice().reverse().map(t => {
                    const cat = categorizeExpenseText(t.description);
                    const isDebit = t.debitAccount === 'Expense Accounts';
                    const offsetAcc = isDebit ? t.creditAccount : t.debitAccount;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 pl-4">
                          <div className="font-bold text-slate-800">{t.date}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">seq-{t.sequenceId}</div>
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 text-[9px] bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600 uppercase">
                            {cat}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-slate-700 max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="py-4">
                          <span className="font-semibold text-slate-500 text-[10px]">
                            {offsetAcc}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-4 font-black text-slate-800">
                          ₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GST-Ready Calculator Card */}
        <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-[#1A1A1A] mb-1 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#D35400]" /> GST Deduction Calculator
          </h3>
          <p className="text-xs text-slate-400 mb-6">Split input bill amounts into taxable and CGST/SGST ledger values.</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Total Bill Amount (INR)</label>
              <input
                type="number"
                placeholder="Enter gross bill amount"
                value={gstAmountInput}
                onChange={(e) => setGstAmountInput(e.target.value)}
                className="bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">GST Slab Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800"
              >
                <option value={5}>GST 5% (Food supplies)</option>
                <option value={12}>GST 12% (Minor supplies / services)</option>
                <option value={18}>GST 18% (Standard maintenance/repairs)</option>
                <option value={28}>GST 28% (Luxury goods / special items)</option>
              </select>
            </div>

            <button
              onClick={handleCalculateGST}
              className="bg-[#1A1A1A] hover:bg-[#333333] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              <Calculator className="w-4 h-4" /> Calculate Tax Split
            </button>

            {gstCalculations && (
              <div className="mt-6 border-t border-[#EBEBEA] pt-6 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calculated Tax Split</h4>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Taxable Net Value:</span>
                  <span className="font-bold text-slate-800">
                    ₹{gstCalculations.taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total GST ({gstRate}%):</span>
                  <span className="font-bold text-[#D35400]">
                    ₹{gstCalculations.totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-[#F9F9F8] p-3 rounded-xl border border-[#EBEBEA] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">CGST Share (50%):</span>
                    <span className="font-semibold text-slate-700">
                      ₹{gstCalculations.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">SGST Share (50%):</span>
                    <span className="font-semibold text-slate-700">
                      ₹{gstCalculations.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
