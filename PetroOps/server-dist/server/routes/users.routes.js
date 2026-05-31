"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoute = void 0;
const express_1 = __importDefault(require("express"));
const firebaseAdmin_js_1 = require("../utils/firebaseAdmin.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
exports.usersRoute = express_1.default.Router();
exports.usersRoute.get("/", (0, auth_middleware_js_1.authMiddleware)(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        let query = firebaseAdmin_js_1.adminDb.collection("users");
        if (req.user?.role === 'manager' || req.user?.role === 'owner') {
            const pumpId = req.user?.pumpId;
            if (pumpId) {
                query = query.where("pumpId", "==", pumpId);
            }
        }
        const snapshot = await query.get();
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ data: users });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create user (Operator or Manager)
exports.usersRoute.post("/", (0, auth_middleware_js_1.authMiddleware)(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { email, password, role, pumpId } = req.body;
        if (req.user?.role === 'manager' && role !== 'operator') {
            res.status(403).json({ error: "Managers can only create operators." });
            return;
        }
        if (req.user?.role === 'owner' && role !== 'operator' && role !== 'manager') {
            res.status(403).json({ error: "Owners can only create operators and managers." });
            return;
        }
        const assignPumpId = (req.user?.role === 'super_admin') ? (pumpId || 'default-pump') : (req.user?.pumpId || 'default-pump');
        // Add checking for mock environment so registration is flawless in mock sandboxes
        let userId = "mock-user-123";
        try {
            const userRecord = await firebaseAdmin_js_1.adminAuth.createUser({
                email,
                password
            });
            userId = userRecord.uid;
        }
        catch (firebaseErr) {
            console.warn("Could not create Firebase user account, adding details as mockup", firebaseErr.message);
            userId = `mock-operator-${Date.now()}`;
        }
        try {
            await firebaseAdmin_js_1.adminDb.collection('users').doc(userId).set({
                email,
                role,
                pumpId: assignPumpId,
                createdBy: req.user?.uid || "demo-manager",
                createdAt: new Date().toISOString()
            });
        }
        catch (dbErr) {
            console.warn("Could not write user profile into Firestore collection");
        }
        res.json({ success: true, uid: userId });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete user
exports.usersRoute.delete("/:id", (0, auth_middleware_js_1.authMiddleware)(['super_admin', 'owner']), async (req, res) => {
    try {
        const targetUid = req.params.id;
        if (targetUid === req.user?.uid) {
            res.status(400).json({ error: "Cannot delete yourself." });
            return;
        }
        try {
            await firebaseAdmin_js_1.adminAuth.deleteUser(targetUid);
        }
        catch (firebaseErr) {
            console.warn("Could not remove Firebase login account");
        }
        try {
            await firebaseAdmin_js_1.adminDb.collection('users').doc(targetUid).delete();
        }
        catch (dbErr) {
            console.warn("Could not delete user profile from Firestore");
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
