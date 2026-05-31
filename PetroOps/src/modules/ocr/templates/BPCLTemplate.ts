import { OCRTemplateDefinition } from './TemplateRegistry';

export const BPCLTemplate: OCRTemplateDefinition = {
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
};
