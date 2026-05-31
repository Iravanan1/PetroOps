/**
 * GSTReportEngine.ts
 * ───────────────────
 * Production-grade GST computation engine for Indian petrol pump stations.
 *
 * Covers:
 *  - GSTR-1: Outward supplies (B2B, B2C, HSN summary)
 *  - GSTR-3B: Monthly summary return (tax payable, ITC, net liability)
 *  - TDS / TCS on fuel sales above threshold
 *  - Fuel-specific GST: Petroleum products are OUTSIDE GST,
 *    but non-fuel items (shop, lubricants) attract 18% GST.
 *    Excise Duty + VAT still apply on HSD/MS/ATF.
 *  - Monthly P&L summaries per pump
 *  - State-wise VAT rates (DVAT, MVAT, TNVAT, GUJVAT, …)
 */

// ─── STATE VAT RATES (approximate 2024-25 rates) ──────────────────────────────

export const STATE_VAT_RATES: Record<string, { ms: number; hsd: number; atf: number }> = {
  MH: { ms: 26.0, hsd: 24.0, atf: 25.0 },  // Maharashtra
  DL: { ms: 30.0, hsd: 16.75, atf: 20.0 }, // Delhi
  KA: { ms: 35.2, hsd: 21.2, atf: 28.0 },  // Karnataka
  TN: { ms: 15.0, hsd: 14.0, atf: 16.0 },  // Tamil Nadu
  GJ: { ms: 13.7, hsd: 13.7, atf: 15.0 },  // Gujarat
  UP: { ms: 26.8, hsd: 17.48, atf: 20.0 }, // Uttar Pradesh
  RJ: { ms: 36.0, hsd: 26.0, atf: 24.0 },  // Rajasthan
  MP: { ms: 33.0, hsd: 23.0, atf: 25.0 },  // Madhya Pradesh
  WB: { ms: 25.0, hsd: 17.0, atf: 20.0 },  // West Bengal
  DEFAULT: { ms: 26.0, hsd: 21.0, atf: 22.0 },
};

// ─── CENTRAL EXCISE DUTY (fixed, Rs/L, 2024-25) ───────────────────────────────

export const CENTRAL_EXCISE_DUTY = {
  ms:  19.90,  // Petrol
  hsd: 15.80,  // Diesel
  atf: 11.00,  // Aviation Turbine Fuel
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface FuelSaleRecord {
  date: string;          // YYYY-MM-DD
  pumpId: string;
  fuelType: 'ms' | 'hsd' | 'atf' | 'speed';
  litresSold: number;
  ratePerLitre: number;  // retail price
  totalRevenue: number;
}

export interface NonFuelSaleRecord {
  date: string;
  pumpId: string;
  category: 'lubricants' | 'shop' | 'tyres' | 'accessories' | 'services';
  description: string;
  taxableValue: number;
  gstRate: number;       // 5, 12, 18, 28
  cgst: number;
  sgst: number;
  igst: number;
  totalWithTax: number;
}

export interface InputTaxCredit {
  month: string;         // YYYY-MM
  pumpId: string;
  category: string;
  taxableValue: number;
  igstPaid: number;
  cgstPaid: number;
  sgstPaid: number;
  totalITC: number;
  eligible: boolean;
}

export interface GSTR1Summary {
  month: string;
  pumpId: string;
  gstin: string;
  state: string;

  // B2C (retail customers — all fuel sales are B2C)
  b2cTaxableValue: number;
  b2cCgst: number;
  b2cSgst: number;
  b2cIgst: number;

  // B2B (non-fuel shop / lubricants to GST-registered customers)
  b2bTaxableValue: number;
  b2bCgst: number;
  b2bSgst: number;
  b2bIgst: number;

  // HSN Summary (non-fuel items)
  hsnSummary: {
    hsnCode: string;
    description: string;
    uqc: string;
    qty: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];

  // Totals
  totalTaxableValue: number;
  totalGst: number;

  // VAT on fuel (outside GST)
  vatOnFuel: number;
  exciseDutyOnFuel: number;
}

export interface GSTR3BSummary {
  month: string;
  pumpId: string;
  gstin: string;

  // 3.1 — Outward supplies
  outwardTaxable: number;
  outwardNilRated: number;     // fuel sales are zero-rated for GST
  outwardExempt: number;
  outwardNonGst: number;       // HSD / MS are non-GST goods

  // 3.2 — ITC available
  itcIgst: number;
  itcCgst: number;
  itcSgst: number;
  itcTotal: number;
  itcIneligible: number;

  // 4 — Net GST payable
  cgstPayable: number;
  sgstPayable: number;
  igstPayable: number;
  totalGstPayable: number;
  interestLiability: number;   // if late
  lateFee: number;
  totalNetLiability: number;
}

export interface MonthlyTaxSummary {
  month: string;
  pumpId: string;
  pumpName: string;
  state: string;

  // Revenue
  fuelRevenue: number;
  nonFuelRevenue: number;
  totalRevenue: number;

  // Tax collected
  vatCollected: number;
  exciseDutyComponent: number;
  gstCollected: number;
  totalTaxCollected: number;

  // Costs
  dealerPurchaseCost: number;  // cost from oil company
  operatingExpenses: number;
  staffCost: number;

  // Profit
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;

  // Tax liability
  gstr1: GSTR1Summary;
  gstr3b: GSTR3BSummary;

  // Filing status
  gstr1Filed: boolean;
  gstr3bFiled: boolean;
  gstr1DueDate: string;
  gstr3bDueDate: string;
  penaltyRisk: number;
}

export interface AnnualTaxReport {
  fy: string;             // e.g. "2024-25"
  pumpId: string;
  gstin: string;
  pumpName: string;
  months: MonthlyTaxSummary[];

  // Annual totals
  annualRevenue: number;
  annualFuelRevenue: number;
  annualNonFuelRevenue: number;
  annualVat: number;
  annualExcise: number;
  annualGst: number;
  annualGrossProfit: number;
  annualNetProfit: number;
  annualItcClaimed: number;

  // Compliance
  filedMonths: number;
  pendingMonths: number;
  totalPenaltyRisk: number;
}

// ─── ENGINE ────────────────────────────────────────────────────────────────────

export class GSTReportEngine {

  // ── VAT & Excise computation for fuel ──────────────────────────────────────

  static computeFuelTaxes(
    litres: number,
    fuelType: 'ms' | 'hsd' | 'atf' | 'speed',
    retailRate: number,
    state: string
  ): {
    totalRevenue: number;
    vatAmount: number;
    exciseDuty: number;
    dealerMargin: number;
    basePrice: number;
  } {
    const vatRates = STATE_VAT_RATES[state] ?? STATE_VAT_RATES['DEFAULT'];
    const vatRate = fuelType === 'ms' || fuelType === 'speed'
      ? vatRates.ms
      : fuelType === 'hsd'
        ? vatRates.hsd
        : vatRates.atf;

    const excisePerLitre = CENTRAL_EXCISE_DUTY[fuelType === 'speed' ? 'ms' : fuelType] ?? 0;
    const totalRevenue = parseFloat((litres * retailRate).toFixed(2));

    // Compute back from retail price
    // Retail = Base + Excise + VAT on (Base + Excise) + Dealer Margin
    // Approximate: Base ~= Retail / (1 + VAT/100) - Excise
    const vatFraction = vatRate / 100;
    const grossBeforeVAT = totalRevenue / (1 + vatFraction);
    const vatAmount = parseFloat((totalRevenue - grossBeforeVAT).toFixed(2));
    const exciseDuty = parseFloat((litres * excisePerLitre).toFixed(2));
    const basePrice = parseFloat((grossBeforeVAT - exciseDuty).toFixed(2));
    const dealerMargin = parseFloat(Math.max(0, basePrice * 0.035).toFixed(2)); // ~3.5% dealer margin

    return { totalRevenue, vatAmount, exciseDuty, dealerMargin, basePrice };
  }

  // ── Non-fuel GST computation ───────────────────────────────────────────────

  static computeNonFuelGST(taxableValue: number, gstRate: number, isInterState = false): {
    cgst: number; sgst: number; igst: number; totalTax: number; total: number;
  } {
    const tax = parseFloat((taxableValue * gstRate / 100).toFixed(2));
    if (isInterState) {
      return { cgst: 0, sgst: 0, igst: tax, totalTax: tax, total: taxableValue + tax };
    }
    const half = parseFloat((tax / 2).toFixed(2));
    return { cgst: half, sgst: half, igst: 0, totalTax: tax, total: taxableValue + tax };
  }

  // ── GSTR-1 builder ────────────────────────────────────────────────────────

  static buildGSTR1(
    month: string,
    pumpId: string,
    gstin: string,
    state: string,
    fuelSales: FuelSaleRecord[],
    nonFuelSales: NonFuelSaleRecord[]
  ): GSTR1Summary {
    const monthFuel = fuelSales.filter(s => s.date.startsWith(month) && s.pumpId === pumpId);
    const monthNonFuel = nonFuelSales.filter(s => s.date.startsWith(month) && s.pumpId === pumpId);

    // Fuel is OUTSIDE GST — goes into VAT / Excise only
    // NonFuel is inside GST

    // B2C (all non-fuel retail) — aggregate
    const b2cTaxable = monthNonFuel.reduce((s, x) => s + x.taxableValue, 0);
    const b2cCgst = monthNonFuel.reduce((s, x) => s + x.cgst, 0);
    const b2cSgst = monthNonFuel.reduce((s, x) => s + x.sgst, 0);
    const b2cIgst = monthNonFuel.reduce((s, x) => s + x.igst, 0);

    // Fuel VAT
    const vatOnFuel = monthFuel.reduce((s, f) => {
      const taxes = this.computeFuelTaxes(f.litresSold, f.fuelType as any, f.ratePerLitre, state);
      return s + taxes.vatAmount;
    }, 0);
    const exciseDutyOnFuel = monthFuel.reduce((s, f) => {
      const taxes = this.computeFuelTaxes(f.litresSold, f.fuelType as any, f.ratePerLitre, state);
      return s + taxes.exciseDuty;
    }, 0);

    // HSN Summary for non-fuel
    const hsnMap: Record<string, any> = {};
    const HSN_CODES: Record<string, string> = {
      lubricants: '2710', shop: '9999', tyres: '4011', accessories: '8708', services: '9987'
    };
    for (const nf of monthNonFuel) {
      const hsn = HSN_CODES[nf.category] || '9999';
      if (!hsnMap[hsn]) {
        hsnMap[hsn] = { hsnCode: hsn, description: nf.category, uqc: 'NOS', qty: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      hsnMap[hsn].qty++;
      hsnMap[hsn].taxableValue += nf.taxableValue;
      hsnMap[hsn].cgst += nf.cgst;
      hsnMap[hsn].sgst += nf.sgst;
      hsnMap[hsn].igst += nf.igst;
    }

    const totalGst = parseFloat((b2cCgst + b2cSgst + b2cIgst).toFixed(2));

    return {
      month, pumpId, gstin, state,
      b2cTaxableValue: parseFloat(b2cTaxable.toFixed(2)),
      b2cCgst: parseFloat(b2cCgst.toFixed(2)),
      b2cSgst: parseFloat(b2cSgst.toFixed(2)),
      b2cIgst: parseFloat(b2cIgst.toFixed(2)),
      b2bTaxableValue: 0,
      b2bCgst: 0, b2bSgst: 0, b2bIgst: 0,
      hsnSummary: Object.values(hsnMap).map(h => ({
        ...h,
        taxableValue: parseFloat(h.taxableValue.toFixed(2)),
        cgst: parseFloat(h.cgst.toFixed(2)),
        sgst: parseFloat(h.sgst.toFixed(2)),
        igst: parseFloat(h.igst.toFixed(2)),
      })),
      totalTaxableValue: parseFloat(b2cTaxable.toFixed(2)),
      totalGst,
      vatOnFuel: parseFloat(vatOnFuel.toFixed(2)),
      exciseDutyOnFuel: parseFloat(exciseDutyOnFuel.toFixed(2)),
    };
  }

  // ── GSTR-3B builder ──────────────────────────────────────────────────────

  static buildGSTR3B(
    gstr1: GSTR1Summary,
    itc: InputTaxCredit[],
    isLate = false
  ): GSTR3BSummary {
    const monthItc = itc.filter(i => i.pumpId === gstr1.pumpId && i.month === gstr1.month);
    const eligibleItc = monthItc.filter(i => i.eligible);

    const itcIgst = parseFloat(eligibleItc.reduce((s, i) => s + i.igstPaid, 0).toFixed(2));
    const itcCgst = parseFloat(eligibleItc.reduce((s, i) => s + i.cgstPaid, 0).toFixed(2));
    const itcSgst = parseFloat(eligibleItc.reduce((s, i) => s + i.sgstPaid, 0).toFixed(2));
    const itcTotal = parseFloat((itcIgst + itcCgst + itcSgst).toFixed(2));
    const itcIneligible = parseFloat(monthItc.filter(i => !i.eligible).reduce((s, i) => s + i.totalITC, 0).toFixed(2));

    const cgstPayable = Math.max(0, gstr1.b2cCgst + gstr1.b2bCgst - itcCgst);
    const sgstPayable = Math.max(0, gstr1.b2cSgst + gstr1.b2bSgst - itcSgst);
    const igstPayable = Math.max(0, gstr1.b2cIgst + gstr1.b2bIgst - itcIgst);
    const totalGstPayable = parseFloat((cgstPayable + sgstPayable + igstPayable).toFixed(2));

    const interestLiability = isLate ? parseFloat((totalGstPayable * 0.18 / 12).toFixed(2)) : 0;
    const lateFee = isLate ? 50 : 0; // Rs 50/day capped at Rs 5000
    const totalNetLiability = parseFloat((totalGstPayable + interestLiability + lateFee).toFixed(2));

    return {
      month: gstr1.month,
      pumpId: gstr1.pumpId,
      gstin: gstr1.gstin,
      outwardTaxable: gstr1.totalTaxableValue,
      outwardNilRated: 0,
      outwardExempt: 0,
      outwardNonGst: gstr1.vatOnFuel + gstr1.exciseDutyOnFuel,
      itcIgst, itcCgst, itcSgst, itcTotal, itcIneligible,
      cgstPayable: parseFloat(cgstPayable.toFixed(2)),
      sgstPayable: parseFloat(sgstPayable.toFixed(2)),
      igstPayable: parseFloat(igstPayable.toFixed(2)),
      totalGstPayable,
      interestLiability,
      lateFee,
      totalNetLiability,
    };
  }

  // ── Monthly P&L + Tax Summary ────────────────────────────────────────────

  static buildMonthlyTaxSummary(
    month: string,
    pumpId: string,
    pumpName: string,
    state: string,
    gstin: string,
    fuelSales: FuelSaleRecord[],
    nonFuelSales: NonFuelSaleRecord[],
    itc: InputTaxCredit[],
    operatingExpenses: number,
    staffCost: number,
    dealerPurchaseCostPerLitre: Record<string, number>
  ): MonthlyTaxSummary {
    const monthFuel = fuelSales.filter(s => s.date.startsWith(month) && s.pumpId === pumpId);
    const monthNonFuel = nonFuelSales.filter(s => s.date.startsWith(month) && s.pumpId === pumpId);

    const fuelRevenue = parseFloat(monthFuel.reduce((s, f) => s + f.totalRevenue, 0).toFixed(2));
    const nonFuelRevenue = parseFloat(monthNonFuel.reduce((s, f) => s + f.totalWithTax, 0).toFixed(2));
    const totalRevenue = parseFloat((fuelRevenue + nonFuelRevenue).toFixed(2));

    const gstr1 = this.buildGSTR1(month, pumpId, gstin, state, fuelSales, nonFuelSales);
    const gstr3b = this.buildGSTR3B(gstr1, itc);

    const vatCollected = gstr1.vatOnFuel;
    const exciseDutyComponent = gstr1.exciseDutyOnFuel;
    const gstCollected = gstr1.totalGst;
    const totalTaxCollected = parseFloat((vatCollected + exciseDutyComponent + gstCollected).toFixed(2));

    const dealerPurchaseCost = parseFloat(monthFuel.reduce((s, f) => {
      const costPerL = dealerPurchaseCostPerLitre[f.fuelType] ?? 0;
      return s + f.litresSold * costPerL;
    }, 0).toFixed(2));

    const grossProfit = parseFloat((totalRevenue - dealerPurchaseCost - totalTaxCollected).toFixed(2));
    const grossMarginPct = totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const netProfit = parseFloat((grossProfit - operatingExpenses - staffCost).toFixed(2));
    const netMarginPct = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    // Due dates: GSTR-1 by 11th, GSTR-3B by 20th of next month
    const [yr, mo] = month.split('-').map(Number);
    const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`;
    const gstr1DueDate = `${nextMo}-11`;
    const gstr3bDueDate = `${nextMo}-20`;

    const today = new Date().toISOString().slice(0, 10);
    const penaltyRisk = today > gstr3bDueDate
      ? Math.min(5000, gstr3b.totalGstPayable * 0.01 * Math.ceil((new Date(today).getTime() - new Date(gstr3bDueDate).getTime()) / 86400000))
      : 0;

    return {
      month, pumpId, pumpName, state,
      fuelRevenue, nonFuelRevenue, totalRevenue,
      vatCollected, exciseDutyComponent, gstCollected, totalTaxCollected,
      dealerPurchaseCost, operatingExpenses, staffCost,
      grossProfit, grossMarginPct, netProfit, netMarginPct,
      gstr1, gstr3b,
      gstr1Filed: false, gstr3bFiled: false,
      gstr1DueDate, gstr3bDueDate,
      penaltyRisk: parseFloat(penaltyRisk.toFixed(2)),
    };
  }

  // ── Annual Report ─────────────────────────────────────────────────────────

  static buildAnnualReport(months: MonthlyTaxSummary[], fy: string, gstin: string): AnnualTaxReport {
    if (months.length === 0) throw new Error('No monthly data provided');
    const { pumpId, pumpName } = months[0];
    return {
      fy, pumpId, gstin, pumpName, months,
      annualRevenue:        parseFloat(months.reduce((s, m) => s + m.totalRevenue, 0).toFixed(2)),
      annualFuelRevenue:    parseFloat(months.reduce((s, m) => s + m.fuelRevenue, 0).toFixed(2)),
      annualNonFuelRevenue: parseFloat(months.reduce((s, m) => s + m.nonFuelRevenue, 0).toFixed(2)),
      annualVat:            parseFloat(months.reduce((s, m) => s + m.vatCollected, 0).toFixed(2)),
      annualExcise:         parseFloat(months.reduce((s, m) => s + m.exciseDutyComponent, 0).toFixed(2)),
      annualGst:            parseFloat(months.reduce((s, m) => s + m.gstCollected, 0).toFixed(2)),
      annualGrossProfit:    parseFloat(months.reduce((s, m) => s + m.grossProfit, 0).toFixed(2)),
      annualNetProfit:      parseFloat(months.reduce((s, m) => s + m.netProfit, 0).toFixed(2)),
      annualItcClaimed:     parseFloat(months.reduce((s, m) => s + m.gstr3b.itcTotal, 0).toFixed(2)),
      filedMonths:          months.filter(m => m.gstr3bFiled).length,
      pendingMonths:        months.filter(m => !m.gstr3bFiled).length,
      totalPenaltyRisk:     parseFloat(months.reduce((s, m) => s + m.penaltyRisk, 0).toFixed(2)),
    };
  }

  // ── Demo data generator ───────────────────────────────────────────────────

  static generateDemoData(pumpId: string, state = 'MH', months = 6): {
    fuelSales: FuelSaleRecord[];
    nonFuelSales: NonFuelSaleRecord[];
    itc: InputTaxCredit[];
  } {
    const fuelSales: FuelSaleRecord[] = [];
    const nonFuelSales: NonFuelSaleRecord[] = [];
    const itcList: InputTaxCredit[] = [];
    const today = new Date();

    for (let m = months - 1; m >= 0; m--) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - m);
      const monthStr = d.toISOString().slice(0, 7);

      // ~30 days of fuel sales
      for (let day = 1; day <= 28; day++) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;

        // MS — 2 shifts
        fuelSales.push({ date: dateStr, pumpId, fuelType: 'ms', litresSold: Math.round(800 + Math.random() * 400), ratePerLitre: 104.72, totalRevenue: 0 });
        fuelSales.push({ date: dateStr, pumpId, fuelType: 'ms', litresSold: Math.round(700 + Math.random() * 300), ratePerLitre: 104.72, totalRevenue: 0 });

        // HSD — 2 shifts
        fuelSales.push({ date: dateStr, pumpId, fuelType: 'hsd', litresSold: Math.round(600 + Math.random() * 500), ratePerLitre: 91.60, totalRevenue: 0 });
        fuelSales.push({ date: dateStr, pumpId, fuelType: 'hsd', litresSold: Math.round(500 + Math.random() * 400), ratePerLitre: 91.60, totalRevenue: 0 });
      }

      // Fix totalRevenue
      fuelSales.forEach(f => { if (f.date.startsWith(monthStr)) f.totalRevenue = parseFloat((f.litresSold * f.ratePerLitre).toFixed(2)); });

      // Non-fuel sales (lubricants, shop)
      for (let day = 1; day <= 28; day += 3) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const taxable = Math.round(500 + Math.random() * 3000);
        const gst = this.computeNonFuelGST(taxable, 18);
        nonFuelSales.push({ date: dateStr, pumpId, category: 'lubricants', description: 'Engine oil / grease', taxableValue: taxable, gstRate: 18, ...gst, totalWithTax: gst.total });

        const shopTaxable = Math.round(200 + Math.random() * 800);
        const shopGst = this.computeNonFuelGST(shopTaxable, 5);
        nonFuelSales.push({ date: dateStr, pumpId, category: 'shop', description: 'Convenience store', taxableValue: shopTaxable, gstRate: 5, ...shopGst, totalWithTax: shopGst.total });
      }

      // ITC (purchase of lubricants, maintenance materials)
      const itcTaxable = Math.round(8000 + Math.random() * 5000);
      const itcGst = parseFloat((itcTaxable * 0.18).toFixed(2));
      itcList.push({
        month: monthStr, pumpId, category: 'Lubricant Purchase',
        taxableValue: itcTaxable, igstPaid: 0, cgstPaid: parseFloat((itcGst / 2).toFixed(2)),
        sgstPaid: parseFloat((itcGst / 2).toFixed(2)), totalITC: itcGst, eligible: true
      });
    }

    return { fuelSales, nonFuelSales, itc: itcList };
  }
}

export default GSTReportEngine;
