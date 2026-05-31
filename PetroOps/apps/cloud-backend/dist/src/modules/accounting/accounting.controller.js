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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const ledger_verifier_service_1 = require("./ledger-verifier.service");
let AccountingController = class AccountingController {
    constructor(ledgerService) {
        this.ledgerService = ledgerService;
    }
    replayLedger(body) {
        const { tenantId, transactions, clientAssertedHash } = body;
        const result = this.ledgerService.verifyAndReplayLedger(tenantId, transactions, clientAssertedHash);
        return {
            status: result.isValid ? 'SUCCESS' : 'TAMPERED',
            ...result
        };
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Post)('replay'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "replayLedger", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)('api/v1/accounting'),
    __metadata("design:paramtypes", [ledger_verifier_service_1.LedgerVerifierService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map