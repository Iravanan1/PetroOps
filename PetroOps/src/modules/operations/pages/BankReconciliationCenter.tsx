import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Clock, RefreshCw, 
  HelpCircle, ChevronRight, Check, ShieldAlert, Award
} from 'lucide-react';
import { SettlementMatchingEngine, BankTransaction, ShiftDigitalSale } from '../SettlementMatchingEngine';

export default function BankReconciliationCenter() {
  const [selectedMonth] = useState<string>('2026-05');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [reconciledSales, setReconciledSales] = useState<ShiftDigitalSale[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'MATCHED' | 'PENDING' | 'MISMATCH'>('ALL');
  
  // Stats
  const [stats, setStats] = useState({
    totalMatched: 0,
    totalPending: 0,
    totalMismatch: 0,
    unresolvedDiscrepancy: 0
  });

  useEffect(() => {
    const bankTx = SettlementMatchingEngine.generateMockTransactions(selectedMonth);
    const cashierSales = SettlementMatchingEngine.generateMockCashierRegisters(selectedMonth);
    const results = SettlementMatchingEngine.matchSettlements(cashierSales, bankTx);
    
    setTransactions(bankTx);
    setReconciledSales(results);
  }, [selectedMonth]);

  useEffect(() => {
    let matchedVal = 0;
    let pendingVal = 0;
    let mismatchVal = 0;
    let gap = 0;

    reconciledSales.forEach(s => {
      if (s.settlementStatus === 'MATCHED') {
        matchedVal += s.cashierAmount;
      } else if (s.settlementStatus === 'PENDING_SETTLEMENT') {
        pendingVal += s.cashierAmount;
      } else if (s.settlementStatus === 'MISMATCH') {
        mismatchVal += s.cashierAmount;
        gap += Math.abs((s.portalAmount || 0) - s.cashierAmount);
      }
    });

    setStats({
      totalMatched: matchedVal,
      totalPending: pendingVal,
      totalMismatch: mismatchVal,
      unresolvedDiscrepancy: gap
    });
  }, [reconciledSales]);

  // Adjust / Manual override function
  const handleForceMatch = (saleId: string) => {
    setReconciledSales(prev => prev.map(s => {
      if (s.id === saleId) {
        return {
          ...s,
          settlementStatus: 'MATCHED' as const,
          portalAmount: s.cashierAmount,
          auditComment: 'Accountant approved manually with matching bank voucher adjustment.'
        };
      }
      return s;
    }));
  };

  const filteredSales = reconciledSales.filter(s => {
    if (filter === 'ALL') return true;
    if (filter === 'MATCHED') return s.settlementStatus === 'MATCHED';
    if (filter === 'PENDING') return s.settlementStatus === 'PENDING_SETTLEMENT';
    if (filter === 'MISMATCH') return s.settlementStatus === 'MISMATCH';
    return true;
  });

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Header section with Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider block">Matched Credits</span>
          </div>
          <span className="text-base font-black text-[#1A1A1A] mt-1.5 block">₹{stats.totalMatched.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">Cleared gateway deposits</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-1.5 text-amber-800">
            <Clock className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider block">Transit Pending</span>
          </div>
          <span className="text-base font-black text-[#1A1A1A] mt-1.5 block">₹{stats.totalPending.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">Settlement pending in transit</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider block">Discrepancy Flags</span>
          </div>
          <span className="text-base font-black text-[#1A1A1A] mt-1.5 block">₹{stats.totalMismatch.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">Ledger variance detected</span>
        </div>

        <div className="border border-[#EBEBEA] rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-1.5 text-red-800">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider block">Unresolved variance</span>
          </div>
          <span className="text-base font-black text-red-700 mt-1.5 block">₹{stats.unresolvedDiscrepancy.toLocaleString()}</span>
          <span className="text-[9px] text-[#666666] font-bold block mt-0.5">Outstanding deficit balance</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EBEBEA] pb-3">
        <span className="text-xs font-bold text-[#666666] mr-2">Reconciliation Status:</span>
        {(['ALL', 'MATCHED', 'PENDING', 'MISMATCH'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filter === tab
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#F9F9F8] text-[#666666] hover:bg-[#EBEBEA]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Grid mapping table */}
      <div className="border border-[#EBEBEA] rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F9F9F8] border-b border-[#EBEBEA] text-[#666666] uppercase font-black tracking-wider text-[9px]">
            <tr>
              <th className="p-4">Transaction Date</th>
              <th className="p-4">Collection Gateway</th>
              <th className="p-4">Shift Cashier Record</th>
              <th className="p-4">Bank Statement Credit</th>
              <th className="p-4">Delay (Days)</th>
              <th className="p-4">Matching Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBEA] font-bold text-[#1A1A1A]">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-[#F9F9F8]/50 transition-colors">
                <td className="p-4 font-mono">{sale.date}</td>
                <td className="p-4 uppercase tracking-wider text-[10px]">{sale.gateway.replace('_', ' ')}</td>
                <td className="p-4">₹{sale.cashierAmount.toLocaleString()}</td>
                <td className="p-4">
                  {sale.portalAmount !== undefined ? `₹${sale.portalAmount.toLocaleString()}` : <span className="text-[#999999] italic">Pending</span>}
                </td>
                <td className="p-4">
                  {sale.delayDays !== undefined ? `${sale.delayDays} day${sale.delayDays > 1 ? 's' : ''}` : '-'}
                </td>
                <td className="p-4">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    sale.settlementStatus === 'MATCHED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : sale.settlementStatus === 'PENDING_SETTLEMENT'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {sale.settlementStatus.replace('_', ' ')}
                  </span>
                  {sale.auditComment && (
                    <span className="block text-[8px] text-[#666666] mt-0.5">{sale.auditComment}</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {sale.settlementStatus !== 'MATCHED' && (
                    <button
                      onClick={() => handleForceMatch(sale.id)}
                      className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Override Match
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
