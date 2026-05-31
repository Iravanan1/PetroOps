import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Landmark, Receipt, Landmark as BankIcon, 
  Users, ShieldAlert, Award, FileText, CheckCircle2, AlertTriangle, Printer
} from 'lucide-react';
import { useReconciledShifts, ShiftRecord } from '../../shared/hooks/useReconciledShifts';
import { ShiftApprovalFlow, ShiftApprovalStatus } from '../ShiftApprovalFlow';
import { OperationalPDFGenerator } from '../OperationalPDFGenerator';
import { CashbookEngine } from '../CashbookEngine';
import TaxPreparationWorkspace from './TaxPreparationWorkspace';
import BankReconciliationCenter from './BankReconciliationCenter';
import ExpenseManagementCenter from './ExpenseManagementCenter';
import SupplierManagementCenter from './SupplierManagementCenter';
import EmployeeOperationsCenter from './EmployeeOperationsCenter';
import DocumentAuditCenter from './DocumentAuditCenter';

type AccountantTab = 'JOURNALS' | 'TAX_PREP' | 'RECONCILIATION' | 'EXPENSE_CASH' | 'SUPPLIER' | 'PAYROLL' | 'AUDIT_VAULT';

export default function AccountantWorkspace() {
  const [activeTab, setActiveTab] = useState<AccountantTab>('JOURNALS');
  const [pipeline] = useState<'potaliya-petroleum' | 'potaliya-petroleum-google'>('potaliya-petroleum');
  const { shifts, loading } = useReconciledShifts(pipeline);
  
  // Local shifts flow list for locking approvals review
  const [shiftsFlowList, setShiftsFlowList] = useState<ShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState('');
  const [lockStatusMap, setLockStatusMap] = useState<Record<string, ShiftApprovalStatus>>({});

  useEffect(() => {
    if (shifts.length > 0) {
      setShiftsFlowList(shifts);
      setSelectedShiftId(shifts[0].id);

      // Initialize Lock check flows
      const initialMap: Record<string, ShiftApprovalStatus> = {};
      shifts.forEach(shift => {
        // Run simulated ledger continuity validator gates
        const nozzles = (shift.readings || []).map(r => ({
          nozzleId: `noz-0${r.id}`,
          fuelType: r.fuel as any,
          openingMeter: r.opening,
          closingMeter: r.closing,
          testingQty: r.testing,
          netSales: Math.max(0, r.closing - r.opening - r.testing),
          fuelRate: r.rate
        })) || [];

        const approval = ShiftApprovalFlow.runLockVerification({
          shiftId: shift.id,
          nozzles,
          creditEntries: [],
          openingCash: shift.openingCash,
          actualCash: shift.actualCash,
          upiSales: shift.upiSales,
          cardSales: shift.cardSales,
          creditSales: shift.creditSales,
          creditRecovery: shift.creditRecovery,
          expenses: shift.expenses,
          ocrReviewCompleted: shift.status === 'APPROVED',
          wetstockVarianceRecorded: shift.status === 'APPROVED'
        });

        initialMap[shift.id] = approval;
      });
      setLockStatusMap(initialMap);
    }
  }, [shifts]);

  const handleSealShift = (shiftId: string) => {
    const res = ShiftApprovalFlow.sealAndLockShift(shiftId, 'Manager Anjali', overrideText || undefined);
    
    if (res.success) {
      setLockStatusMap(prev => {
        const copy = { ...prev };
        if (copy[shiftId]) {
          copy[shiftId] = {
            ...copy[shiftId],
            status: 'LOCKED',
            isLocked: true,
            lockedBy: 'Manager Anjali',
            overrideJustification: overrideText || undefined
          };
        }
        return copy;
      });

      setShiftsFlowList(prev => prev.map(s => {
        if (s.id === shiftId) {
          return { ...s, status: 'APPROVED' };
        }
        return s;
      }));

      setOverrideText('');
      alert('Shift double-entry state successfully locked & sealed! Accountant audit trail logged.');
    } else {
      alert(`Seal failed: ${res.error}`);
    }
  };

  const handlePrintSelectedJournal = (shift: ShiftRecord) => {
    const cbLogs = CashbookEngine.generateMockLogs(shift.shiftDate);
    OperationalPDFGenerator.printCashbook(
      `Daily Shift Journal - ${shift.shiftLabel}`,
      cbLogs,
      shift.openingCash
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center text-xs font-mono font-bold text-[#666666]">
        <span>Consolidating Accountant ledger workspaces...</span>
      </div>
    );
  }

  const selectedShift = shiftsFlowList.find(s => s.id === selectedShiftId);
  const selectedFlow = selectedShiftId ? lockStatusMap[selectedShiftId] : null;

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] pb-20 font-sans">
      
      {/* Title bar Header */}
      <nav className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#EBEBEA] bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-[#1A1A1A] uppercase">
              Accountant & Compliance Workspace
            </h1>
            <p className="text-[9px] text-[#666666] font-bold uppercase tracking-wider">Authoritative Accounting & Reconciliation Console</p>
          </div>
        </div>
      </nav>

      {/* Tabs navigation row */}
      <div className="border-b border-[#EBEBEA] bg-white sticky top-0 z-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 py-3">
          {(
            [
              { id: 'JOURNALS', label: '📊 Daily Journals', role: 'Daily shift lock review' },
              { id: 'TAX_PREP', label: '🏛️ GST & Tax Prep', role: 'GSTR outward CSVs' },
              { id: 'RECONCILIATION', label: '💳 Bank Reconciliation', role: 'Digital Paytm credits' },
              { id: 'EXPENSE_CASH', label: '💸 Expense Cashbook', role: 'Petty Cash books' },
              { id: 'SUPPLIER', label: '🚚 Supplier Ledgers', role: 'Dues age profiles' },
              { id: 'PAYROLL', label: '👥 Attendant Payroll', role: 'Advance salary pay' },
              { id: 'AUDIT_VAULT', label: '📂 Document Audit', role: 'WAL scans backups' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer text-left min-h-[48px] border flex flex-col justify-center ${
                activeTab === tab.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-white border-[#EBEBEA] hover:bg-[#F9F9F8] text-[#666666]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[8px] uppercase tracking-wider font-bold block mt-0.5 ${
                activeTab === tab.id ? 'text-[#D35400]' : 'text-[#999999]'
              }`}>{tab.role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Core Workspace Main panel wrapper */}
      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === 'JOURNALS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Shifts list sidebar selection */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#666666]">
                Shift Journal Timeline
              </h3>
              
              <div className="space-y-3">
                {shiftsFlowList.map(shift => {
                  const flow = lockStatusMap[shift.id];
                  const isLocked = flow?.status === 'LOCKED';

                  return (
                    <div
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                        selectedShiftId === shift.id
                          ? 'border-[#D35400] bg-amber-50/20 shadow-xs'
                          : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-black text-[#1A1A1A]">{shift.shiftLabel}</h4>
                          <span className="text-[9px] font-mono text-[#666666] block mt-0.5">{shift.shiftDate} • ID {shift.id}</span>
                        </div>
                        <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${
                          isLocked 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : shift.status === 'APPROVED'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {isLocked ? 'LOCKED' : shift.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#EBEBEA] text-xs">
                        <span className="text-[#666666]">Actual Cash collections</span>
                        <span className="font-extrabold text-[#1A1A1A]">₹{shift.actualCash.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Shift Ledger review checklist */}
            <div className="lg:col-span-2 space-y-6">
              {selectedShift && selectedFlow ? (
                <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-[#EBEBEA]">
                    <div>
                      <h3 className="text-sm font-black text-[#1A1A1A] uppercase tracking-tight">{selectedShift.shiftLabel}</h3>
                      <p className="text-[10px] text-[#666666] font-mono mt-0.5">Date: {selectedShift.shiftDate} • Operator: Attendant Ramesh</p>
                    </div>

                    <button
                      onClick={() => handlePrintSelectedJournal(selectedShift)}
                      className="px-4 py-2.5 bg-[#F9F9F8] hover:bg-[#EBEBEA] border border-[#D9D9D6] text-[#1A1A1A] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4 text-[#666666]" /> Print Journal
                    </button>
                  </div>

                  {/* Continuity Validation check gauges */}
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#666666] block">Ledger Verification Checkpoints</span>
                    
                    <div className="space-y-3">
                      {selectedFlow.checkpoints.map((cp, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 border rounded-2xl flex items-start justify-between gap-4 ${
                            cp.passed
                              ? 'bg-emerald-50/20 border-emerald-100 text-emerald-950'
                              : cp.severity === 'FATAL'
                                ? 'bg-rose-50/20 border-rose-100 text-rose-950'
                                : 'bg-amber-50/20 border-amber-100 text-amber-950'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-black block">{cp.name}</span>
                            <span className="text-[10px] text-[#666666] leading-relaxed block">{cp.description}</span>
                          </div>

                          <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase flex-shrink-0 mt-0.5 ${
                            cp.passed
                              ? 'bg-emerald-50 text-emerald-800'
                              : cp.severity === 'FATAL'
                                ? 'bg-rose-50 text-rose-800 animate-pulse'
                                : 'bg-amber-50 text-amber-800'
                          }`}>
                            {cp.passed ? 'PASSED' : cp.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ledger Period Lock form */}
                  {selectedFlow.status !== 'LOCKED' ? (
                    <div className="border border-[#EBEBEA] rounded-2xl p-5 bg-[#F9F9F8] space-y-4">
                      <div>
                        <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Seal Accounting Period Ledger</h4>
                        <p className="text-[9px] text-[#666666] font-bold block mt-0.5">Sealing a shift locks its entries, preventing any operational modifications.</p>
                      </div>

                      {selectedFlow.checkpoints.some(c => c.severity === 'FATAL' && !c.passed) && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-rose-800 font-extrabold block">
                            ⚠️ Fatal Accounting Continuity break detected! Supervisor Override credential keys justification required:
                          </label>
                          <textarea
                            value={overrideText}
                            onChange={e => setOverrideText(e.target.value)}
                            placeholder="Enter detailed validation justification..."
                            className="w-full bg-white border border-rose-200 focus:border-rose-400 rounded-xl p-3 text-xs font-bold text-[#1A1A1A] focus:outline-none h-20"
                            required
                          />
                        </div>
                      )}

                      <button
                        onClick={() => handleSealShift(selectedShift.id)}
                        className="px-5 py-3 bg-[#D35400] hover:bg-[#A04000] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                      >
                        Authorize & Lock Shift Ledger
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider block">Accounting state Sealed & Locked</span>
                        <span className="text-[9px] block mt-0.5">
                          Approved by: {selectedFlow.lockedBy} • Justification logged: {selectedFlow.overrideJustification || 'Ledger checks passed flawlessly.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-[#D9D9D6] rounded-3xl bg-white text-center text-xs font-bold text-[#999999] italic">
                  Select a shift journal entry on the left to verify ledgers
                </div>
              )}
            </div>
          </div>
        )}

        {/* GST Tab */}
        {activeTab === 'TAX_PREP' && <TaxPreparationWorkspace />}

        {/* Bank Reconciliation Tab */}
        {activeTab === 'RECONCILIATION' && <BankReconciliationCenter />}

        {/* Cashbook tab */}
        {activeTab === 'EXPENSE_CASH' && <ExpenseManagementCenter />}

        {/* Suppliers tab */}
        {activeTab === 'SUPPLIER' && <SupplierManagementCenter />}

        {/* Attendance payroll tab */}
        {activeTab === 'PAYROLL' && <EmployeeOperationsCenter />}

        {/* Secure auditing files vault */}
        {activeTab === 'AUDIT_VAULT' && <DocumentAuditCenter />}
      </div>
    </div>
  );
}
