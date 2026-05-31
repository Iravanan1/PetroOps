"use strict";
/**
 * accounting.routes.ts
 * Express router exposing endpoints for backend ledger calculations,
 * in-memory replay verifications, HMAC snapshot creations, and calendar locks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BackendReplayAuthority_1 = require("../services/BackendReplayAuthority");
const BackendSnapshotEngine_1 = require("../services/BackendSnapshotEngine");
const BackendLedgerLockService_1 = require("../services/BackendLedgerLockService");
const AccountingValidationGateway_1 = require("../services/AccountingValidationGateway");
const router = (0, express_1.Router)();
/**
 * Replays transaction journals from genesis, returning reconstructed balance and hashes.
 */
router.post("/replay", (req, res) => {
    try {
        const { tenantId, transactions, clientAssertedBalance, clientAssertedHash } = req.body;
        if (!tenantId || !Array.isArray(transactions)) {
            res.status(400).json({
                status: "REJECTED",
                error: "Missing tenantId identifier or invalid transactions log list."
            });
            return;
        }
        const replayResult = BackendReplayAuthority_1.BackendReplayAuthority.replayTenantLedger(tenantId, transactions, clientAssertedBalance, clientAssertedHash);
        res.status(200).json({
            status: "SUCCESS",
            replayResult
        });
    }
    catch (e) {
        res.status(500).json({
            status: "ERROR",
            error: `Failed to execute replay reduction stream: ${e.message}`
        });
    }
});
/**
 * Packs replayed ledger states into a secure HMAC-SHA256 signed snapshot block.
 */
router.post("/snapshot", (req, res) => {
    try {
        const { tenantId, transactions, upToTimestamp } = req.body;
        if (!tenantId || !Array.isArray(transactions) || !upToTimestamp) {
            res.status(400).json({
                status: "REJECTED",
                error: "Required parameters: tenantId, transactions list, upToTimestamp boundary."
            });
            return;
        }
        // 1. Replay current stream state to get verified final parameters
        const replayResult = BackendReplayAuthority_1.BackendReplayAuthority.replayTenantLedger(tenantId, transactions);
        if (replayResult.tamperedSequenceIndices.length > 0) {
            res.status(400).json({
                status: "REJECTED",
                error: `Snapshot compilation BLOCKED: Chain sequence contains corruption at indices: ${replayResult.tamperedSequenceIndices.join(", ")}`
            });
            return;
        }
        // 2. Generate cryptographically signed snapshot
        const snapshot = BackendSnapshotEngine_1.BackendSnapshotEngine.compileSnapshot(replayResult, upToTimestamp);
        res.status(200).json({
            status: "SUCCESS",
            snapshot
        });
    }
    catch (e) {
        res.status(500).json({
            status: "ERROR",
            error: `Failed to compile signed ledger snapshot: ${e.message}`
        });
    }
});
/**
 * Validates snapshot integrity using HMAC signature matching.
 */
router.post("/verify-snapshot", (req, res) => {
    try {
        const { snapshot } = req.body;
        if (!snapshot || !snapshot.hmacSignature) {
            res.status(400).json({
                status: "REJECTED",
                error: "Missing snapshot data or signature key."
            });
            return;
        }
        const isValid = BackendSnapshotEngine_1.BackendSnapshotEngine.verifySnapshotSignature(snapshot);
        res.status(200).json({
            status: "SUCCESS",
            isValid,
            msg: isValid
                ? "Snapshot signature verified. Authenticity assured."
                : "Alert: Snapshot signature mismatch! Data was manually modified outside system boundaries."
        });
    }
    catch (e) {
        res.status(500).json({
            status: "ERROR",
            error: `Failed to verify snapshot signature: ${e.message}`
        });
    }
});
/**
 * Registers a closed calendar range lock for a tenant.
 */
router.post("/lock", (req, res) => {
    try {
        const { periodId, tenantId, startDate, endDate, sealedBy, signature } = req.body;
        if (!periodId || !tenantId || !startDate || !endDate || !sealedBy || !signature) {
            res.status(400).json({
                status: "REJECTED",
                error: "All fields are required to lock period: periodId, tenantId, startDate, endDate, sealedBy, signature."
            });
            return;
        }
        BackendLedgerLockService_1.BackendLedgerLockService.registerLock({
            periodId,
            tenantId,
            startDate,
            endDate,
            isClosed: true,
            sealedBy,
            signature
        });
        res.status(200).json({
            status: "SUCCESS",
            msg: `Fiscal period ${periodId} is now locked in database bounds.`
        });
    }
    catch (e) {
        res.status(500).json({
            status: "ERROR",
            error: e.message
        });
    }
});
/**
 * Auditor unlock override route utilizing private password validation.
 */
router.post("/unlock", (req, res) => {
    try {
        const { tenantId, periodId, auditorId, overrideKey } = req.body;
        if (!tenantId || !periodId || !auditorId || !overrideKey) {
            res.status(400).json({
                status: "REJECTED",
                error: "Required parameters: tenantId, periodId, auditorId, overrideKey."
            });
            return;
        }
        const result = BackendLedgerLockService_1.BackendLedgerLockService.executeAuditorUnlock(tenantId, periodId, {
            auditorId,
            overrideKey
        });
        res.status(200).json({
            status: "SUCCESS",
            unlocked: result,
            msg: `Fiscal period ${periodId} successfully unlocked under double-signature override credentials.`
        });
    }
    catch (e) {
        res.status(403).json({
            status: "REJECTED",
            error: e.message
        });
    }
});
/**
 * Gets all active lock mappings.
 */
router.get("/locks", (req, res) => {
    try {
        const locks = BackendLedgerLockService_1.BackendLedgerLockService.getAllLocks();
        res.status(200).json({
            status: "SUCCESS",
            locks
        });
    }
    catch (e) {
        res.status(500).json({
            status: "ERROR",
            error: e.message
        });
    }
});
/**
 * Simulator test route showcasing the AccountingValidationGateway middleware action.
 */
router.post("/simulate-transaction", AccountingValidationGateway_1.AccountingValidationGateway.validateTransactionRequest, (req, res) => {
    res.status(200).json({
        status: "SUCCESS",
        msg: "Pre-Transit Gateway validation completed successfully. Entry committed to transaction sequence."
    });
});
exports.default = router;
