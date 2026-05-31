import React, { useState, useEffect } from 'react';
import { 
  Landmark, Search, Lock, Unlock, FileText, Download, 
  ArrowUpRight, AlertTriangle, RefreshCw, CheckCircle, HelpCircle, Eye,
  TrendingUp
} from 'lucide-react';
import { AccountingService } from '../AccountingService';
import { LedgerTransaction } from '../TransactionNormalizer';
import { ReplayState } from '../../replay/CoreReplayEngine';

export default function GeneralLedgerPage() {
  const [branchId, setBranchId] = useState<string>('potaliya-petroleum');
  const [loading, setLoading] = useState<boolean>(true);
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chart' | 'trial' | 'pl' | 'reports'>('chart');
  
  // Period Lock State
  const [lockDate, setLockDate] = useState<string>('');
  const [lockSuccess, setLockSuccess] = useState<string | null>(null);
  
  // Account Detail Drawer
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  useEffect(() => {
    loadLedgerData();
    const savedLock = AccountingService.getPeriodLockDate(branchId);
    setLockDate(savedLock);
  }, [branchId]);

  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const state = await AccountingService.replayIsolatedLedger(branchId);
      const txs = await AccountingService.getAllTransactions(branchId);
      setReplayState(state);
      setTransactions(txs);
    } catch (e) {
      console.error('[GeneralLedger] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLockPeriod = () => {
    AccountingService.setPeriodLockDate(branchId, lockDate);
    setLockSuccess(`Successfully locked all transactions on or before ${lockDate}. Locked records are now immutable.`);
    setTimeout(() => setLockSuccess(null), 5000);
  };

  // Helper to categorize accounts
  const getAccountType = (acc: string): string => {
    if (['Cash Till', 'UPI Clearing', 'Card Clearing', 'Accounts Receivable'].includes(acc)) {
      return 'Asset';
    }
    if (['Expense Accounts', 'Wet Stock Adjustments', 'Settlement Adjustments'].includes(acc)) {
      return 'Expense / Discrepancy';
    }
    if (['Fuel Revenue'].includes(acc)) {
      return 'Revenue';
    }
    return 'Other';
  };

  const filteredAccounts = Object.entries(replayState?.accountBalances || {})
    .filter(([acc]) => acc.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Replay transactions for selected account
  const accountTxs = transactions.filter(t => t.debitAccount === selectedAccount || t.creditAccount === selectedAccount);

  // Accountant Reports Calculations
  const plMetrics = React.useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let wetstockVariance = 0;
    let settlementVariance = 0;

    transactions.forEach(t => {
      if (t.creditAccount === 'Fuel Revenue') {
        revenue += t.amount;
      }
      if (t.debitAccount === 'Expense Accounts') {
        expenses += t.amount;
      }
      if (t.debitAccount === 'Wet Stock Adjustments') {
        wetstockVariance += t.amount;
      }
      if (t.debitAccount === 'Settlement Adjustments') {
        settlementVariance += t.amount; // shortages
      }
      if (t.creditAccount === 'Settlement Adjustments') {
        settlementVariance -= t.amount; // surpluses
      }
    });

    const netProfit = revenue - expenses - wetstockVariance - settlementVariance;

    return {
      revenue,
      expenses,
      wetstockVariance,
      settlementVariance,
      netProfit
    };
  }, [transactions]);

  // Export Trial Balance / General Ledger to CSV / Tally TXT / GST Summary / Audit Log
  const handleExportCSV = (reportType: string) => {
    let fileContent = "";
    let fileName = "";
    let mimeType = "text/csv;charset=utf-8;";

    if (reportType === 'trial_balance') {
      fileName = `pumpai_trial_balance_${branchId}.csv`;
      fileContent += "Account Name,Debit Balance (INR),Credit Balance (INR)\n";
      let debitTotal = 0;
      let creditTotal = 0;
      
      Object.entries(replayState?.accountBalances || ({} as Record<string, number>)).forEach(([acc, bal]) => {
        const type = getAccountType(acc);
        const balance = bal as number;
        if (type === 'Revenue') {
          fileContent += `"${acc}",0,${balance.toFixed(2)}\n`;
          creditTotal += balance;
        } else {
          fileContent += `"${acc}",${balance.toFixed(2)},0\n`;
          debitTotal += balance;
        }
      });
      fileContent += `Total,${debitTotal.toFixed(2)},${creditTotal.toFixed(2)}\n`;
    } else if (reportType === 'profit_loss') {
      fileName = `pumpai_profit_loss_${branchId}.csv`;
      fileContent += "Financial Metrics,Amount (INR)\n";
      fileContent += `Gross Revenue (Fuel Sales),${plMetrics.revenue.toFixed(2)}\n`;
      fileContent += `Operational Expenses,${plMetrics.expenses.toFixed(2)}\n`;
      fileContent += `Wetstock Shrinkage Adjustments,${plMetrics.wetstockVariance.toFixed(2)}\n`;
      fileContent += `Cashbook Settlement Discrepancy,${plMetrics.settlementVariance.toFixed(2)}\n`;
      fileContent += `Net Operating Profit,${plMetrics.netProfit.toFixed(2)}\n`;
    } else if (reportType === 'tally_txt') {
      fileName = `tally_ledger_${branchId}.txt`;
      mimeType = "text/plain;charset=utf-8;";
      fileContent += "Date\tDebit Account\tCredit Account\tAmount\tNarration\n";
      
      const sortedTxs = [...transactions].sort((a, b) => a.sequenceId - b.sequenceId);
      sortedTxs.forEach(t => {
        fileContent += `${t.date}\t${t.debitAccount}\t${t.creditAccount}\t${t.amount.toFixed(2)}\t${t.description}\n`;
      });
    } else if (reportType === 'gst_summary') {
      fileName = `gst_tax_summary_${branchId}.csv`;
      fileContent += "Shift Date,Nozzle Sales (INR),Testing Deductions (INR),Taxable Amount (INR),CGST Rate (%),CGST Amount (INR),SGST Rate (%),SGST Amount (INR),Total Sales (INR)\n";
      
      const txsByDate: Record<string, { revenue: number; testing: number }> = {};
      transactions.forEach(t => {
        if (!txsByDate[t.date]) {
          txsByDate[t.date] = { revenue: 0, testing: 0 };
        }
        if (t.creditAccount === 'Fuel Revenue') {
          txsByDate[t.date].revenue += t.amount;
        }
        if (t.debitAccount === 'Wet Stock Adjustments') {
          txsByDate[t.date].testing += t.amount;
        }
      });
      
      const sortedDates = Object.keys(txsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      sortedDates.forEach(date => {
        const { revenue, testing } = txsByDate[date];
        const taxable = Math.max(0, revenue - testing);
        const cgst = taxable * 0.09;
        const sgst = taxable * 0.09;
        const total = revenue;
        fileContent += `"${date}",${revenue.toFixed(2)},${testing.toFixed(2)},${taxable.toFixed(2)},9.0,${cgst.toFixed(2)},9.0,${sgst.toFixed(2)},${total.toFixed(2)}\n`;
      });
    } else if (reportType === 'audit_log') {
      fileName = `chronological_audit_log_${branchId}.csv`;
      fileContent += "Sequence ID,Date,Debit Account,Credit Account,Amount,Description,Timestamp,OCR Confidence (%),Idempotency Key,Rolling Checksum\n";
      
      const sortedTxs = [...transactions].sort((a, b) => a.sequenceId - b.sequenceId);
      sortedTxs.forEach(t => {
        fileContent += `${t.sequenceId},"${t.date}","${t.debitAccount}","${t.creditAccount}",${t.amount.toFixed(2)},"${t.description.replace(/"/g, '""')}","${t.timestamp}",${t.ocrConfidence || 100},"${t.idempotencyKey || ''}","${t.checksum}"\n`;
      });
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
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
              Double-Entry Financial Core
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full uppercase">
              Replay-Safe Verification Active
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A]">
            General Ledger & Chart of Accounts
          </h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            Replay-determined financial balances, audit summaries, and trial balances.
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
              Paddle (Local VLM)
            </button>
            <button
              onClick={() => setBranchId('potaliya-petroleum-google')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                branchId === 'potaliya-petroleum-google'
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Google Cloud VLM
            </button>
          </div>
          
          <button 
            onClick={loadLedgerData}
            className="p-2.5 bg-white border border-[#EBEBEA] hover:bg-slate-50 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Lock Configuration Banner */}
      <div className="bg-white border border-[#EBEBEA] rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex gap-4 items-start">
          <div className="p-3 bg-[#FDF2E9] border border-[#F5CBA7] text-[#D35400] rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-sm">Immutable Period Locking</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Lock ledger entries on or before a specified date to guarantee compliance, shield records from subsequent modification, and safeguard finalized periods.
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="date"
            value={lockDate}
            onChange={(e) => setLockDate(e.target.value)}
            className="bg-white border border-[#EBEBEA] text-xs font-medium px-4 py-2.5 rounded-xl outline-none focus:border-slate-800"
          />
          <button
            onClick={handleUpdateLockPeriod}
            className="bg-[#1A1A1A] text-white px-5 py-2.5 text-xs font-bold rounded-xl hover:bg-[#333333] transition-all flex items-center justify-center gap-2"
          >
            Update Lock Date
          </button>
        </div>
      </div>

      {lockSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold mb-8 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {lockSuccess}
        </div>
      )}

      {/* Replay Verification Summary */}
      {replayState && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Double Entry Check</p>
            <h4 className={`text-xl font-black ${replayState.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
              {replayState.isBalanced ? 'Perfect Parity' : 'Out of Balance'}
            </h4>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-medium">
              <div className={`w-2 h-2 rounded-full ${replayState.isBalanced ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              Debits sum match credits exactly
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Rolling Integrity Checksum</p>
            <h4 className="text-xl font-mono font-bold text-slate-700 tracking-tight">
              {replayState.rollingChecksum.substring(0, 15)}
            </h4>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-medium">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> Cryptographically verified replay path
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Transactions Replayed</p>
            <h4 className="text-2xl font-black text-slate-800">{replayState.processedCount}</h4>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Deterministic reductions stream</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBEBEA] shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Net Operating Profit</p>
            <h4 className={`text-2xl font-black ${plMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ₹{plMetrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Net shift revenues minus variations</p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#EBEBEA] gap-4 mb-8">
        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-4 text-xs font-bold transition-all duration-200 border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'chart' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Landmark className="w-4 h-4" /> Chart of Accounts
        </button>
        <button
          onClick={() => setActiveTab('trial')}
          className={`pb-4 text-xs font-bold transition-all duration-200 border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'trial' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" /> Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('pl')}
          className={`pb-4 text-xs font-bold transition-all duration-200 border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'pl' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Profit & Loss Summary
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 text-xs font-bold transition-all duration-200 border-b-2 px-2 flex items-center gap-2 ${
            activeTab === 'reports' ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" /> Accountant Export
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-[#EBEBEA] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600">Replaying active chronological ledger stream...</p>
        </div>
      ) : (
        <>
          {/* Chart of Accounts Tab */}
          {activeTab === 'chart' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Account List */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
                <div className="flex justify-between items-center gap-4 mb-6">
                  <h3 className="text-base font-bold text-[#1A1A1A]">Registered Ledgers</h3>
                  <div className="relative w-full max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-4 py-2.5 pl-10 rounded-xl outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#EBEBEA] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                        <th className="pb-3 pl-4">Account Name</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3 text-right pr-4">Balance (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F4F3]">
                      {filteredAccounts.map(([acc, bal]) => {
                        const balance = bal as number;
                        return (
                          <tr 
                            key={acc}
                            onClick={() => setSelectedAccount(acc)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            <td className="py-4 pl-4 font-bold text-slate-800 flex items-center gap-2">
                              {acc}
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                            <td className="py-4 text-slate-500 font-medium">{getAccountType(acc)}</td>
                            <td className={`py-4 text-right pr-4 font-black ${
                              getAccountType(acc) === 'Revenue' ? 'text-emerald-700' : 'text-slate-800'
                            }`}>
                              ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Account Detail Right Drawer Panel */}
              <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm h-fit">
                {selectedAccount ? (
                  <div>
                    <h3 className="text-base font-bold text-[#1A1A1A] mb-1">{selectedAccount}</h3>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-0.5 bg-slate-100 rounded">
                      {getAccountType(selectedAccount)}
                    </span>

                    <div className="mt-6 border-t border-[#EBEBEA] pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recent Transactions</p>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">
                          {accountTxs.length} records
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {accountTxs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No transactions found for this account.</p>
                        ) : (
                          accountTxs.slice(-10).reverse().map(t => {
                            const isDebit = t.debitAccount === selectedAccount;
                            return (
                              <div key={t.id} className="p-3 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-[10px] font-bold ${
                                    isDebit ? 'text-[#D35400]' : 'text-slate-500'
                                  }`}>
                                    {isDebit ? 'Debit Entry' : 'Credit Entry'}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-800">
                                    ₹{t.amount.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 mt-1">{t.description}</p>
                                <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400">
                                  <span>{t.date}</span>
                                  <span className="font-mono">seq-{t.sequenceId}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <HelpCircle className="w-10 h-10 text-slate-300 mb-3" />
                    <h4 className="text-sm font-bold text-slate-600">No Account Selected</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                      Click on any ledger account to review its recent debit/credit entries.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trial Balance Tab */}
          {activeTab === 'trial' && (
            <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A]">Trial Balance Sheet</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Determined dynamically from the sequential replay logs.</p>
                </div>
                <button 
                  onClick={() => handleExportCSV('trial_balance')}
                  className="bg-white hover:bg-slate-50 text-[#1A1A1A] border border-[#EBEBEA] px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Export Sheet
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBEBEA] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="pb-3 pl-4">Account Ledger</th>
                      <th className="pb-3 text-right">Debit Balance (INR)</th>
                      <th className="pb-3 text-right pr-4">Credit Balance (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F4F3]">
                    {Object.entries(replayState?.accountBalances || ({} as Record<string, number>)).map(([acc, bal]) => {
                      const isRevenue = getAccountType(acc) === 'Revenue';
                      const balance = bal as number;
                      return (
                        <tr key={acc} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 pl-4 font-bold text-slate-800">{acc}</td>
                          <td className="py-4 text-right font-semibold text-slate-700">
                            {isRevenue ? '₹0.00' : `₹${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className="py-4 text-right pr-4 font-semibold text-slate-700">
                            {isRevenue ? `₹${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Trial Balance Footer Row */}
                    <tr className="border-t-2 border-[#1A1A1A] font-black text-slate-900 bg-slate-50">
                      <td className="py-4 pl-4">Reconciled Ledger Totals</td>
                      <td className="py-4 text-right text-[#D35400]">
                        ₹{Object.entries(replayState?.accountBalances || ({} as Record<string, number>))
                          .reduce((sum, [acc, bal]) => getAccountType(acc) !== 'Revenue' ? sum + (bal as number) : sum, 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right pr-4 text-[#D35400]">
                        ₹{Object.entries(replayState?.accountBalances || ({} as Record<string, number>))
                          .reduce((sum, [acc, bal]) => getAccountType(acc) === 'Revenue' ? sum + (bal as number) : sum, 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Profit & Loss Tab */}
          {activeTab === 'pl' && (
            <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A]">Profit & Loss Statement</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated by replaying sequential business operations.</p>
                </div>
                <button 
                  onClick={() => handleExportCSV('profit_loss')}
                  className="bg-white hover:bg-slate-50 text-[#1A1A1A] border border-[#EBEBEA] px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Export P&L
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {/* Revenue Row */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-emerald-800 font-bold">Gross Fuel Revenue</h4>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Accrued from nozzle sales & credit allocations</p>
                  </div>
                  <span className="text-lg font-black text-emerald-700">
                    ₹{plMetrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Adjustments & Expenses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-[#FDF2E9] rounded-xl border border-[#F5CBA7] flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Operational Expenses</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Tea, operational supplies, advance recovery</p>
                    </div>
                    <span className="text-base font-black text-[#D35400] mt-4">
                      ₹{plMetrics.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-[#FDF2E9] rounded-xl border border-[#F5CBA7] flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Wet Stock Variance Dues</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Evaporation, calibration gaps & dips variance</p>
                    </div>
                    <span className="text-base font-black text-[#D35400] mt-4">
                      ₹{plMetrics.wetstockVariance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-[#FDF2E9] rounded-xl border border-[#F5CBA7] flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Cash till Discrepancies</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Attendant shortages or cashier overflow</p>
                    </div>
                    <span className="text-base font-black text-[#D35400] mt-4">
                      ₹{plMetrics.settlementVariance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Net Income Divider */}
                <div className="border-t border-[#EBEBEA] pt-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">Net Operating Profit</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Accumulated cash increase/decrease net values</p>
                  </div>
                  <span className={`text-xl font-black ${
                    plMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-[#D35400]'
                  }`}>
                    ₹{plMetrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Export / Accountant Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#1A1A1A] mb-1">Accountant Export Panel</h3>
              <p className="text-xs text-slate-400 mb-6">Download GST-ready standard audit files for legal and CA reconciliation.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 border border-[#EBEBEA] rounded-2xl hover:border-slate-800 transition-colors flex flex-col justify-between h-full bg-[#F9F9F8]">
                  <div>
                    <div className="p-3 bg-white border border-[#EBEBEA] rounded-xl w-fit text-[#1A1A1A] shadow-sm mb-4">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tally / ERP Ledger TXT</h4>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Export chronological debit/credit postings in Tally Prime compatible tab-delimited format.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleExportCSV('tally_txt')}
                    className="mt-6 bg-[#1A1A1A] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#333333] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-white" /> Download Tally TXT
                  </button>
                </div>

                <div className="p-5 border border-[#EBEBEA] rounded-2xl hover:border-slate-800 transition-colors flex flex-col justify-between h-full bg-[#F9F9F8]">
                  <div>
                    <div className="p-3 bg-white border border-[#EBEBEA] rounded-xl w-fit text-[#1A1A1A] shadow-sm mb-4">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">GST-Ready Tax Summary</h4>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Detailed breakup of nozzle sales, calculated SGST/CGST rates and compliance tags.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleExportCSV('gst_summary')}
                    className="mt-6 bg-[#1A1A1A] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#333333] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-white" /> Download GST Excel
                  </button>
                </div>

                <div className="p-5 border border-[#EBEBEA] rounded-2xl hover:border-slate-800 transition-colors flex flex-col justify-between h-full bg-[#F9F9F8]">
                  <div>
                    <div className="p-3 bg-white border border-[#EBEBEA] rounded-xl w-fit text-[#1A1A1A] shadow-sm mb-4">
                      <AlertTriangle className="w-5 h-5 animate-pulse text-[#D35400]" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Full Chronological Audit Log</h4>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Complete transactional ledger containing sequence IDs, VLM confidence telemetry and tamper-evident rolling checksums.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleExportCSV('audit_log')}
                    className="mt-6 bg-[#1A1A1A] text-white py-2 px-4 rounded-xl text-xs font-bold hover:bg-[#333333] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-white" /> Download Ledger CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
