"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerVerifierService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const crypto = require("crypto");
let LedgerVerifierService = class LedgerVerifierService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    verifyAndReplayLedger(tenantId, entries, clientAssertedHash) {
        let currentHash = 'GENESIS_HASH_PETROOPS';
        const tamperedSequenceIndices = [];
        let isValid = true;
        let failedIndex = -1;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const sha = crypto.createHash('sha256');
            sha.update(`${tenantId}:${entry.sequenceNo}:${entry.accountDebit}:${entry.accountCredit}:${entry.amount}:${currentHash}`);
            const computedHash = sha.digest('hex');
            if (entry.prevHash !== currentHash) {
                isValid = false;
                tamperedSequenceIndices.push(entry.sequenceNo);
                if (failedIndex === -1) {
                    failedIndex = i;
                }
            }
            currentHash = computedHash;
        }
        if (clientAssertedHash && clientAssertedHash !== currentHash) {
            isValid = false;
        }
        return {
            isValid,
            verifiedRunningHash: currentHash,
            failedIndex,
            tamperedSequenceIndices,
        };
    }
};
exports.LedgerVerifierService = LedgerVerifierService;
exports.LedgerVerifierService = LedgerVerifierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LedgerVerifierService);
//# sourceMappingURL=ledger-verifier.service.js.map