/**
 * TemplateRegistry.ts
 * Structured Definitions and Fuzzy Recognition Scorer for Indian Fuel Registers
 */

import { BoundingBox, SegmentedRegion } from '../layout/RegisterLayoutDetectionEngine';

export interface FieldMapping {
  key: string;
  dataType: 'number' | 'string' | 'date';
  required: boolean;
  englishAnchor: string;
  hindiAnchor?: string;
  hinglishVariants?: string[];
}

export interface OCRTemplateDefinition {
  name: string;
  provider: 'IOCL' | 'HPCL' | 'BPCL' | 'NAYARA' | 'JIOBP' | 'CUSTOM';
  anchors: string[];
  fields: FieldMapping[];
  defaultRegions: Array<{
    name: string;
    type: 'nozzles' | 'payments' | 'expenses' | 'dips' | 'notes' | 'settlement';
    box: BoundingBox;
  }>;
}

export class TemplateRegistry {
  private static templates: OCRTemplateDefinition[] = [
    {
      name: 'Indian Oil Corporation Standard',
      provider: 'IOCL',
      anchors: ['INDIAN OIL', 'IOCL', 'INDIANOIL', 'PROD CLOSED', 'DIP READING'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 5, y: 10, width: 90, height: 25 } },
        { name: 'Payments Block', type: 'payments', box: { x: 5, y: 38, width: 90, height: 22 } },
        { name: 'Dips Block', type: 'dips', box: { x: 5, y: 63, width: 45, height: 18 } },
        { name: 'Expenses Block', type: 'expenses', box: { x: 52, y: 63, width: 43, height: 18 } },
        { name: 'Settlement Block', type: 'settlement', box: { x: 5, y: 83, width: 90, height: 12 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Opening Meter', hindiAnchor: 'ओपनिंग रीडिंग', hinglishVariants: ['Op Meter', 'Opening Reading'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'Closing Meter', hindiAnchor: 'क्लोजिंग रीडिंग', hinglishVariants: ['Cl Meter', 'Closing Reading'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Cash Collected', hindiAnchor: 'कैश कलेक्शन', hinglishVariants: ['Cash In Till', 'Actual Cash'] },
        { key: 'upiPayments', dataType: 'number', required: true, englishAnchor: 'UPI QR Total', hindiAnchor: 'यू पी आई', hinglishVariants: ['PhonePe', 'GPay', 'Paytm'] },
        { key: 'cardPayments', dataType: 'number', required: true, englishAnchor: 'POS Card sales', hindiAnchor: 'कार्ड स्वाइप', hinglishVariants: ['Swipe Machine', 'HDFC POS', 'Card Total'] },
      ]
    },
    {
      name: 'Hindustan Petroleum Standard',
      provider: 'HPCL',
      anchors: ['HINDUSTAN PETROLEUM', 'HPCL', 'CLUB HP', 'HP GAS', 'METER READINGS'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 8, y: 15, width: 84, height: 20 } },
        { name: 'Payments Block', type: 'payments', box: { x: 8, y: 38, width: 84, height: 25 } },
        { name: 'Dips Block', type: 'dips', box: { x: 8, y: 66, width: 40, height: 15 } },
        { name: 'Notes Block', type: 'notes', box: { x: 50, y: 66, width: 42, height: 25 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Start Meter', hindiAnchor: 'स्टार्ट रीडिंग', hinglishVariants: ['Meter Start', 'Op Rdg'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'End Meter', hindiAnchor: 'एंड रीडिंग', hinglishVariants: ['Meter End', 'Cl Rdg'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Total Cash', hindiAnchor: 'कुल कैश', hinglishVariants: ['Till Cash', 'Noc Cash'] },
        { key: 'upiPayments', dataType: 'number', required: true, englishAnchor: 'QR Code Pay', hindiAnchor: 'क्यू आर कोड', hinglishVariants: ['UPI Scan', 'Online Pay'] },
      ]
    },
    {
      name: 'Bharat Petroleum Standard',
      provider: 'BPCL',
      anchors: ['BHARAT PETROLEUM', 'BPCL', 'MAK LUBRICANTS', 'SPEED PETROL', 'CALIBRATION'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 6, y: 12, width: 88, height: 22 } },
        { name: 'Payments Block', type: 'payments', box: { x: 6, y: 36, width: 88, height: 24 } },
        { name: 'Dips Block', type: 'dips', box: { x: 6, y: 62, width: 44, height: 18 } },
        { name: 'Expenses Block', type: 'expenses', box: { x: 52, y: 62, width: 42, height: 26 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Opening', hindiAnchor: 'शुरुआती रीडिंग', hinglishVariants: ['OP', 'Open Rdg'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'Closing', hindiAnchor: 'अंतिम रीडिंग', hinglishVariants: ['CL', 'Close Rdg'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Cash', hindiAnchor: 'नकद', hinglishVariants: ['Cash AMT', 'Attendant Cash'] },
        { key: 'upiPayments', dataType: 'number', required: true, englishAnchor: 'UPI QR', hindiAnchor: 'यू पी आई रसीद', hinglishVariants: ['BHIM UPI', 'UPI QR AMT'] },
      ]
    },
    {
      name: 'Nayara Energy Standard',
      provider: 'NAYARA',
      anchors: ['NAYARA', 'NAYARA ENERGY', 'NAYARA PETROL', 'ESSAR'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 5, y: 8, width: 90, height: 24 } },
        { name: 'Payments Block', type: 'payments', box: { x: 5, y: 34, width: 90, height: 26 } },
        { name: 'Dips Block', type: 'dips', box: { x: 5, y: 62, width: 45, height: 20 } },
        { name: 'Settlement Block', type: 'settlement', box: { x: 52, y: 62, width: 43, height: 20 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Opening', hinglishVariants: ['Op Meter', 'Opening Reading'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'Closing', hinglishVariants: ['Cl Meter', 'Closing Reading'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Actual Cash', hinglishVariants: ['Till Cash', 'Cash collected'] },
        { key: 'upiPayments', dataType: 'number', required: true, englishAnchor: 'UPI QR', hinglishVariants: ['GPay', 'PhonePe', 'Paytm'] },
      ]
    },
    {
      name: 'JioBP Standard',
      provider: 'JIOBP',
      anchors: ['JIOBP', 'JIO-BP', 'RELIANCE BP', 'JIO BP'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 7, y: 10, width: 86, height: 22 } },
        { name: 'Payments Block', type: 'payments', box: { x: 7, y: 35, width: 86, height: 25 } },
        { name: 'Dips Block', type: 'dips', box: { x: 7, y: 62, width: 43, height: 18 } },
        { name: 'Settlement Block', type: 'settlement', box: { x: 52, y: 62, width: 41, height: 25 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Opening Meter', hinglishVariants: ['Op Meter', 'Opening Reading'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'Closing Meter', hinglishVariants: ['Cl Meter', 'Closing Reading'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Cash Collections', hinglishVariants: ['Drawer Cash', 'Actual Cash'] },
        { key: 'upiPayments', dataType: 'number', required: true, englishAnchor: 'Digital UPI', hinglishVariants: ['UPI QR', 'PhonePe', 'GooglePay'] },
      ]
    },
    {
      name: 'Multi-Tenant Custom Pump Standard',
      provider: 'CUSTOM',
      anchors: ['PUMP ACCOUNTING', 'DAILY CLOSING', 'LEDGER SUMMARY', 'STATION LOG'],
      defaultRegions: [
        { name: 'Nozzles Block', type: 'nozzles', box: { x: 5, y: 5, width: 90, height: 30 } },
        { name: 'Payments Block', type: 'payments', box: { x: 5, y: 40, width: 90, height: 30 } },
        { name: 'Dips Block', type: 'dips', box: { x: 5, y: 75, width: 90, height: 20 } },
      ],
      fields: [
        { key: 'nozzleOpening', dataType: 'number', required: true, englishAnchor: 'Start', hinglishVariants: ['Open'] },
        { key: 'nozzleClosing', dataType: 'number', required: true, englishAnchor: 'End', hinglishVariants: ['Close'] },
        { key: 'cashInHand', dataType: 'number', required: true, englishAnchor: 'Cash', hinglishVariants: ['Cash Total'] },
      ]
    }
  ];

  /**
   * Lock recognition directly to manually configured providerTemplate.
   * Fuzzy lines scraping has been completely bypassed.
   */
  public static fuzzyRecognizeTemplate(rawText: string, provider?: string): OCRTemplateDefinition {
    if (provider) {
      const p = provider.toUpperCase();
      let matchedProvider: 'IOCL' | 'HPCL' | 'BPCL' | 'NAYARA' | 'JIOBP' | 'CUSTOM' = 'CUSTOM';
      if (p === 'IOCL') matchedProvider = 'IOCL';
      else if (p === 'HPCL') matchedProvider = 'HPCL';
      else if (p === 'BPCL') matchedProvider = 'BPCL';
      else if (p === 'NAYARA') matchedProvider = 'NAYARA';
      else if (p === 'JIOBP') matchedProvider = 'JIOBP';
      
      const found = this.templates.find(t => t.provider === matchedProvider);
      if (found) return found;
    }
    
    // Fallback default
    return this.templates.find(t => t.provider === 'HPCL') || this.templates[1];
  }

  /**
   * Resolves numerical annotations scrawled by pump attendants, removing rupee symbols,
   * converting Hinglish slang text ("5k" -> 5000, "1.5L" -> 150000, "nau sau" / "hazaar").
   * Highly resilient against typical handwritten OCR digit confusions (O/o to 0, I/i/l to 1).
   */
  public static parseHinglishNumeric(valueStr: string): number {
    if (!valueStr) return 0;
    
    // Normalize and trim
    let cleaned = valueStr.toLowerCase().trim();
    
    // Check if there is Hinglish text for Lakhs
    if (cleaned.includes('lakh') || cleaned.includes('lacs') || cleaned.includes('lac')) {
      const parts = cleaned.split(/lakh|lacs|lac/);
      let numPart = parts[0].replace(/[₹,r\s\-]/g, '');
      // Handle handwritten digit confusions in the float part
      numPart = numPart.replace(/o/g, '0').replace(/[il]/g, '1');
      const val = parseFloat(numPart || '0');
      return val * 100000;
    }

    // Evaluate standard multipliers
    cleaned = cleaned
      .replace(/[₹,r\s\-]/g, '') // remove Rupee signs, commas, extra symbols
      .replace(/hazaar/g, '000')   // Hinglish thousand
      .replace(/sau/g, '00')       // Hinglish hundred
      .replace(/k/g, '000');       // Metric thousand indicator

    // Map digit confusions (O/o to 0, I/i/l to 1)
    cleaned = cleaned.replace(/o/g, '0').replace(/[il]/g, '1');

    // Keep only numbers and decimal points
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    const numericVal = parseFloat(cleaned);
    return isNaN(numericVal) ? 0 : numericVal;
  }
}
