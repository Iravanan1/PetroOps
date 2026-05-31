/**
 * SyntheticRegisterGenerator.ts
 * Programmatically generates synthetic fuel register image templates and applies image augmentation parameters
 * (shadows, folds, smudges, tilts, and penmanship styles) to construct diverse OCR training samples.
 */

import { ImageSliceCoords } from "./OCRTrainingPipeline";

export interface SyntheticFieldMeta {
  fieldName: string;
  expectedValue: string;
  coords: ImageSliceCoords;
}

export interface SyntheticRegisterOutput {
  imageDataUrl: string;
  fields: SyntheticFieldMeta[];
  width: number;
  height: number;
}

export interface AugmentationParams {
  injectGreaseSmudges: boolean;
  shadowIntensity: number; // Scale 0 (none) to 1 (full dark)
  paperCreasesCount: number;
  rotationSkewDegrees: number; // Simulated scanner tilt
  handwritingVariation: "NEAT" | "CRAWDED" | "SLANTED" | "PRINT";
}

export class SyntheticRegisterGenerator {
  /**
   * Generates a fully rendered mock sales register on an HTML5 canvas and applies advanced visual degradation layers.
   */
  public static generateRegister(
    fieldsOverride: Record<string, string>,
    augmentation: AugmentationParams
  ): SyntheticRegisterOutput {
    // Instantiate in-memory HTML5 Canvas matching typical ledger sheet ratios
    const width = 800;
    const height = 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to obtain 2D rendering context for canvas generation.");
    }

    // 1. Draw base white-ivory aged paper background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, width, height);

    // 2. Draw ledger lines (cyan lines, pink margin line)
    ctx.strokeStyle = "rgba(0, 180, 216, 0.25)";
    ctx.lineWidth = 1;
    for (let y = 50; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical ledger line margins
    ctx.strokeStyle = "rgba(224, 122, 95, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(120, height);
    ctx.moveTo(400, 0);
    ctx.lineTo(400, height);
    ctx.stroke();

    // 3. Define and draw layout fields (simulated mechanical totalizer prints vs operator entries)
    const defaultFields = {
      nozzle_1_open: "450912.3",
      nozzle_1_close: "451240.8",
      nozzle_1_test: "5.0",
      nozzle_2_open: "238910.1",
      nozzle_2_close: "239120.4",
      credit_sales_amt: "4500",
      credit_customer_name: "SHER-E-PUNJAB TRUCKS",
      shift_date: "2026-05-21",
    };

    const finalFields = { ...defaultFields, ...fieldsOverride };
    const fieldsMeta: SyntheticFieldMeta[] = [];

    // Draw Title Header
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText("DAILY FUEL OUTFLOW LOG & CREDIT REGISTRATION", 140, 35);

    // Render entries programmatically and log pixel coordinate slices
    let currentY = 80;

    // Field definition sets
    const renderingSchema = [
      { name: "shift_date", label: "DATE:", value: finalFields.shift_date, isHandwritten: false },
      { name: "nozzle_1_open", label: "NZ-1 OPENING (L):", value: finalFields.nozzle_1_open, isHandwritten: true },
      { name: "nozzle_1_close", label: "NZ-1 CLOSING (L):", value: finalFields.nozzle_1_close, isHandwritten: true },
      { name: "nozzle_1_test", label: "NZ-1 TEST QUANTITY:", value: finalFields.nozzle_1_test, isHandwritten: true },
      { name: "nozzle_2_open", label: "NZ-2 OPENING (L):", value: finalFields.nozzle_2_open, isHandwritten: true },
      { name: "nozzle_2_close", label: "NZ-2 CLOSING (L):", value: finalFields.nozzle_2_close, isHandwritten: true },
      { name: "credit_sales_amt", label: "CREDIT SALES RS.:", value: finalFields.credit_sales_amt, isHandwritten: true },
      { name: "credit_customer_name", label: "CUSTOMER:", value: finalFields.credit_customer_name, isHandwritten: true },
    ];

    renderingSchema.forEach((item) => {
      // Draw Label
      ctx.fillStyle = "#475569";
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillText(item.label, 140, currentY);

      // Value location bounds
      const valX = 420;
      const valY = currentY - 5;
      const textWidth = ctx.measureText(item.value).width;

      // Select penmanship font and style parameters based on augmentation overrides
      if (item.isHandwritten) {
        ctx.fillStyle = this.getInkColor(augmentation.handwritingVariation);
        ctx.font = this.getHandwritingFont(augmentation.handwritingVariation);
        
        // Inject random layout tilt/hand offset variables
        const skewX = (Math.random() - 0.5) * 4;
        const skewY = (Math.random() - 0.5) * 3;
        
        ctx.fillText(item.value, valX + skewX, currentY + skewY);
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillText(item.value, valX, currentY);
      }

      // Record coordinate bounding box
      fieldsMeta.push({
        fieldName: item.name,
        expectedValue: item.value,
        coords: {
          x: valX - 10,
          y: valY - 15,
          width: textWidth + 40,
          height: 25,
        },
      });

      currentY += 40;
    });

    // 4. APPLY IMAGE AUGMENTATION CHANNELS
    
    // Inject Paper Folds / Creases (light gray/dark lines representing folding)
    if (augmentation.paperCreasesCount > 0) {
      ctx.strokeStyle = "rgba(100, 100, 100, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < augmentation.paperCreasesCount; i++) {
        const foldY = Math.random() * height;
        ctx.beginPath();
        ctx.moveTo(0, foldY - 10);
        ctx.bezierCurveTo(
          width / 3, foldY + 15,
          (width / 3) * 2, foldY - 15,
          width, foldY + 10
        );
        ctx.stroke();

        // White highlights behind folds to give dimensional depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(0, foldY - 8);
        ctx.bezierCurveTo(
          width / 3, foldY + 17,
          (width / 3) * 2, foldY - 13,
          width, foldY + 12
        );
        ctx.stroke();
      }
    }

    // Inject Grease Smudges / Oil Stains (simulating real petroleum pump environments)
    if (augmentation.injectGreaseSmudges) {
      for (let s = 0; s < 3; s++) {
        const smudgeX = Math.random() * width;
        const smudgeY = Math.random() * height;
        const radius = 25 + Math.random() * 45;

        // Use radial gradient to simulate oily petroleum spill
        const grad = ctx.createRadialGradient(smudgeX, smudgeY, 2, smudgeX, smudgeY, radius);
        grad.addColorStop(0, "rgba(92, 64, 51, 0.18)"); // Deep brownish translucent center
        grad.addColorStop(0.5, "rgba(160, 120, 90, 0.08)");
        grad.addColorStop(1, "rgba(250, 248, 245, 0)"); // Fade to white base

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smudgeX, smudgeY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Inject Low-Light Shadows / Illumination Falloffs
    if (augmentation.shadowIntensity > 0) {
      // Simulate dark overhead flashlight cast skew
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, `rgba(15, 23, 42, ${augmentation.shadowIntensity * 0.65})`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Apply rotation skew (simulate slight scanner tilt on separate canvas)
    let finalCanvas = canvas;
    if (Math.abs(augmentation.rotationSkewDegrees) > 0.1) {
      finalCanvas = document.createElement("canvas");
      finalCanvas.width = width;
      finalCanvas.height = height;
      const fCtx = finalCanvas.getContext("2d");
      if (fCtx) {
        // Pivot from center
        fCtx.fillStyle = "#070b13"; // Background dark filling for scanner boundaries
        fCtx.fillRect(0, 0, width, height);

        fCtx.translate(width / 2, height / 2);
        fCtx.rotate((augmentation.rotationSkewDegrees * Math.PI) / 180);
        fCtx.drawImage(canvas, -width / 2, -height / 2);
      }
    }

    return {
      imageDataUrl: finalCanvas.toDataURL("image/jpeg", 0.85),
      fields: fieldsMeta,
      width,
      height,
    };
  }

  /**
   * Translates handwriting styles into matching CSS font definitions
   */
  private static getHandwritingFont(style: AugmentationParams["handwritingVariation"]): string {
    switch (style) {
      case "PRINT":
        return "italic 13px 'Trebuchet MS', sans-serif";
      case "SLANTED":
        return "italic bold 14px 'Brush Script MT', 'Comic Sans MS', cursive";
      case "CRAWDED":
        return "11px 'Impact', sans-serif"; // Cramped heavy letters
      case "NEAT":
      default:
        return "italic bold 13px 'Georgia', serif";
    }
  }

  /**
   * Resolves realistic blue/black ballpoint ink styles
   */
  private static getInkColor(style: AugmentationParams["handwritingVariation"]): string {
    switch (style) {
      case "PRINT":
        return "#1e3a8a"; // Pure blue ink
      case "SLANTED":
        return "#0284c7"; // Light sky-blue gel pen
      case "CRAWDED":
        return "#0f172a"; // Smudged dirty black ink
      case "NEAT":
      default:
        return "#0f2d59"; // Deep indigo ballpoint
    }
  }
}
