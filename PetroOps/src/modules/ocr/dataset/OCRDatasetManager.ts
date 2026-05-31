export interface GroundTruthLabel {
  field: string;
  expectedValue: string | number;
  boundingBox?: { x: number; y: number; w: number; h: number };
}

export interface OCRDatasetEntry {
  id: string;
  imageUrl: string;
  branchId: string;
  operatorId: string;
  shiftId: string;
  templateType: string;
  labels: GroundTruthLabel[];
  status: 'PENDING_REVIEW' | 'LABELED' | 'REJECTED';
  environmentalTags: string[]; // e.g. 'blur', 'glare', 'folded'
  createdAt: string;
}

export class OCRDatasetManager {
  private static mockDatabase: Record<string, OCRDatasetEntry> = {};

  public static ingestImage(
    imageUrl: string,
    metadata: { branchId: string; operatorId: string; shiftId: string; templateType: string },
    environmentalTags: string[] = []
  ): OCRDatasetEntry {
    const id = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const entry: OCRDatasetEntry = {
      id,
      imageUrl,
      ...metadata,
      labels: [],
      status: 'PENDING_REVIEW',
      environmentalTags,
      createdAt: new Date().toISOString()
    };
    
    this.mockDatabase[id] = entry;
    return entry;
  }

  public static saveGroundTruth(id: string, labels: GroundTruthLabel[]): void {
    if (!this.mockDatabase[id]) throw new Error(`Dataset entry ${id} not found.`);
    this.mockDatabase[id].labels = labels;
    this.mockDatabase[id].status = 'LABELED';
  }

  public static queryDataset(filters: { branchId?: string; templateType?: string; status?: string }): OCRDatasetEntry[] {
    return Object.values(this.mockDatabase).filter(entry => {
      let match = true;
      if (filters.branchId && entry.branchId !== filters.branchId) match = false;
      if (filters.templateType && entry.templateType !== filters.templateType) match = false;
      if (filters.status && entry.status !== filters.status) match = false;
      return match;
    });
  }
}
