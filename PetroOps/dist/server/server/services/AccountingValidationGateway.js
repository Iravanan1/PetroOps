"use strict";
/**
 * AccountingValidationGateway.ts
 * Express gateway middleware that audits and validates financial transaction payloads.
 * Protects database ingress from tenancy fraud, locked periods, and calculation tampering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingValidationGateway = void 0;
const BackendLedgerLockService_1 = require("./BackendLedgerLockService");
const FirestoreSecurityValidationEngine_1 = require("../../src/modules/security/services/FirestoreSecurityValidationEngine");
class AccountingValidationGateway {
    /**
     * Express middleware intercepting and auditing incoming ledger mutation payloads
     */
    static validateTransactionRequest(req, res, next) {
        try {
            const { tenantId, amount, type, accountHead, timestamp, previousHash } = req.body;
            // 1. Tenancy validation (Verify auth token header vs body tenant context)
            const tokenTenantId = req.headers["x-tenant-id"];
            if (!tokenTenantId) {
                res.status(401).json({
                    status: "REJECTED",
                    error: "Authentication Denied: Missing header tenancy signature ('x-tenant-id')."
                });
                return;
            }
            if (tenantId !== tokenTenantId) {
                res.status(403).json({
                    status: "REJECTED",
                    error: `Tenancy Violation: Payload context (${tenantId}) mismatch with token signature (${tokenTenantId}).`
                });
                return;
            }
            // 2. Pre-transit schema validations
            const schemaCheck = FirestoreSecurityValidationEngine_1.FirestoreSecurityValidationEngine.validateTransaction({ tenantId, amount, type, accountHead, timestamp, periodLocked: false }, tokenTenantId);
            if (!schemaCheck.isValid) {
                res.status(400).json({
                    status: "REJECTED",
                    error: schemaCheck.error
                });
                return;
            }
            // 3. Period-Lock integrity validation
            const lockCheck = BackendLedgerLockService_1.BackendLedgerLockService.verifyTimestampLocked(tenantId, timestamp);
            if (lockCheck.isLocked) {
                // Evaluate if request bypassed via authorized auditor role override header
                const auditorRole = req.headers["x-auditor-role"];
                const isAuthorizedAuditor = auditorRole === "auditor" || auditorRole === "super_admin";
                if (!isAuthorizedAuditor) {
                    res.status(403).json({
                        status: "REJECTED",
                        error: `Period Mutation Blocked: Timestamp falls within sealed fiscal interval '${lockCheck.lockDetails?.periodId}'. Requires auditor signature authorization.`
                    });
                    return;
                }
            }
            // 4. Ledger carry-forward rolling parameters validation
            if (!previousHash || previousHash.length !== 64) {
                res.status(400).json({
                    status: "REJECTED",
                    error: "Ledger Corruption: Missing or invalid rolling carry-forward previousHash signature."
                });
                return;
            }
            // Payload validated, proceed to execution route
            next();
        }
        catch (e) {
            res.status(500).json({
                status: "EXCEPTION_HALT",
                error: `Internal validation boundary crash: ${e.message}`
            });
        }
    }
}
exports.AccountingValidationGateway = AccountingValidationGateway;
