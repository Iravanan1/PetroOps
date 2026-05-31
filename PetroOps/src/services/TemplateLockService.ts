export interface CompanyTemplateConfig {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  ocrFields: string[];
  nozzleLayout: string;
  portalUrl: string;
  portalName: string;
}

export const COMPANY_TEMPLATES: Record<string, CompanyTemplateConfig> = {
  HPCL: {
    id: 'HPCL',
    name: 'Hindustan Petroleum Corporation Limited',
    shortName: 'HPCL',
    primaryColor: '#094E96',
    ocrFields: ['Nozzle Reading', 'Sales (Ltr)', 'Rate', 'Amount', 'Testing (Ltr)', 'Net Sales'],
    nozzleLayout: 'HPCL-Standard-Nozzle-Grid',
    portalUrl: 'https://cris.hpcl.co.in/',
    portalName: 'HPCL CRIS Portal'
  },
  BPCL: {
    id: 'BPCL',
    name: 'Bharat Petroleum Corporation Limited',
    shortName: 'BPCL',
    primaryColor: '#00703C',
    ocrFields: ['Opening Meter', 'Closing Meter', 'Total Sales', 'Testing', 'Net Volume', 'Rate', 'Value'],
    nozzleLayout: 'BPCL-Classic-Dispenser-Matrix',
    portalUrl: 'https://partner.ebharatpetroleum.in/',
    portalName: 'BPCL Dealer Portal'
  },
  IOCL: {
    id: 'IOCL',
    name: 'Indian Oil Corporation Limited',
    shortName: 'IOCL',
    primaryColor: '#FF6600',
    ocrFields: ['Meter Reading Start', 'Meter Reading End', 'Gross Quantity', 'Net Quantity', 'Sales Value'],
    nozzleLayout: 'IOCL-Double-Nozzle-Stationary',
    portalUrl: 'https://partner.indianoil.in/',
    portalName: 'IOCL e-Dealer Portal'
  },
  Nayara: {
    id: 'Nayara',
    name: 'Nayara Energy',
    shortName: 'Nayara',
    primaryColor: '#E67E22',
    ocrFields: ['Nozzle ID', 'Opening Read', 'Closing Read', 'Throughput', 'Lube Sales', 'Value'],
    nozzleLayout: 'Nayara-Modern-Dispenser-Grid',
    portalUrl: 'https://dealer.nayaraenergy.com/',
    portalName: 'Nayara Dealer Connect'
  },
  'Jio-bp': {
    id: 'Jio-bp',
    name: 'Jio-bp Venture',
    shortName: 'Jio-bp',
    primaryColor: '#002F6C',
    ocrFields: ['Dispenser Number', 'Nozzle Read Start', 'Nozzle Read End', 'Litres Sold', 'Amount Rs'],
    nozzleLayout: 'JioBP-HighFlow-Layout',
    portalUrl: 'https://dealer.jiobp.com/',
    portalName: 'Jio-bp Partner Portal'
  },
  Shell: {
    id: 'Shell',
    name: 'Shell India',
    shortName: 'Shell',
    primaryColor: '#FFD500',
    ocrFields: ['Nozzle Ref', 'Start Reading', 'End Reading', 'Net Litres', 'Price', 'Gross Sales'],
    nozzleLayout: 'Shell-Global-Retail-Layout',
    portalUrl: 'https://shell.custhelp.com/',
    portalName: 'Shell Retail Portal'
  },
  Other: {
    id: 'Other',
    name: 'Independent / Other',
    shortName: 'Independent',
    primaryColor: '#555555',
    ocrFields: ['Nozzle Name', 'Start Meter', 'End Meter', 'Volume', 'Rate', 'Total'],
    nozzleLayout: 'Custom-Grid-Mappers',
    portalUrl: '',
    portalName: 'Custom Portal Export'
  }
};

export class TemplateLockService {
  /**
   * Retrieves the locked company configuration for the active user's station
   */
  static getTemplateConfig(companyType: string | null | undefined): CompanyTemplateConfig {
    const key = companyType && COMPANY_TEMPLATES[companyType] ? companyType : 'HPCL';
    return COMPANY_TEMPLATES[key];
  }

  /**
   * Validates if the scanned OCR layout matches the station's permanent template authority.
   * If a mismatch is detected, triggers a detailed mismatch report rather than silently overriding.
   */
  static checkTemplateAlignment(stationTemplate: string, detectedTemplate?: string): {
    aligned: boolean;
    confidenceScore: number;
    message: string;
  } {
    if (!detectedTemplate) {
      return {
        aligned: true,
        confidenceScore: 1.0,
        message: `Using locked template authority (${stationTemplate}). Auto-detection skipped.`
      };
    }

    if (stationTemplate.toUpperCase() === detectedTemplate.toUpperCase()) {
      return {
        aligned: true,
        confidenceScore: 0.98,
        message: `OCR matches station's locked template authority (${stationTemplate}).`
      };
    }

    return {
      aligned: false,
      confidenceScore: 0.20,
      message: `CRITICAL: OCR page appears to match ${detectedTemplate} layout, but the station is locked to ${stationTemplate}. Manual correction review required.`
    };
  }
}
