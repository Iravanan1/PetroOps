"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const auth_controller_1 = require("./modules/auth/auth.controller");
const auth_service_1 = require("./modules/auth/auth.service");
const accounting_controller_1 = require("./modules/accounting/accounting.controller");
const ledger_verifier_service_1 = require("./modules/accounting/ledger-verifier.service");
const sync_controller_1 = require("./modules/sync/sync.controller");
const sync_service_1 = require("./modules/sync/sync.service");
const ai_controller_1 = require("./modules/ai/ai.controller");
const telemetry_auditor_service_1 = require("./modules/ai/telemetry-auditor.service");
const shifts_controller_1 = require("./modules/shifts/shifts.controller");
const variance_auditor_service_1 = require("./modules/ai/variance-auditor.service");
const ai_orchestration_service_1 = require("./modules/ai/ai-orchestration.service");
const health_controller_1 = require("./modules/infra/health.controller");
const tanks_controller_1 = require("./modules/tanks/tanks.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [
            auth_controller_1.AuthController,
            accounting_controller_1.AccountingController,
            sync_controller_1.SyncController,
            ai_controller_1.AIController,
            shifts_controller_1.ShiftsController,
            health_controller_1.HealthController,
            tanks_controller_1.TanksController
        ],
        providers: [
            prisma_service_1.PrismaService,
            auth_service_1.AuthService,
            ledger_verifier_service_1.LedgerVerifierService,
            sync_service_1.SyncService,
            telemetry_auditor_service_1.TelemetryAuditorService,
            variance_auditor_service_1.VarianceAuditorService,
            ai_orchestration_service_1.AIOrchestrationService
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map