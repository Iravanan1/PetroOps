export type LayoutType = 'HPCL' | 'BPCL' | 'IOCL' | 'NAYARA' | 'JIOBP' | 'CUSTOM' | 'HANDWRITTEN_ONLY' | 'THERMAL';

export class RegisterTemplateClassifier {
  
  /**
   * Classify register layouts based on a manually selected provider.
   * Auto-detection and dynamic layout guessing have been disabled.
   */
  public static classifyLayout(rawText: string, provider?: string): LayoutType {
    if (provider) {
      const p = provider.toUpperCase();
      if (p === 'HPCL') return 'HPCL';
      if (p === 'BPCL') return 'BPCL';
      if (p === 'IOCL') return 'IOCL';
      if (p === 'NAYARA') return 'NAYARA';
      if (p === 'JIOBP') return 'JIOBP';
      if (p === 'HANDWRITTEN_ONLY') return 'HANDWRITTEN_ONLY';
      if (p === 'THERMAL') return 'THERMAL';
      return 'CUSTOM';
    }
    // Fallback default
    return 'HPCL';
  }
}

