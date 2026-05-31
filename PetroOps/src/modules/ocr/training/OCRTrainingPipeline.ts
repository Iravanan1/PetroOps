/**
 * OCRTrainingPipeline.ts
 * Manages the gathering of manual OCR corrections, coordinates, and ground truth data.
 * Formats and compiles these correction chunks into localized model training datasets.
 */

export interface ImageSliceCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRCorrectionSample {
  sampleId: string;
  originalText: string;
  correctedText: string;
  imageSliceUrl?: string;
  coordinates?: ImageSliceCoords;
  fieldName: string;
  timestamp: number;
  operatorId: string;
  confidenceScore: number;
  isVerified: boolean;
}

export interface TrainingBatch {
  batchId: string;
  createdAt: number;
  samples: OCRCorrectionSample[];
  targetModelBase: string;
  exportFormat: "JSONL_ANNOTATED" | "TENSOR_RECORD" | "HUGGINGFACE_DATASET";
}

export class OCRTrainingPipeline {
  private static STORAGE_KEY_SAMPLES = "pumpai_ocr_correction_samples";
  private static STORAGE_KEY_BATCHES = "pumpai_ocr_training_batches";

  /**
   * Retrieve all recorded correction samples
   */
  public static getCorrectionSamples(): OCRCorrectionSample[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_SAMPLES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load OCR correction samples", e);
      return [];
    }
  }

  /**
   * Adds a new manually corrected OCR entry to the training queue
   */
  public static registerCorrectionSample(
    fieldName: string,
    originalText: string,
    correctedText: string,
    confidenceScore: number,
    operatorId: string,
    coordinates?: ImageSliceCoords,
    imageSliceUrl?: string
  ): OCRCorrectionSample {
    const samples = this.getCorrectionSamples();
    
    const newSample: OCRCorrectionSample = {
      sampleId: `OCR-SMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      originalText: originalText.trim(),
      correctedText: correctedText.trim(),
      imageSliceUrl,
      coordinates,
      fieldName,
      timestamp: Date.now(),
      operatorId,
      confidenceScore,
      isVerified: true
    };

    samples.push(newSample);
    localStorage.setItem(this.STORAGE_KEY_SAMPLES, JSON.stringify(samples));
    return newSample;
  }

  /**
   * Packages outstanding verified samples into a training batch
   */
  public static compileTrainingBatch(
    targetModelBase: string,
    exportFormat: TrainingBatch["exportFormat"] = "JSONL_ANNOTATED"
  ): TrainingBatch {
    const samples = this.getCorrectionSamples();
    const unbatched = samples.filter(s => s.isVerified);

    if (unbatched.length === 0) {
      throw new Error("No verified correction samples available to compile a training batch.");
    }

    const batchId = `OCR-BCH-${Date.now()}`;
    const newBatch: TrainingBatch = {
      batchId,
      createdAt: Date.now(),
      samples: [...unbatched],
      targetModelBase,
      exportFormat
    };

    // Save batch configuration
    try {
      const existingBatchesData = localStorage.getItem(this.STORAGE_KEY_BATCHES);
      const existingBatches: TrainingBatch[] = existingBatchesData ? JSON.parse(existingBatchesData) : [];
      existingBatches.push(newBatch);
      localStorage.setItem(this.STORAGE_KEY_BATCHES, JSON.stringify(existingBatches));
      
      // Clear samples that have been batched
      const remainingSamples = samples.filter(s => !unbatched.some(u => u.sampleId === s.sampleId));
      localStorage.setItem(this.STORAGE_KEY_SAMPLES, JSON.stringify(remainingSamples));
    } catch (e) {
      console.error("Failed to commit training batch to local persistence", e);
    }

    return newBatch;
  }

  /**
   * Serializes the training batch into JSONL annotation text matching common OCR fine-tuning formats
   */
  public static serializeBatchToJsonl(batch: TrainingBatch): string {
    return batch.samples.map(sample => {
      return JSON.stringify({
        image_slice_meta: {
          coords: sample.coordinates,
          source_crop: sample.imageSliceUrl
        },
        ground_truth: {
          field_name: sample.fieldName,
          correction_source: sample.operatorId,
          confidence_historical: sample.confidenceScore,
          input_text: sample.originalText,
          target_text: sample.correctedText
        }
      });
    }).join("\n");
  }

  /**
   * Retrieves historical compiled training batches
   */
  public static getCompiledBatches(): TrainingBatch[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_BATCHES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to fetch historical training batches", e);
      return [];
    }
  }
}
