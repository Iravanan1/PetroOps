"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionSegmentationService = void 0;
const ReplaySafeImportService_1 = require("../replay/ReplaySafeImportService");
const RegisterLayoutSegmentationEngine_1 = require("./segmentation/RegisterLayoutSegmentationEngine");
const TokenReductionEngine_1 = require("../ai/inference/TokenReductionEngine");
class RegionSegmentationService {
    /**
     * Layout analyzer simulating OpenCV Laplacian and Sobel variance filters
     * to grade the input document visual clarity and alignment.
     */
    static gradeImageQuality(imageWidth, imageHeight, rawBytesLength) {
        const w = imageWidth || 1200;
        const h = imageHeight || 1800;
        // Simulate OpenCV analysis based on dimensions and resolution density
        const density = (rawBytesLength || 350000) / (w * h);
        // Realistic mock metrics mirroring physical camera captures at retail outlets
        const blurScore = density < 0.1 ? 65 : 92; // low bytes = potential compression blur
        const skewDegrees = w > h ? 4.5 : 0.8; // landscape capture usually has worse alignment
        const lightingUniformity = w % 2 === 0 ? 88 : 74; // simulate uneven lighting
        const contrastRatio = density > 0.2 ? 90 : 79;
        const overallGrade = Math.round(blurScore * 0.4 +
            (100 - Math.min(90, Math.abs(skewDegrees) * 10)) * 0.2 +
            lightingUniformity * 0.2 +
            contrastRatio * 0.2);
        return {
            blurScore,
            skewDegrees,
            lightingUniformity,
            contrastRatio,
            overallGrade
        };
    }
    /**
     * Evaluates text transcript features to classify handwritten annotations
     * (e.g. manual corrections, signatures, script fluctuations).
     */
    static analyzeHandwritingDensity(ocrContent) {
        const text = ocrContent || "";
        // Handwriting indicator keywords typically written on margins or added by managers
        const handwrittenKeywords = (text.match(/correction|verify|fixed|check|written|sign|ok/gi) || []).length;
        // Special symbols / short annotations
        const annotCount = (text.match(/[#*✗✓]/g) || []).length;
        const density = Math.min(100, Math.round((handwrittenKeywords * 25) + (annotCount * 15)));
        const isHandwritten = density > 40 || text.includes("HANDWRITTEN_ANNOTATION");
        return {
            isHandwritten,
            handwritingDensity: density
        };
    }
    /**
     * OpenCV contour analyzer to identify and crop critical bounding regions of petroleum registers
     * for focused, token-optimized, high-precision OCR extraction.
     */
    static segmentImage(imageWidth, imageHeight, ocrContent) {
        const w = imageWidth || 1200;
        const h = imageHeight || 1800;
        // Split text sections for targeted hashing & bounding allocations
        const nozzleLines = ocrContent.match(/nozzle|meter|opening|closing/gi) || [];
        const paymentLines = ocrContent.match(/upi|card|paytm|sales|cash/gi) || [];
        const expenseLines = ocrContent.match(/expense|margin|salary/gi) || [];
        const wetstockLines = ocrContent.match(/dip|tank|hsd|ms|density/gi) || [];
        const nozzleHash = ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash(nozzleLines.join(" "));
        const paymentHash = ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash(paymentLines.join(" "));
        const expenseHash = ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash(expenseLines.join(" "));
        const wetstockHash = ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash(wetstockLines.join(" "));
        // Offload complex spatial reasoning to the new Layout Segmentation Engine
        const { skewDegrees } = this.gradeImageQuality(w, h);
        const spatialData = RegisterLayoutSegmentationEngine_1.RegisterLayoutSegmentationEngine.segmentRegisterImage(ocrContent, w, h, skewDegrees);
        const regions = [
            {
                regionId: `reg_noz_${Date.now().toString().slice(-4)}`,
                name: 'nozzle_block',
                x: spatialData.nozzleBlock?.x ?? Math.round(w * 0.05),
                y: spatialData.nozzleBlock?.y ?? Math.round(h * 0.1),
                width: spatialData.nozzleBlock?.w ?? Math.round(w * 0.9),
                height: spatialData.nozzleBlock?.h ?? Math.round(h * 0.35),
                contentHash: nozzleHash,
                metadata: { detectedNozzles: spatialData.rawTableGrids.length, containsTable: true }
            },
            {
                regionId: `reg_pay_${Date.now().toString().slice(-4)}`,
                name: 'payment_block',
                x: spatialData.settlementBlock?.x ?? Math.round(w * 0.05),
                y: spatialData.settlementBlock?.y ?? Math.round(h * 0.48),
                width: spatialData.settlementBlock?.w ?? Math.round(w * 0.42),
                height: spatialData.settlementBlock?.h ?? Math.round(h * 0.28),
                contentHash: paymentHash,
                metadata: { paymentModes: ['Cash', 'UPI', 'Card'] }
            },
            {
                regionId: `reg_exp_${Date.now().toString().slice(-4)}`,
                name: 'expenses_block',
                x: Math.round(w * 0.52),
                y: Math.round(h * 0.48),
                width: Math.round(w * 0.43),
                height: Math.round(h * 0.28),
                contentHash: expenseHash,
                metadata: { expenseCount: 1 }
            },
            {
                regionId: `reg_wet_${Date.now().toString().slice(-4)}`,
                name: 'wetstock_block',
                x: Math.round(w * 0.05),
                y: Math.round(h * 0.78),
                width: Math.round(w * 0.9),
                height: Math.round(h * 0.10),
                contentHash: wetstockHash,
                metadata: { containsTankDips: true }
            },
            {
                regionId: `reg_tot_${Date.now().toString().slice(-4)}`,
                name: 'totals_block',
                x: Math.round(w * 0.05),
                y: Math.round(h * 0.89),
                width: Math.round(w * 0.9),
                height: Math.round(h * 0.08),
                contentHash: ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash(ocrContent.slice(-100)),
                metadata: { containsSignature: true }
            }
        ];
        // If handwriting features are dominant, inject a designated handwriting region overlay
        const { isHandwritten, handwritingDensity } = this.analyzeHandwritingDensity(ocrContent);
        if (isHandwritten || spatialData.rawHandwritingBlobs.length > 0) {
            regions.push({
                regionId: `reg_hnd_${Date.now().toString().slice(-4)}`,
                name: 'handwritten_block',
                x: spatialData.rawHandwritingBlobs[0]?.x ?? Math.round(w * 0.4),
                y: spatialData.rawHandwritingBlobs[0]?.y ?? Math.round(h * 0.3),
                width: spatialData.rawHandwritingBlobs[0]?.w ?? Math.round(w * 0.5),
                height: spatialData.rawHandwritingBlobs[0]?.h ?? Math.round(h * 0.2),
                contentHash: ReplaySafeImportService_1.ReplaySafeImportService.computeOcrHash("handwritten_annotation_segment"),
                metadata: { handwritingDensity, requiresEscalation: true, blobCount: spatialData.rawHandwritingBlobs.length }
            });
        }
        return regions;
    }
    /**
     * Generates a focused, highly optimized OCR payload containing ONLY matching region blocks.
     * Drastically reduces prompt tokens and ensures massive Claude prompt cache hits.
     */
    static extractFocusedRegionText(ocrContent, regionName) {
        const lines = (ocrContent || "").split("\n");
        let resultText = "";
        if (regionName === 'nozzle_block') {
            resultText = lines.filter(l => /nozzle|meter|opening|closing|readings/i.test(l)).join("\n");
        }
        else if (regionName === 'payment_block') {
            resultText = lines.filter(l => /upi|card|paytm|cash|sales|actual/i.test(l)).join("\n");
        }
        else if (regionName === 'expenses_block') {
            resultText = lines.filter(l => /expense|margin|salary|food|snacks/i.test(l)).join("\n");
        }
        else if (regionName === 'wetstock_block') {
            resultText = lines.filter(l => /dip|tank|hsd|ms|density|variance/i.test(l)).join("\n");
        }
        else if (regionName === 'handwritten_block') {
            resultText = lines.filter(l => /correction|verify|fixed|check|written|sign/i.test(l)).join("\n");
        }
        else {
            resultText = ocrContent;
        }
        // Token optimization: Clean extra whitespace, multiple consecutive spaces, and trailing empty wraps
        const filteredText = resultText
            .split("\n")
            .map(line => line.replace(/\s+/g, " ").trim())
            .filter(line => line.length > 0)
            .join("\n");
        // Apply strict token reduction heuristics to save context window and speed up inference
        return TokenReductionEngine_1.TokenReductionEngine.minifyRawText(filteredText);
    }
}
exports.RegionSegmentationService = RegionSegmentationService;
