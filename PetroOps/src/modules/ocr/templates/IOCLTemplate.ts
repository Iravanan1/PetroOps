import { OCRTemplateDefinition } from './TemplateRegistry';

export const IOCLTemplate: OCRTemplateDefinition = {
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
};
