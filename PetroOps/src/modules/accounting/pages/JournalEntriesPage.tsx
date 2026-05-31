import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, ShieldCheck, ShieldAlert, Calendar, BookOpen, 
  ArrowRight, Download, Filter, RefreshCw, X, AlertTriangle, Check
} from 'lucide-react';
import { AccountingService } from '../AccountingService';
import { LedgerTransaction } from '../TransactionNormalizer';

const STANDARD_ACCOUNTS = [
  'Cash Till',
  'UPI Clearing',
  'Card Clearing',
  'Accounts Receivable',
  'Expense Accounts',
  'Wet Stock Adjustments',
  'Settlement Adjustments',
  'Fuel Revenue'
];

export default function JournalEntriesPage() {
  const [branchId, setBranchId] = useState<string>('potaliya-petroleum');
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  
  // Drawer / Add form state
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    debitAccount: 'Cash Till',
    creditAccount: 'Fuel Revenue',
    amount: '',
    description: ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDebit, setSelectedDebit] = useState<string>('ALL');
  const [selectedCredit, setSelectedCredit] = useState<string>('ALL');
  const [showLockedOnly, setShowLockedOnly] = useState<boolean>(false);

  const lockDate = AccountingService.getPeriodLockDate(branchId);

  useEffect(() => {
    loadTransactions();
  }, [branchId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const txs = await AccountingService.getAllTransactions(branchId);
      setTransactions(txs);
    } catch (e) {
      console.error('[JournalEntries] Error loading transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amt = parseFloat(newEntry.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please specify a positive valid numerical amount.');
      return;
    }

    if (newEntry.debitAccount === newEntry.creditAccount) {
      setErrorMsg('Double entry violation: Debit and Credit accounts must be distinct.');
      return;
    }

    if (newEntry.date <= lockDate) {
      setErrorMsg(`Immutable Period Violation: Cannot post transactions on or before locked date ${lockDate}.`);
      return;
    }

    if (!newEntry.description.trim()) {
      setErrorMsg('Please enter a brief transaction remark description.');
      return;
    }

    try {
      const posted = await AccountingService.saveManualJournalEntry(branchId, {
        date: newEntry.date,
        debitAccount: newEntry.debitAccount,
        creditAccount: newEntry.creditAccount,
        amount: amt,
        description: newEntry.description
      });

      setSuccessMsg(`Journal Entry ${posted.id} posted successfully! Replay cache rebuilt.`);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        debitAccount: 'Cash Till',
        creditAccount: 'Fuel Revenue',
        amount: '',
        description: ''
      });
      setShowDrawer(false);
      loadTransactions();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Posting failed.');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDebit = selectedDebit === 'ALL' || t.debitAccount === selectedDebit;
    const matchesCredit = selectedCredit === 'ALL' || t.creditAccount === selectedCredit;
    
    const isLocked = t.date <= lockDate;
    const matchesLock = !showLockedOnly || isLocked;

    return matchesSearch && matchesDebit && matchesCredit && matchesLock;
  });

  const handleExportTXT = () => {
    let content = `=========================================================\n`;
    content += `PUMPAI ADVANCED ERP JOURNAL LOG - ${branchId.toUpperCase()}\n`;
    content += `EXPORTED ON: ${new Date().toLocaleString()}\n`;
    content += `PERIOD LOCK ACTIVE UP TO: ${lockDate}\n`;
    content += `=========================================================\n\n`;

    filteredTransactions.forEach(t => {
      content += `[ID: ${t.id}] [DATE: ${t.date}] [SEQ: ${t.sequenceId}]\n`;
      content += `   DEBIT  : ${t.debitAccount.padEnd(25)}  INR ${t.amount.toFixed(2)}\n`;
      content += `   CREDIT : ${t.creditAccount.padEnd(25)}  INR ${t.amount.toFixed(2)}\n`;
      content += `   REMARK : ${t.description}\n`;
      content += `   VERIFY : CHECKSUM=${t.checksum.substring(0, 16)}... CLOCK_LOCK=${t.date <= lockDate ? 'LOCKED' : 'OPEN'}\n`;
      content += `---------------------------------------------------------\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `pumpai_journal_entries_${branchId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 md:p-8 font-sans relative">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-[#EBEBEA] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#D35400] bg-[#FDF2E9] border border-[#F5CBA7] rounded-full uppercase">
              General Journal Engine
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full uppercase">
              Immutable Shift-Log Bound
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A]">
            Journal & Double-Entry Postings
          </h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            Raw double-entry transaction ledgers, sequential auditing, and manual adjustments logs.
          </p>
        </div>

        {/* Branch Selector & Add Action */}
        <div className="flex items-center gap-3 w-full md:w-auto">
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
            onClick={() => setShowDrawer(true)}
            className="bg-[#1A1A1A] text-white px-4 py-2.5 text-xs font-bold rounded-xl hover:bg-[#333333] transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Post Journal Entry
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold mb-8 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Main Journal Dashboard */}
      <div className="bg-white rounded-2xl border border-[#EBEBEA] p-6 shadow-sm">
        {/* Filters Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-[#F4F4F3] pb-6">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search descriptions/ids..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-4 py-2.5 pl-10 rounded-xl outline-none focus:border-slate-800"
              />
            </div>

            {/* Debit filter */}
            <select
              value={selectedDebit}
              onChange={(e) => setSelectedDebit(e.target.value)}
              className="bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Debit Account: All</option>
              {STANDARD_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Credit filter */}
            <select
              value={selectedCredit}
              onChange={(e) => setSelectedCredit(e.target.value)}
              className="bg-[#F9F9F8] border border-[#EBEBEA] text-xs px-3 py-2.5 rounded-xl outline-none"
            >
              <option value="ALL">Credit Account: All</option>
              {STANDARD_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Locked check */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 bg-[#F9F9F8] px-3.5 py-2.5 rounded-xl border border-[#EBEBEA]">
              <input
                type="checkbox"
                checked={showLockedOnly}
                onChange={(e) => setShowLockedOnly(e.target.checked)}
                className="rounded text-[#1A1A1A] outline-none"
              />
              Show Locked Only
            </label>
          </div>

          <button
            onClick={handleExportTXT}
            className="w-full lg:w-auto bg-[#F9F9F8] border border-[#EBEBEA] hover:bg-slate-50 text-[#1A1A1A] font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-slate-600" /> Export Tally TXT
          </button>
        </div>

        {/* Journal Stream */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-500">Compiling double-entry posting streams...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-xs">
            No double-entry journals match the configured filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EBEBEA] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="pb-3 pl-4">Transaction Code</th>
                  <th className="pb-3">Date / Seq</th>
                  <th className="pb-3">Remark / Description</th>
                  <th className="pb-3">Debit Ledger</th>
                  <th className="pb-3">Credit Ledger</th>
                  <th className="pb-3 text-right">Amount (INR)</th>
                  <th className="pb-3 text-center pr-4">Audited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F3]">
                {filteredTransactions.map((tx) => {
                  const isLocked = tx.date <= lockDate;
                  const isManual = tx.id.includes('manual');
                  const lowConfidence = tx.ocrConfidence !== undefined && tx.ocrConfidence < 85;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-4 font-mono font-bold text-slate-700">
                        {tx.id.substring(0, 20)}
                        {isManual && (
                          <span className="ml-2 px-1.5 py-0.5 text-[8px] bg-slate-100 text-slate-600 border border-slate-200 rounded uppercase font-semibold">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-slate-800">{tx.date}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">seq-{tx.sequenceId}</div>
                      </td>
                      <td className="py-4 max-w-xs font-medium text-slate-700">
                        {tx.description}
                        {tx.sourceDocumentId && (
                          <div className="text-[9px] text-slate-400 mt-1 font-mono">Doc: {tx.sourceDocumentId}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="font-semibold text-slate-800 bg-[#FDF2E9] border border-[#FDF2E9] text-[10px] px-2.5 py-1 rounded-lg">
                          {tx.debitAccount}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 text-[10px] px-2.5 py-1 rounded-lg">
                          {tx.creditAccount}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black text-slate-900">
                        ₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isLocked ? (
                            <span className="px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Locked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-bold uppercase flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" /> Open Period
                            </span>
                          )}
                          
                          {lowConfidence && (
                            <span className="text-[8px] text-rose-500 font-extrabold uppercase tracking-wide">
                              Low Confidence
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Drawer Modal */}
      {showDrawer && (
        <div className="fixed inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#F9F9F8] w-full max-w-lg h-full border-l border-[#EBEBEA] shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-[#1A1A1A] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#D35400]" /> Post Manual Journal
                </h3>
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handlePostJournal} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Date</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800"
                  />
                  {newEntry.date <= lockDate && (
                    <span className="text-[9px] text-[#D35400] font-bold">
                      Warning: Date is locked. Cannot submit.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Debit Account (Increase Assets/Expenses)</label>
                  <select
                    value={newEntry.debitAccount}
                    onChange={(e) => setNewEntry({...newEntry, debitAccount: e.target.value})}
                    className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800"
                  >
                    {STANDARD_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Credit Account (Increase Revenues/Liabilities)</label>
                  <select
                    value={newEntry.creditAccount}
                    onChange={(e) => setNewEntry({...newEntry, creditAccount: e.target.value})}
                    className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800"
                  >
                    {STANDARD_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount (e.g. 5000.00)"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                    className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Remark / Description</label>
                  <textarea
                    placeholder="Enter transaction purpose (e.g. Tea operational expenses topup)"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    rows={3}
                    className="bg-white border border-[#EBEBEA] text-xs px-4 py-3 rounded-xl outline-none focus:border-slate-800 resize-none font-medium text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={newEntry.date <= lockDate}
                  className="bg-[#1A1A1A] hover:bg-[#333333] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full mt-4 shadow-md"
                >
                  <Check className="w-4 h-4" /> Confirm Posting
                </button>
              </form>
            </div>
            
            <div className="text-[10px] text-slate-400 border-t border-[#EBEBEA] pt-4 mt-6 text-center">
              Safe VLM Ledger compliance check: Manual entries automatically receive audit tracking keys.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
