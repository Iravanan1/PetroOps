import { GoogleGenAI } from "@google/genai";
import { ShiftExtraction, ShiftExtractionSchema } from "../../src/types/index.js";
import { retryWithBackoff } from "../utils/retry.js";

const geminiApiKey = process.env.GEMINI_API_KEY || "demo-key";
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

export interface ShiftTemplate {
  templateId: string;
  name: string;
  expectedFormat: string;
  roiHints: string[];
  nozzleMapping: Record<string, string>;
}

const DEFAULT_TEMPLATE: ShiftTemplate = {
  templateId: "default",
  name: "Standard Indian Petrol Pump Register",
  expectedFormat: "Table with columns for Nozzle, Opening, Closing, Testing, Sales, and sections for Cash/UPI/Card",
  roiHints: [
    "Top left: Date and Shift label",
    "Middle block: List of meters",
    "Bottom right: Total cash collected and signature"
  ],
  nozzleMapping: {}
};

export class AiService {
  public static async structureData(ocrText: string, activeNozzles: any[], template: ShiftTemplate = DEFAULT_TEMPLATE): Promise<ShiftExtraction> {
    
    const nozzleContext = activeNozzles.map(n => ({
        nozzleId: n.nozzleId,
        fuelType: n.fuelType,
        fuelRate: n.fuelRate,
        mappedAlias: template.nozzleMapping[n.nozzleId] || `Nozzle ${n.fuelType}`
    }));

    const prompt = `
      You are an enterprise accounting AI for an Indian Petrol Pump.
      Map the following OCR text into strict JSON following the provided schema.

      Template Context:
      - Name: ${template.name}
      - Format Expected: ${template.expectedFormat}
      - Regions: ${template.roiHints.join('; ')}
      
      Active Pump Nozzles to map to (use EXACT nozzleId):
      ${JSON.stringify(nozzleContext, null, 2)}

      Rules:
      1. All monetary values are numeric.
      2. Calculate netSales = closingMeter - openingMeter - testingQty.
      3. Do NOT hallucinate data. If a nozzle is missing, omit it.
      4. If fuelRate is missing in OCR, fallback to the rate provided in active nozzles.
      5. Confidence score must reflect OCR anomalies and parsing certainty (0-100).
      6. Parse Credit/Udhari sections:
         - Extract customerName (person/company name), amount (owed or paid), date, paymentStatus ('pending' | 'paid'), notes, confidence, and reviewStatus ('clean' | 'needs_review').
         - Maintain row relationships. Do not mix names with incorrect amounts.
         - If text is tilted, faded, handwritten, or messy, and you are uncertain, do NOT guess silently. Set reviewStatus to 'needs_review' and lower the confidence field for that row.
      
      OCR Text:
      ${ocrText}
    `;

    try {
      if (geminiApiKey === "demo-key") {
        console.log("Gemini API key not provided or demo key active. Yielding high-fidelity structured data in mock mode.");
        const mockData: ShiftExtraction = {
          shiftDate: "2026-05-18",
          shiftLabel: "Day Shift",
          openingCash: 12500,
          actualCash: 48900,
          expenses: 1500,
          upiSales: 18500,
          cardSales: 9000,
          creditSales: 14300,
          creditRecovery: 3200,
          readings: [
            {
              nozzleId: activeNozzles[0]?.nozzleId || "nozzle-1",
              fuelType: activeNozzles[0]?.fuelType || "MS",
              openingMeter: 12450.50,
              closingMeter: 12790.80,
              testingQty: 5.0,
              netSales: 335.30,
              fuelRate: activeNozzles[0]?.fuelRate || 104.50
            },
            {
              nozzleId: activeNozzles[1]?.nozzleId || "nozzle-2",
              fuelType: activeNozzles[1]?.fuelType || "HSD",
              openingMeter: 8520.10,
              closingMeter: 8710.60,
              testingQty: 0.0,
              netSales: 190.50,
              fuelRate: activeNozzles[1]?.fuelRate || 92.30
            }
          ],
          creditEntries: [
            {
              customerName: "Rajasthan Transport",
              amount: 5000,
              date: "2026-05-18",
              shiftId: "shift_demo_987",
              paymentStatus: "pending",
              notes: "Credit sale logged",
              confidence: 96,
              reviewStatus: "clean"
            },
            {
              customerName: "Sharma Ji",
              amount: 2200,
              date: "2026-05-18",
              shiftId: "shift_demo_987",
              paymentStatus: "pending",
              notes: "Partial faded text",
              confidence: 65,
              reviewStatus: "needs_review"
            },
            {
              customerName: "Mahaveer Travels",
              amount: 7100,
              date: "2026-05-18",
              shiftId: "shift_demo_987",
              paymentStatus: "pending",
              notes: "Tilted row",
              confidence: 88,
              reviewStatus: "clean"
            }
          ],
          confidenceScore: 97.5
        };

        const validated = ShiftExtractionSchema.parse(mockData);
        return validated;
      }

      const response = await retryWithBackoff(() => 
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.0,
            responseMimeType: "application/json",
          }
        })
      );

      const responseText = response.text || "{}";
      const parsedJson = JSON.parse(responseText);
      
      // Merge rates if missing
      if (parsedJson && parsedJson.readings) {
        parsedJson.readings = parsedJson.readings.map((reading: any) => {
          const nozzleDef = activeNozzles.find(n => n.nozzleId === reading.nozzleId || n.fuelType === reading.fuelType);
          if (nozzleDef) {
            if (!reading.nozzleId) reading.nozzleId = nozzleDef.nozzleId;
            if (!reading.fuelRate) reading.fuelRate = nozzleDef.fuelRate;
          }
          return reading;
        });
      }
      
      // Strict Zod validation
      const validatedData = ShiftExtractionSchema.parse(parsedJson);
      return validatedData;
    } catch (error: any) {
      console.error("AI Structuring Failed:", error.message, "\nOCR:", ocrText);
      throw new Error(`AI Pipeline Error: ${error.message}`);
    }
  }
}
