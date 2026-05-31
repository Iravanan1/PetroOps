"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierInvoiceService = void 0;
const genai_1 = require("@google/genai");
const retry_js_1 = require("../utils/retry.js");
const geminiApiKey = process.env.GEMINI_API_KEY || "demo-key";
const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey });
class SupplierInvoiceService {
    /**
     * Processes supplier delivery invoices and extracts details via LLM
     */
    static async parseInvoiceImage(imageBuffer, mimeType = "image/jpeg") {
        if (geminiApiKey === "demo-key") {
            console.log("SupplierInvoiceService in demo mode: returning mock delivery receipt structure");
            return {
                supplierName: "Indian Oil Corporation Ltd",
                invoiceNumber: "IOCL-MUM-77890",
                invoiceDate: new Date().toISOString().split('T')[0],
                gstin: "27AAACI1234F1Z8",
                fuelType: "HSD",
                quantityLitres: 12000,
                ratePerLitre: 89.50,
                cgstAmount: 96660,
                sgstAmount: 96660,
                totalInvoiceAmount: 1267320
            };
        }
        try {
            const response = await (0, retry_js_1.retryWithBackoff)(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    { text: "Analyze this fuel supplier invoice and extract: supplierName, invoiceNumber, invoiceDate, gstin, fuelType (HSD or MS), quantityLitres, ratePerLitre, cgstAmount, sgstAmount, totalInvoiceAmount. Return strictly JSON matching this structure." },
                    { inlineData: { data: imageBuffer.toString("base64"), mimeType } }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            }));
            const parsed = JSON.parse(response.text || "{}");
            return {
                supplierName: parsed.supplierName || "IOCL",
                invoiceNumber: parsed.invoiceNumber || "IOCL-TEMP",
                invoiceDate: parsed.invoiceDate || new Date().toISOString().split('T')[0],
                gstin: parsed.gstin,
                fuelType: parsed.fuelType === "MS" ? "MS" : "HSD",
                quantityLitres: Number(parsed.quantityLitres) || 0,
                ratePerLitre: Number(parsed.ratePerLitre) || 0,
                cgstAmount: Number(parsed.cgstAmount) || 0,
                sgstAmount: Number(parsed.sgstAmount) || 0,
                totalInvoiceAmount: Number(parsed.totalInvoiceAmount) || 0
            };
        }
        catch (err) {
            console.error("SupplierInvoiceService extraction failed:", err);
            throw new Error(`Invoice Parsing Pipeline failure: ${err.message}`);
        }
    }
}
exports.SupplierInvoiceService = SupplierInvoiceService;
