export interface InferenceProfile {
  modelName: string;
  useQuantization: boolean; // e.g., 4-bit / 8-bit
  gpuLayers: number;        // how many layers to offload to Metal/CUDA
  batchSize: number;
  maxTokens: number;
}

export class LocalInferenceOptimizer {
  
  /**
   * Returns the optimal inference parameters for the current device capability.
   */
  public static getOptimalProfile(modelType: 'ocr' | 'llm'): InferenceProfile {
    // In production, this would probe `navigator.gpu` or run a local python script 
    // to determine VRAM. Here we simulate an optimized default for Mac / local PC.
    
    if (modelType === 'ocr') {
      return {
        modelName: 'qwen2.5-vl-7b-instruct-q4_k_m',
        useQuantization: true,
        gpuLayers: 33, // Max layers for a 7B model
        batchSize: 4,  // Process 4 small image chunks at once
        maxTokens: 512
      };
    }

    return {
      modelName: 'llama3-8b-instruct-q4_k_m',
      useQuantization: true,
      gpuLayers: 33,
      batchSize: 1,
      maxTokens: 1024
    };
  }
}
