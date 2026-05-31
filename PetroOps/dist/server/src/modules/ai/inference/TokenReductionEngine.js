"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenReductionEngine = void 0;
class TokenReductionEngine {
    /**
     * Cleans raw intermediate OCR text (like from Tesseract/EasyOCR fallback)
     * to strictly minimize token bloat before sending it to an LLM for structuring.
     *
     * - Removes repeated whitespaces
     * - Strips non-alphanumeric noise characters
     * - Collapses newlines
     */
    static minifyRawText(rawText) {
        if (!rawText)
            return "";
        console.log(`[TokenReduction] Original length: ${rawText.length} chars`);
        // 1. Remove strange special characters that aren't useful for petrol pump data
        let minified = rawText.replace(/[^\w\s.,₹/-]/g, "");
        // 2. Collapse multiple spaces into one
        minified = minified.replace(/ {2,}/g, " ");
        // 3. Collapse multiple newlines into a single pipe or newline
        minified = minified.replace(/\n+/g, "\n");
        // 4. Trim ends
        minified = minified.trim();
        console.log(`[TokenReduction] Minified length: ${minified.length} chars`);
        // Roughly estimate token savings (approx 4 chars per token)
        const tokenSavings = Math.round((rawText.length - minified.length) / 4);
        if (tokenSavings > 0) {
            console.log(`[TokenReduction] Saved approx ${tokenSavings} tokens from prompt context.`);
        }
        return minified;
    }
}
exports.TokenReductionEngine = TokenReductionEngine;
