import { LedgerVerifierService, JournalEntry } from './ledger-verifier.service';
export declare class AccountingController {
    private readonly ledgerService;
    constructor(ledgerService: LedgerVerifierService);
    replayLedger(body: {
        tenantId: string;
        transactions: JournalEntry[];
        clientAssertedHash?: string;
    }): {
        isValid: boolean;
        verifiedRunningHash: string;
        failedIndex: number;
        tamperedSequenceIndices: number[];
        status: string;
    };
}
