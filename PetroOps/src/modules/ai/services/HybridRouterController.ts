/**
 * HybridRouterController.ts
 * Automated Model Execution Router & Claude API Cost Optimization engine
 */

import { ImageHashCache } from '../cache/ImageHashCache';

export interface RouteResolution {
  routedTo: 'LOCAL_ENGINES' | 'CLAUDE_API';
  confidenceScore: number;
  tokensConsumed: {
    inputTokens: number;
    outputTokens: number;
  };
  estimatedCostUSD: number;
  reason: string;
  data: Record<string, any>;
  cached: boolean;
}

export interface ApiCostRecord {
  id: string;
  branchId: string;
  shiftId: string;
  operatorName: string;
  timestamp: string;
  routedTo: 'LOCAL_ENGINES' | 'CLAUDE_API';
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

export class HybridRouterController {
  private static MIN_THRESHOLD = 85.0; // 85% confidence
  private static CLAUDE_INPUT_COST_PER_MILLION = 15.0; // $15 per M tokens
  private static CLAUDE_OUTPUT_COST_PER_MILLION = 75.0; // $75 per M tokens

  /**
   * Tracks local api cost records for cost auditing dashboards
   */
  public static getCostLogs(): ApiCostRecord[] {
    try {
      const records = localStorage.getItem('pumpai_cost_logs');
      return records ? JSON.parse(records) : [];
    } catch {
      return [];
    }
  }

  /**
   * Appends an audit log for AI cost monitoring
   */
  private static logCost(
    branchId: string,
    shiftId: string,
    operatorName: string,
    routedTo: 'LOCAL_ENGINES' | 'CLAUDE_API',
    inputTokens: number,
    outputTokens: number,
    costUSD: number
  ): void {
    try {
      const logs = this.getCostLogs();
      const newRecord: ApiCostRecord = {
        id: `cst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        branchId,
        shiftId,
        operatorName,
        timestamp: new Date().toISOString(),
        routedTo,
        inputTokens,
        outputTokens,
        costUSD
      };
      logs.push(newRecord);
      localStorage.setItem('pumpai_cost_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('[HybridRouterController] Failed to write cost logs:', e);
    }
  }

  /**
   * Compresses instructions and layout segments to keep the prompt tokens footprint minimal
   */
  public static compressPrompt(
    templateId: string,
    segmentedRegionsCount: number
  ): string {
    // Strips redundant explanation instructions and leverages brief structural tokens
    return `SYS: OCR JSON extraction mapping. Template: ${templateId}. Segmented layout cells: ${segmentedRegionsCount}. Extract opening/closing numeric nozzle counters, cash payments, UPI digital settlements. Strict JSON key-values output only.`;
  }

  /**
   * Execution wrapper carrying an exponential backoff regulator for API robustness
   */
  public static async executeWithBackoff<T>(
    apiCall: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 1000
  ): Promise<T> {
    let currentDelay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`[HybridRouterController] Retry chain exhausted after ${attempt} attempts.`);
          throw error;
        }
        console.warn(`[HybridRouterController] API call failed on attempt ${attempt}. Retrying in ${currentDelay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2; // Exponential expansion
      }
    }
    throw new Error('API Execution aborted due to unhandled loop condition');
  }

  /**
   * Core routing decision controller
   * Processes through OpenCV + local PaddleOCR baseline, then evaluates if Claude escalation is required
   */
  public static async routeAndExtract(
    imageBase64: string,
    metadata: { branchId: string; shiftId: string; operatorName: string; templateId: string; hasHandwriting: boolean; isInventoryAnomalous: boolean }
  ): Promise<RouteResolution> {
    // 1. Check local image hash cache
    const imgHash = ImageHashCache.computeImageHash(imageBase64);
    const cachedResult = ImageHashCache.getCachedResult(imgHash);

    if (cachedResult) {
      return {
        routedTo: 'LOCAL_ENGINES',
        confidenceScore: cachedResult.confidenceScore,
        tokensConsumed: { inputTokens: 0, outputTokens: 0 },
        estimatedCostUSD: 0,
        reason: "Duplicate image SHA-256 hash matched in local cache store.",
        data: cachedResult.extractedData,
        cached: true
      };
    }

    // 2. Execute local segmentation and local OCR mock baseline simulation
    const localConfidence = metadata.hasHandwriting ? 74.5 : 88.2; 
    const mockLocalData = {
      openingNozzle: 12540.5,
      closingNozzle: 13120.2,
      expectedSalesLitres: 579.7,
      actualSalesLitres: 579.7,
      cashTillExpected: 52173,
      cashTillCounted: 52173,
      upiReceipts: 32000,
      cardReceipts: 18000,
      wetStockDipOpening: 4500,
      wetStockDipClosing: 3910
    };

    // Evaluate Routing Parameters
    const failsConfidenceThreshold = localConfidence < this.MIN_THRESHOLD;
    const requiresEscalation = failsConfidenceThreshold || metadata.hasHandwriting || metadata.isInventoryAnomalous;

    if (!requiresEscalation) {
      // Keep processing local! No external cost incurred.
      ImageHashCache.cacheResult(imgHash, metadata.templateId, localConfidence, mockLocalData);
      this.logCost(metadata.branchId, metadata.shiftId, metadata.operatorName, 'LOCAL_ENGINES', 0, 0, 0);

      return {
        routedTo: 'LOCAL_ENGINES',
        confidenceScore: localConfidence,
        tokensConsumed: { inputTokens: 0, outputTokens: 0 },
        estimatedCostUSD: 0,
        reason: "Baseline PaddleOCR confidence (88.2%) satisfies threshold. Escaped Claude routing.",
        data: mockLocalData,
        cached: false
      };
    }

    // 3. Escalate to Claude API with exponential backoff & prompt compression
    try {
      console.log(`[HybridRouterController] Escalating to Claude. Reason: ${
        metadata.hasHandwriting 
          ? 'Handwritten cells detected' 
          : metadata.isInventoryAnomalous 
            ? 'Inventory variance raised' 
            : 'PaddleOCR confidence failed threshold'
      }`);

      const compressedInstructions = this.compressPrompt(metadata.templateId, 8);
      
      // Simulate external API call payload through backoff wrapper
      const simulatedApiCall = async () => {
        // Yield minor latency representation
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          extracted: {
            ...mockLocalData,
            actualSalesLitres: mockLocalData.actualSalesLitres, // perfect parsing refinement by Claude
            confidentOcrFlag: true
          },
          inputTokens: 1450,
          outputTokens: 380
        };
      };

      const apiResult = await this.executeWithBackoff(simulatedApiCall);

      // Cost Calculation
      const inputCost = (apiResult.inputTokens / 1000000) * this.CLAUDE_INPUT_COST_PER_MILLION;
      const outputCost = (apiResult.outputTokens / 1000000) * this.CLAUDE_OUTPUT_COST_PER_MILLION;
      const totalCost = Number((inputCost + outputCost).toFixed(5));

      // Cache the resulting data to optimize future duplicate hits
      ImageHashCache.cacheResult(imgHash, metadata.templateId, 98.4, apiResult.extracted);
      this.logCost(metadata.branchId, metadata.shiftId, metadata.operatorName, 'CLAUDE_API', apiResult.inputTokens, apiResult.outputTokens, totalCost);

      return {
        routedTo: 'CLAUDE_API',
        confidenceScore: 98.4,
        tokensConsumed: { 
          inputTokens: apiResult.inputTokens, 
          outputTokens: apiResult.outputTokens 
        },
        estimatedCostUSD: totalCost,
        reason: `Escalated due to complex handwriting / low local confidence. Extracted accurately using Claude GDM parameters.`,
        data: apiResult.extracted,
        cached: false
      };
    } catch (e) {
      console.error('[HybridRouterController] Claude escalation failed, falling back to degraded local OCR:', e);
      return {
        routedTo: 'LOCAL_ENGINES',
        confidenceScore: localConfidence,
        tokensConsumed: { inputTokens: 0, outputTokens: 0 },
        estimatedCostUSD: 0,
        reason: "Claude escalation aborted due to network timeout. Restored to degraded local OCR.",
        data: mockLocalData,
        cached: false
      };
    }
  }
}
