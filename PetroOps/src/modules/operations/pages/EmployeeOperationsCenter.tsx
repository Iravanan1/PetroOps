import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, CheckCircle2, ShieldAlert, 
  Banknote, Search, Calendar, ChevronRight, Settings
} from 'lucide-react';
import { PayrollSummaryEngine, EmployeeRecord } from '../PayrollSummaryEngine';

export default function EmployeeOperationsCenter() {
  const [selectedMonth] = useState<string>('2026-05');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // New advance form
  const [advanceForm, setAdvanceForm] = useState({
    empId: '',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    const rawRoster = PayrollSummaryEngine.getMockRoster();
    const calculated = PayrollSummaryEngine.calculatePayroll(rawRoster);
    setEmployees(calculated);
    if (calculated.length > 0) {
      setAdvanceForm(prev => ({ ...prev, empId: calculated[0].id }));
    }
  }, [selectedMonth]);

  // Request advance salary deduction
  const handleRequestAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.amount || !advanceForm.empId) return;

    const amt = Number(advanceForm.amount);
    setEmployees(prev => prev.map(emp => {
      if (emp.id === advanceForm.empId) {
        const advances = emp.advancesTaken + amt;
        const gross = emp.dailyWage * emp.daysPresent;
        const net = Math.max(0, gross - advances - emp.deductions);
        return {
          ...emp,
          advancesTaken: advances,
          netPayable: net
        };
      }
      return emp;
    }));

    setAdvanceForm(prev => ({ ...prev, amount: '', reason: '' }));
  };

  // Pay monthly wage
  const handlePaySalary = (empId: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        return {
          ...emp,
          netPayable: 0,
          advancesTaken: 0,
          deductions: 0
        };
      }
      return emp;
    }));
  };

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Overview layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendant directory roster */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Employee Roster Directory</h4>
          
          <div className="space-y-3">
            {employees.map(emp => (
              <div 
                key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id === selectedEmployeeId ? null : emp.id)}
                className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                  selectedEmployeeId === emp.id
                    ? 'border-[#D35400] bg-amber-50/20'
                    : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-black text-[#1A1A1A]">{emp.name}</h5>
                    <span className="text-[9px] font-mono text-[#666666] uppercase block mt-0.5">{emp.role} • ID {emp.id}</span>
                  </div>
                  <Users className={`w-4 h-4 ${selectedEmployeeId === emp.id ? 'text-[#D35400]' : 'text-[#666666]'}`} />
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-[#EBEBEA] text-xs">
                  <span className="text-[#666666]">Net Wage Due</span>
                  <span className="font-extrabold text-[#1A1A1A]">₹{emp.netPayable.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Employee details or Advance forms */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEmployeeId ? (
            (() => {
              const selectedEmp = employees.find(e => e.id === selectedEmployeeId);
              if (!selectedEmp) return null;

              return (
                <div className="space-y-6">
                  {/* Attendance and payroll detail cards */}
                  <div className="border border-[#EBEBEA] rounded-2xl p-5 space-y-4 bg-white">
                    <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">
                      Payroll Summary Details: {selectedEmp.name}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs font-bold text-[#1A1A1A]">
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] text-[#666666] block">Days Present</span>
                        <span className="text-base font-black mt-1 block">{selectedEmp.daysPresent} days</span>
                      </div>
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] text-[#666666] block">Daily Wage Rate</span>
                        <span className="text-base font-black mt-1 block">₹{selectedEmp.dailyWage}</span>
                      </div>
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] text-[#666666] block">Advances Outstanding</span>
                        <span className="text-base font-black text-rose-700 mt-1 block">₹{selectedEmp.advancesTaken.toLocaleString()}</span>
                      </div>
                      <div className="bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl p-3">
                        <span className="text-[9px] text-[#666666] block">Deductions/Fines</span>
                        <span className="text-base font-black text-rose-700 mt-1 block">₹{selectedEmp.deductions.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-[#EBEBEA]">
                      <div>
                        <span className="text-[10px] text-[#666666] font-black uppercase">Net Treasury Disbursal</span>
                        <span className="text-lg font-black text-emerald-800 block">₹{selectedEmp.netPayable.toLocaleString()}</span>
                      </div>
                      {selectedEmp.netPayable > 0 && (
                        <button
                          onClick={() => handlePaySalary(selectedEmp.id)}
                          className="px-5 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-black uppercase tracking-wider rounded-2xl min-h-[48px] cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Banknote className="w-4.5 h-4.5" /> Disburse Wages
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="border border-[#EBEBEA] rounded-3xl p-6 bg-white space-y-6">
              <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">File Shift Advance Deduction</h4>
              
              <form onSubmit={handleRequestAdvance} className="space-y-4 text-xs font-bold text-[#1A1A1A]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] block">Attendant Roster</label>
                    <select
                      value={advanceForm.empId}
                      onChange={e => setAdvanceForm({...advanceForm, empId: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    >
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[#666666] uppercase text-[9px] block">Advance Amount (INR)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 500"
                      value={advanceForm.amount}
                      onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})}
                      className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#666666] uppercase text-[9px] block">Override justification reason</label>
                  <input 
                    type="text" 
                    placeholder="Attendant personal medical emergency / travel..."
                    value={advanceForm.reason}
                    onChange={e => setAdvanceForm({...advanceForm, reason: e.target.value})}
                    className="w-full bg-[#F9F9F8] border border-[#D9D9D6] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#D35400] hover:bg-[#A04000] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Approve Shift Cash Advance
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
