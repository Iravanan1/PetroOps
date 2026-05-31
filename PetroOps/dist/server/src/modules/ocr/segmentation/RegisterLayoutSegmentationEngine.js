"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterLayoutSegmentationEngine = void 0;
const TableStructureDetector_1 = require("./TableStructureDetector");
const HandwritingIsolationEngine_1 = require("./HandwritingIsolationEngine");
const NozzleRegionDetector_1 = require("./NozzleRegionDetector");
const SettlementRegionDetector_1 = require("./SettlementRegionDetector");
class RegisterLayoutSegmentationEngine {
    /**
     * Primary entry point for intelligent segmentation prior to OCR execution.
     */
    static segmentRegisterImage(imageBlobData, imageWidth, imageHeight, skewAngle = 0) {
        console.log(`[RegisterLayoutSegmentationEngine] Commencing spatial segmentation on image (W:${imageWidth}, H:${imageHeight}, Skew:${skewAngle})`);
        // 1. Detect core tabular grid structures
        const tableGrids = TableStructureDetector_1.TableStructureDetector.detectGrid(imageBlobData, skewAngle);
        // 2. Isolate cursive/free-form handwriting logic
        const handwritingBlobs = HandwritingIsolationEngine_1.HandwritingIsolationEngine.isolateHandwritingMask(imageBlobData);
        // 3. Pinpoint absolute regions
        const nozzleBlock = NozzleRegionDetector_1.NozzleRegionDetector.locateNozzleBlock(tableGrids);
        const settlementBlock = SettlementRegionDetector_1.SettlementRegionDetector.locateSettlementBlock(handwritingBlobs, imageHeight);
        return {
            nozzleBlock,
            settlementBlock,
            rawTableGrids: tableGrids,
            rawHandwritingBlobs: handwritingBlobs
        };
    }
}
exports.RegisterLayoutSegmentationEngine = RegisterLayoutSegmentationEngine;
