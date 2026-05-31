import express, { Response } from "express";
import { db } from "../utils/db.js";
import { collection, query, where, getDocs, getDoc, updateDoc, doc, addDoc } from "firebase/firestore";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware.js";

export const reviewQueueRoute = express.Router();

// GET all needs_review or approved shifts for listing
reviewQueueRoute.get("/queue", authMiddleware(['operator', 'manager', 'owner', 'super_admin']), async (req: AuthRequest, res: Response) => {
  try {
    let q = query(collection(db, "shifts"));
    
    if (req.user?.role === 'manager' && req.user?.pumpId) {
      q = query(collection(db, "shifts"), where("pumpId", "==", req.user.pumpId));
    }

    const snapshot = await getDocs(q);
    const shifts: any[] = [];
    
    for (const d of snapshot.docs) {
      const shift = { id: d.id, ...d.data(), anomalies: [] as any[], readings: [] as any[] };
      try {
        const anomaliesSnap = await getDocs(collection(db, "shifts", d.id, "anomalies"));
        shift.anomalies = anomaliesSnap.docs.map(ad => ({ id: ad.id, ...ad.data() }));
      } catch (e) {
        console.warn("Could not query subcollection anomalies for shift:", d.id);
      }

      try {
        const readingsSnap = await getDocs(collection(db, "shifts", d.id, "readings"));
        shift.readings = readingsSnap.docs.map(rd => ({ id: rd.id, ...rd.data() }));
      } catch (e) {
        console.warn("Could not query subcollection readings for shift:", d.id);
      }

      shifts.push(shift);
    }
    
    res.json({ data: shifts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update & Approve with detailed adjustments
reviewQueueRoute.patch("/:id/approve", authMiddleware(['manager', 'owner', 'super_admin']), async (req: AuthRequest, res: Response) => {
  try {
    const shiftRef = doc(db, "shifts", req.params.id);
    const oldShiftSnap = await getDoc(shiftRef);
    if (!oldShiftSnap.exists()) {
       res.status(404).json({ error: "Shift not found" });
       return;
     }
    const oldData = oldShiftSnap.data();

    // Identify what changed
    const correctedData = req.body.correctedData || {};
    const changes: Record<string, { old: any, new: any }> = {};
    for (const key of Object.keys(correctedData)) {
      if (oldData[key] !== correctedData[key]) {
        changes[key] = { old: oldData[key], new: correctedData[key] };
      }
    }

    await updateDoc(shiftRef, {
      status: "APPROVED",
      ...correctedData,
      approvedBy: req.user?.uid || "demo-manager-id",
      approvedAt: new Date().toISOString()
    });

    // Detailed Enterprise Audit Logging
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "APPROVE_SHIFT_WITH_CORRECTIONS",
        entityId: req.params.id,
        userId: req.user?.uid || "demo-manager-id",
        userRole: req.user?.role || "manager",
        changesMade: changes,
        timestamp: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn("Audit logging failed:", auditErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
