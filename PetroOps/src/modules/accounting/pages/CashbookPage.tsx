import React, { useState, useEffect } from 'react';
import { 
  Landmark, Search, ShieldCheck, ShieldAlert, ArrowUpRight, 
  ArrowDownLeft, Plus, Download, RefreshCw, Calculator, HelpCircle
} from 'lucide-react';
import { AccountingService } from '../AccountingService';
import { LedgerTransaction } from '../TransactionNormalizer';

export default function CashbookPage() {
  const [branchId, setBranchId] = useState<string>('potaliya-petroleum');
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  
  // Adjustment state
  const [isDeposit, setIsDeposit] = useState<boolean>(true); // true = Deposit (Inflow), false = Withdrawal (Outflow)
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('CASH_DRAWER_TOPUP');
  const [adjustRemarks, setAdjustRemarks] = useState<string>('');
  const [adjustOffsetAccount, setAdjustOffsetAccount] = useState<string>('Expense Accounts');

  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  const lockDate = AccountingService.getPeriodLockDate(branchId);

  useEffect(() => {
    loadCashbookData();
  }, [branchId]);

  const loadCashbookData = async () => {
    setLoading(true);
    try {
      const state = await AccountingService.replayIsolatedLedger(branchId);
      const txs = await AccountingService.getAllTransactions(branchId);
      setCashBalance(state.accountBalances['Cash Till'] || 0);
      setTransactions(txs);
    } catch (e) {
      console.error('[Cashbook] Error loading cash data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions related ONLY to Cash Till
  const cashTransactions = transactions.filter(t => t.debitAccount === 'Cash Till' || t.creditAccount === 'Cash Till');

  const handleQuickAmount = (val: number) => {
    setAdjustAmount(val.toString());
  };

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    setPostSuccess(null);

    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      setPostError('Please enter a valid cash amount.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    if (todayDate <= lockDate) {
      setPostError(`Compliance lock error: Today's date ${todayDate} is locked.`);
      return;
    }

    try {
      // Deposit (Inflow)  = Debit Cash Till, Credit Offset Account
      // Withdrawal (Outflow) = Debit Offset Account, Credit Cash Till
      const debitAccount = isDeposit ? 'Cash Till' : adjustOffsetAccount;
      const creditAccount = isDeposit ? adjustOffsetAccount : 'Cash Till';
      const description = `Cashbook Adjustment: [${adjustReason}] ${adjustRemarks || 'No remarks provided'}`;

      await AccountingService.saveManualJournalEntry(branchId, {
        date: todayDate,
        debitAccount,
        creditAccount,
        amount: amt,
        description
      });

      setPostSuccess(`Cashbook posted successfully! New Cash till balance synchronized.`);
      setAdjustAmount('');
      setAdjustRemarks('');
      loadCashbookData();
      setTimeout(() => setPostSuccess(null), 5000);
    } catch (err: any) {
      setPostError(err.message || 'Failed to update cashbook.');
    }
  };

  // Compute stats
  const cashStats = React.useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let shiftVariances = 0; // Settlement adjustments

    cashTransactions.forEach(t => {
      if (t.debitAccount === 'Cash Till') {
        totalInflow += t.amount;
        if (t.creditAccount === 'Settlement Adjustments') {
          shiftVariances += t.amount; // surplus
        }
      } else {
        totalOutflow += t.amount;
        if (t.debitAccount === 'Settlement Adjustments') {
          shiftVariances -= t.amount; // shortage
        }
      }
    });

    return {
      totalInflow,
      totalOutflow,
      shiftVariances
    };
  }, [cashTransactions]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Date,Type,Offset Account,Remark,Inflow (INR),Outflow (INR),Running Cash Balance (INR)\n";
    
    let running = 0;
    cashTransactions.forEach(t => {
      const isDebit = t.debitAccount === 'Cash Till';
      const inflow = isDebit ? t.amount : 0;
      const outflow = isDebit ? 0 : t.amount;
      running += isDebit ? t.amount : -t.amount;
      
      const offsetAcc = isDebit ? t.creditAccount : t.debitAccount;
      csvContent += `"${t.id}","${t.date}","${isDebit ? 'INFLOW' : 'OUTFLOW'}","${offsetAcc}","${t.description.replace(/"/g, '""')}",${inflow.toFixed(2)},${outflow.toFixed(2)},${running.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pumpai_cashbook_${branchId}.csv`);
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
              Petroleum Cashbook
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full uppercase">
              Cash Drawer Safety
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A]">
            Cash Till Book & Variances
          </h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            Realtime Cash Till balances, operational cash logs, and direct drawer adjustment systems.
          </p>
        </div>

        {/* Branch Selector & Refresh */}
        <div className="flex items-center gap-3">
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
          
          <button 
            onClick={loadCashbookData}
            className="p-2.5 bg-white border border-[#EBEBEA] hover:bg-slate-50 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {postSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold mb-8 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {postSuccess}
        </div>
      )}

      {/* Cash till overview boxes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Current Cash Till</p>
            <h4 className="text-3xl font-black text-slate-800">
              ₹{cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
            <span className="text-[9px] text-slate-400 mt-2 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Audited vault float level
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Inflows (Debits)</p>
            <h4 className="text-2xl font-black text-emerald-700">
              ₹{cashStats.totalInflow.toLocaleString()}
            </h4>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Cash collected from shifts
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Outflows (Credits)</p>
            <h4 className="text-2xl font-black text-[#D35400]">
              ₹{cashStats.totalOutflow.toLocaleString()}
            </h4>
            <span className="text-[10px] text-[#D35400] font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Expense payments & banking
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Shift Cash Variances</p>
            <h4 className={`text-2xl font-black ${
              cashStats.shiftVariances >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              ₹{Math.abs(cashStats.shiftVariances).toLocaleString()}
            </h4>
            <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-1">
              {cashStats.shiftVariances >= 0 ? 'Cash Till Surplus' : 'Cash Till Discrepancy'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cash Ledger Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-base font-bold text-[#1A1A1A]">Cash Flow Transaction Log</h3>
            <button
              onClick={handleExportCSV}
              className="bg-[#F9F9F8] border border-[#EBEBEA] hover:bg-slate-50 text-[#1A1A1A] font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export Cash CSV
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-500">Retrieving cash register state...</p>
            </div>
          ) : cashTransactions.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic text-xs">
              No cash transactions recorded for this branch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EBEBEA] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-3 pl-4">Date / Seq</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Offset Account</th>
                    <th className="pb-3">Remark / Purpose</th>
                    <th className="pb-3 text-right pr-4">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F3]">
                  {cashTransactions.slice().reverse().map(t => {
                    const isInflow = t.debitAccount === 'Cash Till';
                    const offsetAccount = isInflow ? t.creditAccount : t.debitAccount;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 pl-4">
                          <div className="font-bold text-slate-800">{t.date}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">seq-{t.sequenceId}</div>
                        </td>
                        <td className="py-4">
                          {isInflow ? (
                            <span className="px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase flex items-center gap-1 w-fit">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Inflow
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] bg-rose-50 text-rose-700 border border-rose-100 rounded-full font-bold uppercase flex items-center gap-1 w-fit">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" /> Outflow
                            </span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className="font-semibold text-slate-800 bg-[#FDF2E9] border border-[#F5CBA7] text-[10px] px-2 py-1 rounded-lg">
                            {offsetAccount}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-slate-600 max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className={`py-4 text-right pr-4 font-black ${
                          isInflow ? 'text-emerald-700' : 'text-[#D35400]'
                        }`}>
                          {isInflow ? '+' : '-'}₹{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Touch-Friendly Cash Adjustment Pad */}
        <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#D35400]" /> Till Cash Adjustment Pad
          </h3>

          {postError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {postError}
            </div>
          )}

          <form onSubmit={handlePostAdjustment} className="flex flex-col gap-4">
            {/* Flow Toggle button block */}
            <div className="grid grid-cols-2 gap-2 bg-[#F9F9F8] p-1.5 border border-[#EBEBEA] rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setIsDeposit(true)}
                className={`py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isDeposit
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Deposit Inflow
              </button>
              <button
                type="button"
                onClick={() => setIsDeposit(false)}
                className={`py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !isDeposit
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Withdrawal Outflow
              </button>
            </div>

            {/* Quick numerical pad selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Quick Cash Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000, 2000, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="bg-[#F9F9F8] border border-[#EBEBEA] hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    ₹{val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdjustAmount('')}
                  className="bg-[#FDF2E9] border border-[#F5CBA7] text-[#D35400] py-2.5 rounded-xl font-bold text-xs hover:bg-[#FBE4D5] transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cash Amount (INR)</label>
              <input
                type="number"
                placeholder="Enter custom cash amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Adjustment Offset Ledger</label>
              <select
                value={adjustOffsetAccount}
                onChange={(e) => setAdjustOffsetAccount(e.target.value)}
                className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 font-bold"
              >
                <option value="Expense Accounts">Expense Accounts (Tea/Repair supplies)</option>
                <option value="UPI Clearing">UPI QR Clearing (Digital Cash-out)</option>
                <option value="Card Clearing">Card Terminal Clearing</option>
                <option value="Accounts Receivable">Accounts Receivable (Customer Payments)</option>
                <option value="Settlement Adjustments">Settlement Adjustments (Shortage/Surplus Adjust)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Reason Category</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800"
              >
                <option value="CASH_DRAWER_TOPUP">Cash drawer topup</option>
                <option value="BANK_DEPOSIT">Cash deposit to Bank</option>
                <option value="LOCAL_OPERATIONS">Local tea & operational buy</option>
                <option value="DISCREPANCY_CORRECTION">Manual till discrepancy override</option>
                <option value="CREDIT_RECOVERY">Manual customer udhari recovery</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Audit Remarks / Details</label>
              <textarea
                placeholder="Describe details for CA and physical review..."
                value={adjustRemarks}
                onChange={(e) => setAdjustRemarks(e.target.value)}
                rows={2}
                className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 resize-none font-medium text-slate-700"
              />
            </div>

            <button
              type="submit"
              className="bg-[#1A1A1A] hover:bg-[#333333] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Save till adjustment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
