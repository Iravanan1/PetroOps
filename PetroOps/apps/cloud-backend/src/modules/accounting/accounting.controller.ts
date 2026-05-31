import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { LedgerVerifierService, JournalEntry } from './ledger-verifier.service';

@Controller('api/v1/accounting')
export class AccountingController {
  constructor(private readonly ledgerService: LedgerVerifierService) {}

  @Post('replay')
  @HttpCode(HttpStatus.OK)
  replayLedger(
    @Body() body: { tenantId: string; transactions: JournalEntry[]; clientAssertedHash?: string }
  ) {
    const { tenantId, transactions, clientAssertedHash } = body;
    const result = this.ledgerService.verifyAndReplayLedger(tenantId, transactions, clientAssertedHash);
    
    return {
      status: result.isValid ? 'SUCCESS' : 'TAMPERED',
      ...result
    };
  }
}
