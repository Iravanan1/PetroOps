"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewQueueRoute = void 0;
const express_1 = __importDefault(require("express"));
const db_js_1 = require("../utils/db.js");
const firestore_1 = require("firebase/firestore");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
exports.reviewQueueRoute = express_1.default.Router();
// GET all needs_review or approved shifts for listing
exports.reviewQueueRoute.get("/queue", (0, auth_middleware_js_1.authMiddleware)(['operator', 'manager', 'owner', 'super_admin']), async (req, res) => {
    try {
        let q = (0, firestore_1.query)((0, firestore_1.collection)(db_js_1.db, "shifts"));
        if (req.user?.role === 'manager' && req.user?.pumpId) {
            q = (0, firestore_1.query)((0, firestore_1.collection)(db_js_1.db, "shifts"), (0, firestore_1.where)("pumpId", "==", req.user.pumpId));
        }
        const snapshot = await (0, firestore_1.getDocs)(q);
        const shifts = [];
        for (const d of snapshot.docs) {
            const shift = { id: d.id, ...d.data(), anomalies: [], readings: [] };
            try {
                const anomaliesSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(db_js_1.db, "shifts", d.id, "anomalies"));
                shift.anomalies = anomaliesSnap.docs.map(ad => ({ id: ad.id, ...ad.data() }));
            }
            catch (e) {
                console.warn("Could not query subcollection anomalies for shift:", d.id);
            }
            try {
                const readingsSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(db_js_1.db, "shifts", d.id, "readings"));
                shift.readings = readingsSnap.docs.map(rd => ({ id: rd.id, ...rd.data() }));
            }
            catch (e) {
                console.warn("Could not query subcollection readings for shift:", d.id);
            }
            shifts.push(shift);
        }
        res.json({ data: shifts });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update & Approve with detailed adjustments
exports.reviewQueueRoute.patch("/:id/approve", (0, auth_middleware_js_1.authMiddleware)(['manager', 'owner', 'super_admin']), async (req, res) => {
    try {
        const shiftRef = (0, firestore_1.doc)(db_js_1.db, "shifts", req.params.id);
        const oldShiftSnap = await (0, firestore_1.getDoc)(shiftRef);
        if (!oldShiftSnap.exists()) {
            res.status(404).json({ error: "Shift not found" });
            return;
        }
        const oldData = oldShiftSnap.data();
        // Identify what changed
        const correctedData = req.body.correctedData || {};
        const changes = {};
        for (const key of Object.keys(correctedData)) {
            if (oldData[key] !== correctedData[key]) {
                changes[key] = { old: oldData[key], new: correctedData[key] };
            }
        }
        await (0, firestore_1.updateDoc)(shiftRef, {
            status: "APPROVED",
            ...correctedData,
            approvedBy: req.user?.uid || "demo-manager-id",
            approvedAt: new Date().toISOString()
        });
        // Detailed Enterprise Audit Logging
        try {
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(db_js_1.db, "auditLogs"), {
                action: "APPROVE_SHIFT_WITH_CORRECTIONS",
                entityId: req.params.id,
                userId: req.user?.uid || "demo-manager-id",
                userRole: req.user?.role || "manager",
                changesMade: changes,
                timestamp: new Date().toISOString()
            });
        }
        catch (auditErr) {
            console.warn("Audit logging failed:", auditErr);
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
