import { OCRTemplateDefinition } from './TemplateRegistry';

export const HPCLTemplate: OCRTemplateDefinition = {
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
};
