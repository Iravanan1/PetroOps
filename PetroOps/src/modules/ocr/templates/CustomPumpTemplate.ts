import { OCRTemplateDefinition } from './TemplateRegistry';

export const CustomPumpTemplate: OCRTemplateDefinition = {
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
};
