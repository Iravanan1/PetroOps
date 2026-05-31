"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayChecksumService = void 0;
class ReplayChecksumService {
    /**
     * Computes a SHA-256 hex digest in the browser, or a deterministic djb2
     * 32-bit unsigned hash in Node/SSR environments.
     */
    static async computeHash(content) {
        // Browser path ─ SubtleCrypto
        if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        // Node/SSR fallback – deterministic djb2-style 32-bit hash
        return this.djb2Hash(content);
    }
    /**
     * Synchronous djb2 variant used for non-async contexts and Node fallback.
     */
    static djb2Hash(content) {
        let hash = 5381;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) + hash) ^ char;
            hash |= 0;
        }
        return `djb2_${(hash >>> 0).toString(16).padStart(8, '0')}`;
    }
    /**
     * Builds a new checksum block linking the current transaction into the chain.
     *
     * @param blockIndex      Sequential block index (0-based)
     * @param transactionId   Unique transaction ID
     * @param previousChecksum Checksum of the immediately preceding block
     * @param transactionPayload Deterministic stringified transaction fields
     */
    static async buildBlock(blockIndex, transactionId, previousChecksum, transactionPayload) {
        // The hash input chains previous hash + current payload to ensure ordering
        const hashInput = `${blockIndex}|${transactionId}|${previousChecksum}|${transactionPayload}`;
        const checksum = await this.computeHash(hashInput);
        return {
            blockIndex,
            transactionId,
            previousChecksum,
            payload: transactionPayload,
            checksum,
            computedAt: new Date().toISOString()
        };
    }
    /**
     * Builds the genesis (first) block with a deterministic seed.
     */
    static async buildGenesisBlock(branchId) {
        const genesisPayload = `GENESIS|${branchId}|IMMUTABLE_LEDGER_START`;
        const blockIndex = 0;
        const transactionId = `genesis_${branchId}`;
        const previousChecksum = '0000000000000000';
        const hashInput = `${blockIndex}|${transactionId}|${previousChecksum}|${genesisPayload}`;
        const checksum = await this.computeHash(hashInput);
        return {
            blockIndex,
            transactionId,
            previousChecksum,
            payload: genesisPayload,
            checksum,
            computedAt: new Date().toISOString()
        };
    }
    /**
     * Verifies an existing chain of ChecksumBlocks for integrity.
     * Returns first corruption point if the chain is broken.
     */
    static async verifyChain(blocks) {
        const errors = [];
        let corruptedAt = null;
        let corruptedTransactionId = null;
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            // Recompute the expected hash
            const hashInput = `${block.blockIndex}|${block.transactionId}|${block.previousChecksum}|${block.payload}`;
            const expectedChecksum = await this.computeHash(hashInput);
            if (block.checksum !== expectedChecksum) {
                if (corruptedAt === null) {
                    corruptedAt = i;
                    corruptedTransactionId = block.transactionId;
                }
                errors.push(`[Chain Corruption] Block ${i} (txId: ${block.transactionId}) ` +
                    `checksum mismatch. Expected: ${expectedChecksum}, Stored: ${block.checksum}`);
            }
            // Verify block links correctly to the previous one
            if (i > 0 && block.previousChecksum !== blocks[i - 1].checksum) {
                if (corruptedAt === null) {
                    corruptedAt = i;
                    corruptedTransactionId = block.transactionId;
                }
                errors.push(`[Chain Break] Block ${i} previousChecksum (${block.previousChecksum}) ` +
                    `does not match Block ${i - 1} checksum (${blocks[i - 1].checksum})`);
            }
            // Verify sequential block index
            if (block.blockIndex !== i) {
                errors.push(`[Index Mismatch] Block at position ${i} has blockIndex=${block.blockIndex}. ` +
                    `Sequential ordering violation.`);
            }
        }
        return {
            isIntact: errors.length === 0,
            totalBlocks: blocks.length,
            corruptedAt,
            corruptedTransactionId,
            errors
        };
    }
    /**
     * Generates a deterministic idempotency key for deduplication from
     * a transaction's core fields.  Identical inputs always produce identical keys.
     */
    static generateIdempotencyKey(fields) {
        const canonical = [
            fields.branchId,
            fields.date,
            fields.debitAccount,
            fields.creditAccount,
            fields.amount.toFixed(2),
            fields.description.toLowerCase().trim()
        ].join('|');
        return `idem_${this.djb2Hash(canonical)}`;
    }
}
exports.ReplayChecksumService = ReplayChecksumService;
