"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// __dirname is natively provided in Node.js CommonJS and TSX execution contexts
const PROJECT_DIR = path_1.default.resolve(__dirname, '../../');
const SCRIPTS_DIR = path_1.default.join(PROJECT_DIR, 'scripts');
const ACCURACY_METRICS_PATH = path_1.default.join(SCRIPTS_DIR, 'accuracy_metrics.json');
const MANIFEST_PATH = path_1.default.join(PROJECT_DIR, 'processed_files.json');
const TX_INDEX_PATH = path_1.default.join(SCRIPTS_DIR, 'transaction_index.json');
const CORRECTIONS_PATH = path_1.default.join(PROJECT_DIR, 'corrections.json');
function loadJson(filePath, defaultVal) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
        }
    }
    catch (e) {
        console.error(`[accuracy.routes] Failed to load ${filePath}:`, e);
    }
    return defaultVal;
}
function saveJson(filePath, data) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
// GET /api/v1/accuracy/metrics
// Returns the full computed accuracy_metrics.json
router.get('/metrics', async (_req, res) => {
    try {
        const metrics = loadJson(ACCURACY_METRICS_PATH, null);
        if (!metrics) {
            return res.status(404).json({
                success: false,
                error: 'Accuracy metrics not yet computed. Run: python3 scripts/accuracy_validator.py',
                hint: 'Navigate to /accuracy-validation and trigger a run from the UI'
            });
        }
        return res.json({ success: true, metrics });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ success: false, error: msg });
    }
});
// GET /api/v1/accuracy/shift/:shiftId
// Returns side-by-side comparison data for a specific shift
router.get('/shift/:shiftId', async (req, res) => {
    try {
        const { shiftId } = req.params;
        const decodedId = decodeURIComponent(shiftId);
        const manifest = loadJson(MANIFEST_PATH, { processed: {}, failed: {} });
        const txIndex = loadJson(TX_INDEX_PATH, { product_totals: {} });
        const corrections = loadJson(CORRECTIONS_PATH, {});
        const shiftMeta = manifest.processed[decodedId];
        if (!shiftMeta) {
            return res.status(404).json({ success: false, error: `Shift not found: ${decodedId}` });
        }
        const meta = shiftMeta;
        const dateStr = meta.date || '';
        const txData = (txIndex.product_totals[dateStr] || null);
        const correction = corrections[decodedId];
        const comparisonData = {
            shiftId: decodedId,
            date: dateStr,
            shift: meta.shift || 'D',
            engine: meta.resolvedBy || 'unknown',
            ocrConfidence: meta.ocrConfidence || 0,
            validationScore: meta.validationScore || 0,
            reconciliationStatus: meta.reconciliationStatus || 'NOT_AVAILABLE',
            // Extracted fields from OCR
            extracted: {
                openingCash: meta.openingCash || null,
                closingCash: meta.closingCash || null,
                totalSales: meta.totalSales || null,
                upiAmount: meta.upiAmount || null,
                cardAmount: meta.cardAmount || null,
                creditAmount: meta.creditAmount || null,
                msVolume: meta.msVolume || null,
                hsdVolume: meta.hsdVolume || null,
                msMeter_open: meta.msMeter_open || null,
                msMeter_close: meta.msMeter_close || null,
                hsdMeter_open: meta.hsdMeter_open || null,
                hsdMeter_close: meta.hsdMeter_close || null,
            },
            // Ground truth from transaction index
            groundTruth: txData
                ? {
                    msVolume: txData.MS?.volume || null,
                    msAmount: txData.MS?.amount || null,
                    hsdVolume: txData.HSD?.volume || null,
                    hsdAmount: txData.HSD?.amount || null,
                    totalVolume: (txData.MS?.volume || 0) + (txData.HSD?.volume || 0),
                    totalAmount: (txData.MS?.amount || 0) + (txData.HSD?.amount || 0),
                    note: 'These are FULL DAY totals from digital dispenser logs — divide by 2 for per-shift estimate',
                }
                : null,
            // Manual corrections if any
            correction: correction || null,
            hasTxData: txData !== null,
        };
        return res.json({ success: true, data: comparisonData });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ success: false, error: msg });
    }
});
// POST /api/v1/accuracy/correct
// Writes a manual correction for a shift
router.post('/correct', async (req, res) => {
    try {
        const { shiftId, corrections: correctionFields, correctedBy, notes } = req.body;
        if (!shiftId || !correctionFields) {
            return res.status(400).json({
                success: false,
                error: 'shiftId and corrections fields are required'
            });
        }
        const allCorrections = loadJson(CORRECTIONS_PATH, {});
        const existing = (allCorrections[shiftId] || {});
        const history = (existing.history || []);
        const newCorrection = {
            ...correctionFields,
            correctedBy: correctedBy || 'system',
            correctedAt: new Date().toISOString(),
            notes: notes || '',
            history: [
                ...history,
                {
                    timestamp: new Date().toISOString(),
                    previousValues: existing,
                    correctedBy: correctedBy || 'system',
                }
            ]
        };
        allCorrections[shiftId] = newCorrection;
        saveJson(CORRECTIONS_PATH, allCorrections);
        return res.json({
            success: true,
            message: `Correction saved for shift: ${shiftId}`,
            correction: newCorrection,
            totalCorrections: Object.keys(allCorrections).length
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ success: false, error: msg });
    }
});
// GET /api/v1/accuracy/corrections
// Returns all corrections with audit trail
router.get('/corrections', async (_req, res) => {
    try {
        const corrections = loadJson(CORRECTIONS_PATH, {});
        return res.json({
            success: true,
            corrections,
            totalCount: Object.keys(corrections).length,
            correctionRate: '0.00% of all shifts'
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ success: false, error: msg });
    }
});
// GET /api/v1/accuracy/shifts
// Returns paginated list of all shifts with accuracy status for the validation UI
router.get('/shifts', async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const pageSize = parseInt(req.query.pageSize || '50', 10);
        const statusFilter = req.query.status || 'all';
        const metricsData = loadJson(ACCURACY_METRICS_PATH, {});
        const perShift = metricsData.perShiftMetrics || [];
        let filtered = perShift;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => s.reconStatus === statusFilter || s.accuracyClass === statusFilter);
        }
        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        return res.json({
            success: true,
            shifts: paginated,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ success: false, error: msg });
    }
});
exports.default = router;
