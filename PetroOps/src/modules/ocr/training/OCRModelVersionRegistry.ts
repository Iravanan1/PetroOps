/**
 * OCRModelVersionRegistry.ts
 * Manages active OCR parsing weight configuration states.
 * Enforces strict semantic versioning controls and enables rollbacks if regression anomalies emerge.
 */

export interface ModelWeightConfig {
  version: string; // e.g. "v1.2.0"
  releasedAt: number;
  accuracyScore: number; // Overall evaluation percentage (e.g. 98.4)
  modelType: "TESSERACT_FINETUNE" | "PUMPAI_CNN_V3" | "PROPRIETARY_TRANSFORMER";
  status: "ACTIVE" | "STAGING" | "DEPRECATED" | "ROLLED_BACK";
  weightSizeMb: number;
  fieldAccuracies: Record<string, number>; // Accuracy broken down by field key
  checksum: string; // Cryptographic integrity checksum
  regressionChecked: boolean;
}

export class OCRModelVersionRegistry {
  private static STORAGE_KEY_REGISTRY = "pumpai_ocr_model_registry";
  
  // Default embedded model profile configured out-of-the-box
  private static DEFAULT_MODEL: ModelWeightConfig = {
    version: "v1.0.0",
    releasedAt: 1779430000000,
    accuracyScore: 92.1,
    modelType: "TESSERACT_FINETUNE",
    status: "ACTIVE",
    weightSizeMb: 42.8,
    fieldAccuracies: {
      nozzle_1_open: 93.5,
      nozzle_1_close: 93.2,
      nozzle_1_test: 91.0,
      credit_sales_amt: 90.8,
      credit_customer_name: 89.2
    },
    checksum: "A5F3E1C87D92B9E40E5A1C8E3F1A9D0C8F2E4A6B7C8D9E0A1B2C3D4E5F6A7B8C",
    regressionChecked: true
  };

  /**
   * Loads all registered model weights and configurations
   */
  public static getModels(): ModelWeightConfig[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_REGISTRY);
      if (!data) {
        // Initialize with default standard model
        const list = [this.DEFAULT_MODEL];
        localStorage.setItem(this.STORAGE_KEY_REGISTRY, JSON.stringify(list));
        return list;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load model registry logs", e);
      return [this.DEFAULT_MODEL];
    }
  }

  /**
   * Fetches the currently active model configuration for production processing
   */
  public static getActiveModel(): ModelWeightConfig {
    const list = this.getModels();
    const active = list.find((m) => m.status === "ACTIVE");
    return active || this.DEFAULT_MODEL;
  }

  /**
   * Registers a newly compiled fine-tuned weights configuration model
   */
  public static registerModel(config: Omit<ModelWeightConfig, "status" | "regressionChecked">): ModelWeightConfig {
    const list = this.getModels();
    
    // Check for duplicate version tag
    if (list.some((m) => m.version === config.version)) {
      throw new Error(`Model version ${config.version} is already registered in active channels.`);
    }

    // Validate semantic version format (vMAJOR.MINOR.PATCH)
    const semVerRegex = /^v\d+\.\d+\.\d+$/;
    if (!semVerRegex.test(config.version)) {
      throw new Error(`Invalid semantic version syntax: ${config.version}. Must match 'vX.Y.Z'.`);
    }

    const newConfig: ModelWeightConfig = {
      ...config,
      status: "STAGING", // Initial deployment bound to staging verification
      regressionChecked: false
    };

    list.push(newConfig);
    localStorage.setItem(this.STORAGE_KEY_REGISTRY, JSON.stringify(list));
    return newConfig;
  }

  /**
   * Promotes a staging model version to active status and automatically deprecates preceding models
   */
  public static promoteToActive(version: string): void {
    const list = this.getModels();
    const target = list.find((m) => m.version === version);

    if (!target) {
      throw new Error(`Target model version ${version} not found in registry.`);
    }

    // Ensure model has completed verification tests
    if (!target.regressionChecked) {
      this.evaluateRegressionChecks(target);
    }

    // Check if promoting this model would regress overall layout accuracy relative to active baseline
    const activeBaseline = this.getActiveModel();
    if (target.accuracyScore < activeBaseline.accuracyScore - 2.5) {
      throw new Error(
        `Promotion BLOCKED. Version ${version} overall accuracy (${target.accuracyScore}%) ` +
        `represents severe regression relative to active baseline (${activeBaseline.accuracyScore}%).`
      );
    }

    // Update statuses across registry
    list.forEach((m) => {
      if (m.version === version) {
        m.status = "ACTIVE";
        m.regressionChecked = true;
      } else if (m.status === "ACTIVE") {
        m.status = "DEPRECATED";
      }
    });

    localStorage.setItem(this.STORAGE_KEY_REGISTRY, JSON.stringify(list));
  }

  /**
   * Initiates instant rollback to a target stable historical version in the event of anomalies
   */
  public static rollbackModel(activeVersion: string, rollbackTargetVersion: string): void {
    const list = this.getModels();
    const active = list.find((m) => m.version === activeVersion);
    const target = list.find((m) => m.version === rollbackTargetVersion);

    if (!active || !target) {
      throw new Error("Specified active model or rollback target version is missing from database.");
    }

    list.forEach((m) => {
      if (m.version === activeVersion) {
        m.status = "ROLLED_BACK";
      } else if (m.version === rollbackTargetVersion) {
        m.status = "ACTIVE";
      }
    });

    localStorage.setItem(this.STORAGE_KEY_REGISTRY, JSON.stringify(list));
  }

  /**
   * Analyzes structural regressions on layout-tier fields
   */
  public static evaluateRegressionChecks(config: ModelWeightConfig): void {
    const activeBaseline = this.getActiveModel();
    config.regressionChecked = true;

    // Iterate fields to catch specific domain drift
    const errorsList: string[] = [];
    Object.keys(activeBaseline.fieldAccuracies).forEach((field) => {
      const targetAcc = config.fieldAccuracies[field] || 0;
      const baselineAcc = activeBaseline.fieldAccuracies[field];

      if (targetAcc < baselineAcc - 5.0) {
        errorsList.push(
          `Field '${field}' accuracy regressed from baseline ${baselineAcc}% to ${targetAcc}%.`
        );
      }
    });

    if (errorsList.length > 0) {
      console.warn(`[REGRESSION WARNING] Version ${config.version} anomalies:`, errorsList);
    }
  }
}
