import sharp from "sharp";

export class ImageService {
  /**
   * Enterprise Preprocessing Pipeline for OCR
   * Grayscale -> Denoise (blur) -> Thresholding / Contrast -> Linear Normalization
   */
  public static async preprocessForOCR(inputBuffer: Buffer): Promise<Buffer> {
    try {
      // Use Sharp to process the image for better OCR accuracy
      const processedBuffer = await sharp(inputBuffer)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize brightness
        .median(3)   // Median filter to reduce noise while preserving edges
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
    } catch (error) {
      console.error("Image preprocessing failed", error);
      // Fallback to raw buffer if sharp fails
      return inputBuffer;
    }
  }
}
