"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementRegionDetector = void 0;
class SettlementRegionDetector {
    /**
     * Identifies the bounding area specific to the settlement section.
     */
    static locateSettlementBlock(handwritingBlobs, imageHeight) {
        // The settlement block is usually situated in the lower half of the register.
        // We isolate blobs in the bottom 60% of the page.
        const cutoffY = imageHeight * 0.40;
        const settlementBlobs = handwritingBlobs.filter(b => b.y > cutoffY);
        if (settlementBlobs.length === 0) {
            // Default fallback if no blobs detected
            return { x: 10, y: cutoffY, w: 800, h: imageHeight - cutoffY };
        }
        let minX = 9999, minY = 9999, maxX = 0, maxY = 0;
        settlementBlobs.forEach(b => {
            if (b.x < minX)
                minX = b.x;
            if (b.y < minY)
                minY = b.y;
            if (b.x + b.w > maxX)
                maxX = b.x + b.w;
            if (b.y + b.h > maxY)
                maxY = b.y + b.h;
        });
        // Add padding
        return {
            x: Math.max(0, minX - 20),
            y: Math.max(0, minY - 20),
            w: maxX - minX + 40,
            h: maxY - minY + 40
        };
    }
}
exports.SettlementRegionDetector = SettlementRegionDetector;
