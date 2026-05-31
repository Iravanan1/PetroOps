/**
 * PetroOps Petroleum Operational Ontology and Mapping Layer
 * Standardizes domain terminology, shorthand keywords, and operational concepts.
 */

export type DocumentCategory =
  | 'NOZZLE_READINGS'
  | 'DIP_SHEET'
  | 'TESTING_EXPENSES'
  | 'RECONCILIATION'
  | 'WETSTOCK'
  | 'SHIFT_CLOSING';

export interface OntologyConcept {
  term: string;
  synonyms: string[];
  definition: string;
  standardDbField: string;
}

export const PETROLEUM_ONTOLOGY: Record<string, OntologyConcept> = {
  MS: {
    term: "Motor Spirit (Petrol)",
    synonyms: ["ms", "petrol", "speed", "speed97", "power"],
    definition: "Light distillate fuel used for passenger cars and motorbikes.",
    standardDbField: "fuelType_MS"
  },
  HSD: {
    term: "High Speed Diesel",
    synonyms: ["hsd", "diesel", "disel", "super diesel"],
    definition: "Heavy distillate fuel used for transport trucks, tractors, and heavy machinery.",
    standardDbField: "fuelType_HSD"
  },
  NOZZLE: {
    term: "Dispenser Nozzle",
    synonyms: ["nozzle", "noz", "n1", "n2", "dispenser", "meter"],
    definition: "The physical dispenser point mapped to a totalizer register reading.",
    standardDbField: "nozzleId"
  },
  TESTING: {
    term: "Dispenser Calibration Quantity",
    synonyms: ["testing", "test", "calib", "dt", "decanted"],
    definition: "Drawn fuel volume (5L/10L) used to verify pump calibration, which is returned back to underground tanks.",
    standardDbField: "testingQty"
  },
  DIP: {
    term: "Underground Tank Dip",
    synonyms: ["dip", "reading dip", "tank dip", "mm dip"],
    definition: "Height of fuel in millimeters in the underground tank, measured by manual dipstick or automatic tank gauge.",
    standardDbField: "tankDip"
  },
  WETSTOCK: {
    term: "Wetstock Asset Management",
    synonyms: ["wetstock", "density", "water dip", "tank volume"],
    definition: "Tracking actual liquid stock versus book-expected stock to detect leakages or temperature evaporation.",
    standardDbField: "wetstockReconciliation"
  },
  SHIFT: {
    term: "Operational Shift",
    synonyms: ["shift", "day", "night", "morning", "evening"],
    definition: "The primary chronological operational boundary (typically 12 hours) in forecourt record-keeping.",
    standardDbField: "shiftLabel"
  },
  VARIANCE: {
    term: "Bookkeeping Mismatch",
    synonyms: ["variance", "mismatch", "shortage", "surplus", "diff", "loss"],
    definition: "The numeric difference between recorded sales totals and actual cash box / dispenser totals.",
    standardDbField: "cashShortage"
  },
  EXPENSE: {
    term: "Drawer Cash Payout",
    synonyms: ["expense", "expenses", "kharcha", "exp", "outflow", "paid out"],
    definition: "Direct cash expenditures paid out of the shift drawer for operational purchases.",
    standardDbField: "expenses"
  },
  RECONCILIATION: {
    term: "Audit Reconciliation",
    synonyms: ["reconciliation", "audit", "cross-verify", "ground truth check"],
    definition: "The mathematical verification cross-referencing paper shift registries with dispenser transaction reports.",
    standardDbField: "transactionReconciliation"
  }
};

export class OntologyMapper {
  /**
   * Automatically classifies scanned document register pages based on ontology keyword weights.
   */
  public static classifyDocument(ocrText: string): DocumentCategory {
    const text = ocrText.toLowerCase();
    
    // Weight calculation
    let dipWeight = (text.match(/dip/g) || []).length * 3 + (text.match(/water/g) || []).length;
    let wetstockWeight = (text.match(/wetstock/g) || []).length * 3 + (text.match(/density/g) || []).length * 2 + (text.match(/evap/g) || []).length;
    let reconWeight = (text.match(/reconcil/g) || []).length * 3 + (text.match(/variance/g) || []).length * 2 + (text.match(/mismatch/g) || []).length;
    let testingWeight = (text.match(/dt/g) || []).length * 3 + (text.match(/calib/g) || []).length * 2 + (text.match(/testing/g) || []).length;
    let closingWeight = (text.match(/closing/g) || []).length * 2 + (text.match(/actual cash/g) || []).length * 2 + (text.match(/kharcha/g) || []).length;
    
    const maxWeight = Math.max(dipWeight, wetstockWeight, reconWeight, testingWeight, closingWeight);
    
    if (maxWeight === 0) return 'NOZZLE_READINGS';
    if (maxWeight === dipWeight) return 'DIP_SHEET';
    if (maxWeight === wetstockWeight) return 'WETSTOCK';
    if (maxWeight === reconWeight) return 'RECONCILIATION';
    if (maxWeight === testingWeight) return 'TESTING_EXPENSES';
    if (maxWeight === closingWeight) return 'SHIFT_CLOSING';
    
    return 'NOZZLE_READINGS';
  }

  /**
   * Resolves raw handwritten or colloquial OCR abbreviations into standardized system fields.
   */
  public static normalizeKey(rawKey: string): string {
    const clean = rawKey.toLowerCase().trim();
    
    for (const [conceptKey, concept] of Object.entries(PETROLEUM_ONTOLOGY)) {
      if (concept.synonyms.includes(clean)) {
        return conceptKey;
      }
    }
    
    // Standard cash book aliases
    const cashAliases: Record<string, string> = {
      "op": "openingCash",
      "open": "openingCash",
      "cl": "actualCash",
      "act": "actualCash",
      "cash": "actualCash",
      "collected": "actualCash",
      "kharcha": "expenses",
      "exp": "expenses",
      "office": "expenses",
      "dt": "testingQty",
      "test": "testingQty",
      "calib": "testingQty",
      "udhari": "creditSales",
      "credit": "creditSales",
      "recovery": "creditRecovery",
      "rec": "creditRecovery"
    };
    
    return cashAliases[clean] || rawKey;
  }
}
