/**
 * ApprovalWorkflowEngine.ts
 * ─────────────────────────
 * Manages authorization logs, approval/rejection workflows, and escalation comments.
 */

export interface SecurityApprovalRequest {
  id: string;
  timestamp: string;
  requestor: string;
  action: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver?: string;
  approverComments?: string;
}

export class ApprovalWorkflowEngine {
  private static readonly STORAGE_KEY = 'pumpai_security_approvals';

  /**
   * Loads active approvals queue list
   */
  public static getApprovals(): SecurityApprovalRequest[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Seed default pending approvals on first load
      const defaultApprovals: SecurityApprovalRequest[] = [
        { id: 'app-001', timestamp: '2026-05-23 09:12', requestor: 'Manager Anjali', action: 'PORTAL_CREDENTIAL_CHANGE', justification: 'HPCL connection password rotated on weekly guidelines compliance.', status: 'PENDING' },
        { id: 'app-002', timestamp: '2026-05-23 09:40', requestor: 'Accountant Ramesh', action: 'SHIFT_REOPEN', justification: 'Reopening shift-101 period nozzle balance accounts to correct UPI card variance gap.', status: 'PENDING' }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultApprovals));
      return defaultApprovals;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Submits a fresh authorization request
   */
  public static submitRequest(
    requestor: string,
    action: string,
    justification: string
  ): SecurityApprovalRequest {
    const list = this.getApprovals();
    const newReq: SecurityApprovalRequest = {
      id: `app-${Date.now().toString().slice(-3)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      requestor,
      action,
      justification,
      status: 'PENDING'
    };

    list.push(newReq);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    return newReq;
  }

  /**
   * Approves or rejects a request with supervisor logs comment
   */
  public static processRequest(
    id: string,
    approver: string,
    status: 'APPROVED' | 'REJECTED',
    comments: string
  ): void {
    const list = this.getApprovals();
    const updated = list.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status,
          approver,
          approverComments: comments
        };
      }
      return item;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }
}
