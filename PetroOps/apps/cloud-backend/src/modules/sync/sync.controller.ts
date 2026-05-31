import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService, SyncPayload } from './sync.service';

@Controller('api/v1/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('delta')
  @HttpCode(HttpStatus.OK)
  async syncDelta(@Body() payload: SyncPayload) {
    return await this.syncService.processSyncDelta(payload);
  }
}
