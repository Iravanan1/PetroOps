/**
 * LayoutLearningRegistry.ts
 * 
 * Tracks spatial shifts, coordinate offsets, and bounding box alignments per station template.
 * Automatically aligns OCR bounding boxes based on operator layout correction metrics.
 */

export interface FieldBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRegistryEntry {
  stationId: string;
  fieldKey: string;
  dxSum: number;
  dySum: number;
  correctionsCount: number;
  currentOffset: { dx: number; dy: number };
  boundingBoxes: FieldBoundingBox[];
}

export class LayoutLearningRegistry {
  private static readonly STORAGE_KEY = 'pumpai_layout_learning_registry';
  private static cachedRegistry: LayoutRegistryEntry[] = [];

  /**
   * Logs a layout crop-shifting correction made by an operator/manager
   */
  public static logLayoutCorrection(
    stationId: string,
    fieldKey: string,
    dx: number,
    dy: number,
    box?: FieldBoundingBox
  ): void {
    if (!stationId || !fieldKey) return;

    const registry = this.getAllEntries();
    let entry = registry.find(r => r.stationId === stationId && r.fieldKey === fieldKey);

    if (!entry) {
      entry = {
        stationId,
        fieldKey,
        dxSum: 0,
        dySum: 0,
        correctionsCount: 0,
        currentOffset: { dx: 0, dy: 0 },
        boundingBoxes: []
      };
      registry.push(entry);
    }

    entry.correctionsCount += 1;
    entry.dxSum += dx;
    entry.dySum += dy;
    
    // Average layout offset computation
    entry.currentOffset = {
      dx: Number((entry.dxSum / entry.correctionsCount).toFixed(2)),
      dy: Number((entry.dySum / entry.correctionsCount).toFixed(2))
    };

    if (box) {
      // Store historical bounding boxes (limit cache size to 5)
      entry.boundingBoxes.push(box);
      if (entry.boundingBoxes.length > 5) {
        entry.boundingBoxes.shift();
      }
    }

    this.saveRegistry(registry);
  }

  /**
   * Predicts a dynamic layout offset shift for a specific field based on template corrections
   */
  public static predictLayoutDrift(stationId: string, fieldKey: string): { dx: number; dy: number } {
    const entry = this.getAllEntries().find(r => r.stationId === stationId && r.fieldKey === fieldKey);
    if (!entry || entry.correctionsCount < 3) {
      return { dx: 0, dy: 0 }; // Baseline calibration needs at least 3 corrections
    }

    return entry.currentOffset;
  }

  /**
   * Returns a learned spatial coordinate bounding box modified by historic alignment shifts
   */
  public static getLearnedBoundingBox(
    stationId: string,
    fieldKey: string,
    defaultBox: FieldBoundingBox
  ): FieldBoundingBox {
    const offset = this.predictLayoutDrift(stationId, fieldKey);
    return {
      x: Math.max(0, Math.round(defaultBox.x + offset.dx)),
      y: Math.max(0, Math.round(defaultBox.y + offset.dy)),
      width: defaultBox.width,
      height: defaultBox.height
    };
  }

  /**
   * Loads the current learning registry from storage
   */
  public static getAllEntries(): LayoutRegistryEntry[] {
    if (this.cachedRegistry.length > 0) {
      return this.cachedRegistry;
    }

    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cachedRegistry = JSON.parse(stored);
        return this.cachedRegistry;
      }
    } catch (e) {
      console.warn('[LayoutLearningRegistry] Failed to load layout registry:', e);
    }

    return [];
  }

  /**
   * Saves layout registry entries
   */
  private static saveRegistry(registry: LayoutRegistryEntry[]): void {
    this.cachedRegistry = registry;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(registry));
      } catch (e) {
        console.warn('[LayoutLearningRegistry] Failed to save layout registry:', e);
      }
    }
  }
}
