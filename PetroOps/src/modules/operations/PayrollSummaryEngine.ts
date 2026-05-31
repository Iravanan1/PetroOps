/**
 * PayrollSummaryEngine.ts
 * ───────────────────────
 * Tracks attendant attendance logs, shift base wages, advances, and payroll balances.
 * Lightweight, operational-grade payroll tracking to avoid complex ERP architecture.
 */

export interface EmployeeRecord {
  id: string;
  name: string;
  role: 'attendant' | 'manager' | 'security' | 'cleaner';
  dailyWage: number;
  daysPresent: number;
  advancesTaken: number;
  deductions: number;
  netPayable: number;
}

export class PayrollSummaryEngine {
  /**
   * Calculates net payable salaries for the employee roster
   */
  public static calculatePayroll(employees: Omit<EmployeeRecord, 'netPayable'>[]): EmployeeRecord[] {
    return employees.map(emp => {
      const gross = emp.dailyWage * emp.daysPresent;
      const net = Math.max(0, gross - emp.advancesTaken - emp.deductions);
      return {
        ...emp,
        netPayable: parseFloat(net.toFixed(2))
      };
    });
  }

  /**
   * Generates mock monthly payroll details
   */
  public static getMockRoster(): Omit<EmployeeRecord, 'netPayable'>[] {
    return [
      { id: 'emp-001', name: 'Ramesh Sawant', role: 'attendant', dailyWage: 650, daysPresent: 26, advancesTaken: 2500, deductions: 0 },
      { id: 'emp-002', name: 'Sanjay Dutt Patil', role: 'attendant', dailyWage: 650, daysPresent: 24, advancesTaken: 1200, deductions: 350 },
      { id: 'emp-003', name: 'Anjali Sharma', role: 'manager', dailyWage: 1200, daysPresent: 28, advancesTaken: 0, deductions: 0 },
      { id: 'emp-004', name: 'Karan Bahadur', role: 'security', dailyWage: 550, daysPresent: 26, advancesTaken: 1000, deductions: 0 }
    ];
  }
}
