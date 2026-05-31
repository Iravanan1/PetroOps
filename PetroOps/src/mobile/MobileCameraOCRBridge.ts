/**
 * MobileCameraOCRBridge.ts
 * Integrates client camera triggers, implements perspective resizing,
 * noise filters, and compresses image buffers to optimize OCR uploads.
 */

export interface CapturedImageDetails {
  base64Data: string;
  byteSize: number;
  width: number;
  height: number;
}

export class MobileCameraOCRBridge {
  /**
   * Processes a raw HTML file/image element, applies compression, and returns optimized outputs
   */
  public static async optimizeImageForOCR(
    file: File,
    maxDimension: number = 1024,
    quality: number = 0.75
  ): Promise<CapturedImageDetails> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          // 1. Calculate optimized dimensions while preserving aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // 2. Render to canvas to apply filters and compression
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas 2D context instantiation failed."));
            return;
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Apply contrast/greyscale optimization filters to enhance text clarity for VLM/OCR
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // Standard luminance conversion
            const grey = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Simple threshold filter to increase contrast
            const contrast = grey > 120 ? Math.min(255, grey * 1.1) : grey * 0.9;

            data[i] = contrast;
            data[i+1] = contrast;
            data[i+2] = contrast;
          }

          ctx.putImageData(imgData, 0, 0);

          // 3. Compress output to Jpeg format
          const base64Data = canvas.toDataURL("image/jpeg", quality);
          
          // Estimate byte size from base64 string
          const stringLength = base64Data.length - "data:image/jpeg;base64,".length;
          const byteSize = Math.round(stringLength * (3/4));

          resolve({
            base64Data,
            byteSize,
            width,
            height
          });
        };

        img.onerror = (err) => reject(err);
      };

      reader.onerror = (err) => reject(err);
    });
  }
}
