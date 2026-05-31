import { TableStructureDetector, BoundingBox } from './TableStructureDetector';
import { HandwritingIsolationEngine } from './HandwritingIsolationEngine';
import { NozzleRegionDetector } from './NozzleRegionDetector';
import { SettlementRegionDetector } from './SettlementRegionDetector';

export interface LayoutRegions {
  nozzleBlock: BoundingBox | null;
  settlementBlock: BoundingBox | null;
  rawTableGrids: BoundingBox[];
  rawHandwritingBlobs: BoundingBox[];
}

export class RegisterLayoutSegmentationEngine {
  
  /**
   * Primary entry point for intelligent segmentation prior to OCR execution.
   */
  public static segmentRegisterImage(imageBlobData: string, imageWidth: number, imageHeight: number, skewAngle: number = 0): LayoutRegions {
    console.log(`[RegisterLayoutSegmentationEngine] Commencing spatial segmentation on image (W:${imageWidth}, H:${imageHeight}, Skew:${skewAngle})`);

    // 1. Detect core tabular grid structures
    const tableGrids = TableStructureDetector.detectGrid(imageBlobData, skewAngle);
    
    // 2. Isolate cursive/free-form handwriting logic
    const handwritingBlobs = HandwritingIsolationEngine.isolateHandwritingMask(imageBlobData);

    // 3. Pinpoint absolute regions
    const nozzleBlock = NozzleRegionDetector.locateNozzleBlock(tableGrids);
    const settlementBlock = SettlementRegionDetector.locateSettlementBlock(handwritingBlobs, imageHeight);

    return {
      nozzleBlock,
      settlementBlock,
      rawTableGrids: tableGrids,
      rawHandwritingBlobs: handwritingBlobs
    };
  }
}
