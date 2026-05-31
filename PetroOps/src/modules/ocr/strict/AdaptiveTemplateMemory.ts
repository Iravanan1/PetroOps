export interface TemplateSignature {
  stationId: string;
  templateType: string;
  fieldOffsets: Record<string, { x: number, y: number, w: number, h: number }>;
}

export class AdaptiveTemplateMemory {
  private static memoryBank = new Map<string, TemplateSignature>();

  public static learnTemplate(stationId: string, layout: TemplateSignature): void {
    this.memoryBank.set(stationId, layout);
  }

  public static recallTemplate(stationId: string): TemplateSignature | undefined {
    return this.memoryBank.get(stationId);
  }

  public static adjustBoundingBox(stationId: string, field: string, defaultBox: {x:number,y:number,w:number,h:number}) {
    const memory = this.recallTemplate(stationId);
    if (memory && memory.fieldOffsets[field]) {
      return memory.fieldOffsets[field]; // Overrides default with learned memory
    }
    return defaultBox;
  }
}
