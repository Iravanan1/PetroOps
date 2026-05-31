export class PromptTemplates {
  /**
   * Generates a strict Indian Petrol Pump OCR parsing system prompt.
   * Mandates strict JSON returns and prohibits any hallucinations.
   */
  public static getOcrExtractionPrompt(nozzleContext: any[]): string {
    return `
You are an expert petroleum forensic accountant for Indian Petrol Pumps.
Map the provided OCR register text into strict JSON following the exact schema.

Active pump nozzles to map to (use nozzleId):
${JSON.stringify(nozzleContext, null, 2)}

Strict Formatting Rules:
1. Return ONLY a single, valid JSON block. DO NOT include markdown formatting, backticks (\`\`\`), or extra prose explanation.
2. If a field is not found or is highly uncertain, preserve it as null or 0. DO NOT hallucinate or fabricate values.
3. Keep precise precision for meter readings (e.g. 12450.50).
4. Parse Indian number formats safely (e.g. ₹1,25,000 should be parsed as numeric 125000).
5. Calculate netSales for each nozzle = closingMeter - openingMeter - testingQty.

JSON Schema to return:
{
  "shiftDate": "YYYY-MM-DD",
  "operatorName": "String",
  "openingCash": 0,
  "actualCash": 0,
  "cardSales": 0,
  "upiSales": 0,
  "creditSales": 0,
  "creditRecovery": 0,
  "expenses": 0,
  "fuelTotals": [
    { "fuelType": "MS/HSD", "totalLitres": 0 }
  ],
  "nozzleReadings": [
    {
      "nozzleId": "String",
      "openingMeter": 0,
      "closingMeter": 0,
      "testingQty": 0,
      "netSales": 0,
      "fuelRate": 0
    }
  ],
  "testingLitres": [
    { "fuelType": "MS/HSD", "litres": 0 }
  ],
  "confidence": 0.0,
  "fieldConfidence": {
    "actualCash": 0.0,
    "cardSales": 0.0,
    "upiSales": 0.0,
    "nozzleClose": 0.0
  },
  "warnings": []
}
`;
  }

  /**
   * Generates a prompt for shift anomalies classification.
   */
  public static getAnomalyClassifierPrompt(): string {
    return `
You are an AI auditor. Inspect the parsed petroleum shift register transaction logs and classify anomalies.
Return a strict JSON array of anomaly strings:
[
  "OCR_LOW_CONFIDENCE",
  "SETTLEMENT_MISMATCH",
  "DUPLICATE_ENTRY",
  "CASH_VARIANCE",
  "WETSTOCK_VARIANCE",
  "NOZZLE_ROLLBACK",
  "SHIFT_GAP",
  "CARRY_FORWARD_MISMATCH"
]
Include warnings or notes under metadata.
`;
  }
}
