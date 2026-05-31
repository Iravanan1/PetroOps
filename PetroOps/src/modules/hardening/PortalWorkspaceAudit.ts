/**
 * PortalWorkspaceAudit.ts
 * 
 * Programmatic validator auditing the AI-Assisted Dealer Portal Workspace.
 * Verifies visual DOM extractions, credential isolation, and 4-source reconciliation consistency.
 */

import { PortalWorkspaceVerification } from '../portal/services/PortalWorkspaceVerification';

export interface PortalCheck {
  id: string;
  name: string;
  category: 'BROWSER' | 'PRIVACY' | 'RECONCILIATION';
  passed: boolean;
  message: string;
}

export interface PortalAuditResult {
  checks: PortalCheck[];
  reports: {
    extraction: string;
    privacy: string;
    reconciliation: string;
  };
}

export class PortalWorkspaceAudit {
  public static runPortalAudit(): PortalAuditResult {
    const checks: PortalCheck[] = [];

    // Run the existing verification suite to leverage stable, verified logic
    const baseSuite = PortalWorkspaceVerification.runPortalValidationSuite();

    // Map base suite results into audit checklist
    baseSuite.checks.forEach(c => {
      let mappedCat: PortalCheck['category'] = 'BROWSER';
      if (c.category === 'SECURITY') mappedCat = 'PRIVACY';
      else if (c.category === 'RECONCILIATION') mappedCat = 'RECONCILIATION';
      
      checks.push({
        id: c.id,
        name: c.name,
        category: mappedCat,
        passed: c.passed,
        message: c.message
      });
    });

    const reports = {
      extraction: baseSuite.reports.extraction,
      privacy: baseSuite.reports.security,
      reconciliation: baseSuite.reports.reconciliation
    };

    return {
      checks,
      reports
    };
  }
}
