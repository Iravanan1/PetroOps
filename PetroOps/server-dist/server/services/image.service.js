"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const sharp_1 = __importDefault(require("sharp"));
class ImageService {
    /**
     * Enterprise Preprocessing Pipeline for OCR
     * Grayscale -> Denoise (blur) -> Thresholding / Contrast -> Linear Normalization
     */
    static async preprocessForOCR(inputBuffer) {
        try {
            // Use Sharp to process the image for better OCR accuracy
            const processedBuffer = await (0, sharp_1.default)(inputBuffer)
                .grayscale() // Convert to grayscale
                .normalize() // Normalize brightness
                .median(3) // Median filter to reduce noise while preserving edges
                .linear(1.5, -20) // Increase contrast significantly to make text pop against background
                .sharpen({
                sigma: 2,
                m1: 0.5,
                m2: 0.5,
                x1: 2,
                y2: 10,
                y3: 20
            })
                .jpeg({ quality: 100 })
                .toBuffer();
            return processedBuffer;
        }
        catch (error) {
            console.error("Image preprocessing failed", error);
            // Fallback to raw buffer if sharp fails
            return inputBuffer;
        }
    }
}
exports.ImageService = ImageService;
