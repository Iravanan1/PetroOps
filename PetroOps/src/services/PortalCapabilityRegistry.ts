export interface PortalCapabilities {
  companyId: string;
  portalName: string;
  hasDirectApi: boolean;
  hasSpreadsheetExport: boolean; // CSV/Excel
  hasPdfParsing: boolean;
  hasAuthorizedAutomation: boolean; // login credentials
  supportedImports: ('sales_summary' | 'nozzle_readings' | 'upi_settlements' | 'wetstock' | 'credit_statements')[];
  authInstructions: string;
}

export const PORTAL_CAPABILITIES: Record<string, PortalCapabilities> = {
  HPCL: {
    companyId: 'HPCL',
    portalName: 'HPCL CRIS Portal',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: true,
    hasAuthorizedAutomation: true,
    supportedImports: ['sales_summary', 'nozzle_readings', 'wetstock', 'upi_settlements'],
    authInstructions: 'Enter your CRIS dealer login credentials. HPCL CRIS uses standard username, password, and sends an OTP on your registered mobile number upon login.'
  },
  BPCL: {
    companyId: 'BPCL',
    portalName: 'BPCL Dealer Portal (e-Bharat)',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: true,
    hasAuthorizedAutomation: true,
    supportedImports: ['sales_summary', 'nozzle_readings', 'wetstock'],
    authInstructions: 'Enter your BPCL SmartLine dealer portal username and password. Supports Excel and PDF shift summary report parses.'
  },
  IOCL: {
    companyId: 'IOCL',
    portalName: 'IOCL e-Dealer Portal',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: true,
    hasAuthorizedAutomation: true,
    supportedImports: ['sales_summary', 'nozzle_readings', 'wetstock', 'upi_settlements'],
    authInstructions: 'Use your IOCL IndianOil partner portal ID and password. Supports daily nozzle reconciliation spreadsheet uploads.'
  },
  Nayara: {
    companyId: 'Nayara',
    portalName: 'Nayara Dealer Connect',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: false,
    hasAuthorizedAutomation: false,
    supportedImports: ['sales_summary', 'wetstock'],
    authInstructions: 'Nayara Energy requires upload of CSV daily dispatch and stock registers. Direct credential automation is currently disabled by Nayara.'
  },
  'Jio-bp': {
    companyId: 'Jio-bp',
    portalName: 'Jio-bp Partner Portal',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: true,
    hasAuthorizedAutomation: true,
    supportedImports: ['sales_summary', 'nozzle_readings', 'wetstock', 'upi_settlements'],
    authInstructions: 'Use Jio-bp SmartDealer account credentials. Supports automated settlement mapping imports.'
  },
  Shell: {
    companyId: 'Shell',
    portalName: 'Shell Retail Portal',
    hasDirectApi: true, // Suppose Shell has a developer sandbox API
    hasSpreadsheetExport: true,
    hasPdfParsing: true,
    hasAuthorizedAutomation: true,
    supportedImports: ['sales_summary', 'nozzle_readings', 'wetstock', 'credit_statements'],
    authInstructions: 'Supports direct API sync using Shell Retailer API client keys, or manual CSV monthly reports.'
  },
  Other: {
    companyId: 'Other',
    portalName: 'Custom Portal Export',
    hasDirectApi: false,
    hasSpreadsheetExport: true,
    hasPdfParsing: false,
    hasAuthorizedAutomation: false,
    supportedImports: ['sales_summary', 'nozzle_readings'],
    authInstructions: 'Configure custom CSV templates. Allows importing nozzle counts in generic formats.'
  }
};

export class PortalCapabilityRegistry {
  static getCapabilities(companyId: string): PortalCapabilities {
    return PORTAL_CAPABILITIES[companyId] || PORTAL_CAPABILITIES.Other;
  }

  static getSupportedImports(companyId: string): string[] {
    return this.getCapabilities(companyId).supportedImports;
  }
}
