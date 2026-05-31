import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AccountingController } from './modules/accounting/accounting.controller';
import { LedgerVerifierService } from './modules/accounting/ledger-verifier.service';
import { SyncController } from './modules/sync/sync.controller';
import { SyncService } from './modules/sync/sync.service';
import { AIController } from './modules/ai/ai.controller';
import { TelemetryAuditorService } from './modules/ai/telemetry-auditor.service';
import { ShiftsController } from './modules/shifts/shifts.controller';
import { VarianceAuditorService } from './modules/ai/variance-auditor.service';
import { AIOrchestrationService } from './modules/ai/ai-orchestration.service';
import { HealthController } from './modules/infra/health.controller';
import { TanksController } from './modules/tanks/tanks.controller';

@Module({
  imports: [],
  controllers: [
    AuthController,
    AccountingController,
    SyncController,
    AIController,
    ShiftsController,
    HealthController,
    TanksController
  ],
  providers: [
    PrismaService,
    AuthService,
    LedgerVerifierService,
    SyncService,
    TelemetryAuditorService,
    VarianceAuditorService,
    AIOrchestrationService
  ],
})
export class AppModule {}
