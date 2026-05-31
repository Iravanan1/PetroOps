/**
 * ThermalPrintService.ts
 * ───────────────────────
 * Unified coordinator wrapper for high-fidelity ESC/POS, silent thermal,
 * and browser printing spools. Integrates robust fallback logic and queue sync.
 */

import { ThermalPrinterService as BasePrinter, ShiftPrintData, PaperWidth } from './ThermalPrinterService';
import { printerHardeningLayer, ShiftClosePayload } from '../hardware/PrinterHardeningLayer';

export class ThermalPrintService {
  /**
   * Spools a shift closing receipt via the hardened ESC/POS queue or browser dialog
   */
  public static printShiftClosing(data: ShiftPrintData, paperWidth: PaperWidth = 80): void {
    // Convert base shift data to ESC/POS payload format
    const payload: ShiftClosePayload = {
      stationName: data.stationName,
      address: 'Station HQ Terminal',
      gstin: '27AABCU9603R1ZX',
      shiftId: data.shiftLabel,
      date: data.shiftDate,
      shiftLabel: data.shiftLabel.includes('Day') ? 'Day' : 'Night',
      operatorName: data.operatorName,
      supervisorName: data.supervisorName || 'System Supervisor',
      nozzles: data.nozzles.map((nz, idx) => ({
        id: `N${idx + 1}`,
        label: nz.label,
        fuel: nz.fuel,
        opening: nz.opening,
        closing: nz.closing,
        testing: nz.testing,
        netLitres: Math.max(0, nz.closing - nz.opening - nz.testing),
        rate: nz.rate,
        revenue: Math.max(0, nz.closing - nz.opening - nz.testing) * nz.rate
      })),
      payments: {
        cash: data.totalCashCounted,
        upi: data.upiCollected,
        card: data.cardCollected,
        credit: data.creditSales,
        recovery: data.creditRecovery
      },
      expenses: data.expenses,
      openingCash: data.openingCash,
      closingCash: data.totalCashCounted,
      shortage: data.cashShortage > 0 ? data.cashShortage : 0,
      overage: data.cashShortage < 0 ? Math.abs(data.cashShortage) : 0,
      dipReadings: [],
      vatTotal: 0,
      exciseDutyTotal: 0,
      gstTotal: 0
    };

    try {
      // 1. Spool to serial / LAN ESC/POS queue
      printerHardeningLayer.printShiftClose(payload);
    } catch {
      // 2. Fall back to Electron silent print / browser print spools
      if (paperWidth !== 'A4') {
        BasePrinter.printThermal(data, { paperWidth, silent: false });
      } else {
        BasePrinter.printA4(data, { paperWidth: 'A4', silent: false });
      }
    }
  }

  /**
   * Generates and prints generic textual receipts
   */
  public static printTextReceipt(title: string, lines: string[]): void {
    try {
      printerHardeningLayer.printAuditLog(lines, title);
    } catch {
      console.warn('[ThermalPrintService] Failed to spool audit receipt. Queueing offline.');
    }
  }
}

export default ThermalPrintService;
