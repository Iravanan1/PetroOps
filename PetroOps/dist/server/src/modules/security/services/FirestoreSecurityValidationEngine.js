"use strict";
/**
 * FirestoreSecurityValidationEngine.ts
 * Structural validation controller verifying document payload invariants prior to network transit.
 * Protects against schema corruption and ensures tenancy alignment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreSecurityValidationEngine = void 0;
class FirestoreSecurityValidationEngine {
    /**
     * Verifies structural schema and tenancy constraints of transaction payloads
     */
    static validateTransaction(payload, expectedTenantId) {
        // 1. Tenancy validation
        if (!payload.tenantId) {
            return { isValid: false, error: "Validation Rejected: Missing tenant identifier ('tenantId')." };
        }
        if (payload.tenantId !== expectedTenantId) {
            return {
                isValid: false,
                error: `Validation Rejected: Tenancy mismatch. Active tenant context: ${expectedTenantId}, payload tenant: ${payload.tenantId}`
            };
        }
        // 2. Structural/Type validations
        if (payload.amount === undefined || payload.amount === null) {
            return { isValid: false, error: "Validation Rejected: Transaction amount is required." };
        }
        if (typeof payload.amount !== "number" || isNaN(payload.amount)) {
            return { isValid: false, error: "Validation Rejected: Transaction amount must be a valid number." };
        }
        if (payload.amount <= 0) {
            return { isValid: false, error: "Validation Rejected: Transaction amount must be strictly positive." };
        }
        if (!payload.type || !["DEBIT", "CREDIT"].includes(payload.type)) {
            return { isValid: false, error: "Validation Rejected: Invalid transaction type (must be 'DEBIT' or 'CREDIT')." };
        }
        if (!payload.accountHead || payload.accountHead.trim().length === 0) {
            return { isValid: false, error: "Validation Rejected: Account head mapping key must not be empty." };
        }
        // 3. Timestamp sanity check
        if (!payload.timestamp) {
            return { isValid: false, error: "Validation Rejected: Missing transaction epoch timestamp." };
        }
        const maxFutureTime = Date.now() + 10 * 60 * 1000; // Allow 10 minutes clock drift
        if (payload.timestamp > maxFutureTime) {
            return { isValid: false, error: "Validation Rejected: Timestamp cannot map to the future." };
        }
        return { isValid: true };
    }
    /**
     * General-purpose metadata integrity validation checks
     */
    static validateMetadata(metadata) {
        if (!metadata)
            return true;
        // Prevent malicious deep nested properties or code injections
        const keys = Object.keys(metadata);
        for (const key of keys) {
            if (key.length > 64)
                return false;
            const val = metadata[key];
            if (typeof val === "object" && val !== null) {
                // Flat objects only
                return false;
            }
        }
        return true;
    }
}
exports.FirestoreSecurityValidationEngine = FirestoreSecurityValidationEngine;
