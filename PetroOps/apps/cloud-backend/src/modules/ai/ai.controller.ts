import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryAuditorService } from './telemetry-auditor.service';

@Controller('api/v1/ai')
export class AIController {
  constructor(private readonly auditorService: TelemetryAuditorService) {}

  @Get('audit-discrepancy')
  @HttpCode(HttpStatus.OK)
  async getTelemetryAudit(
    @Query('stationId') stationId: string,
    @Query('window') window?: string
  ) {
    const timeWindow = window ? parseInt(window, 10) : 30;
    return await this.auditorService.auditStationDiscrepancy(stationId, timeWindow);
  }
}
