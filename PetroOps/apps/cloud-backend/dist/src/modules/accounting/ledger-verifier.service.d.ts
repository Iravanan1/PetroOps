import { PrismaService } from '../../prisma.service';
export interface JournalEntry {
    sequenceNo: number;
    accountDebit: string;
    accountCredit: string;
    amount: number;
    prevHash: string;
}
export declare class LedgerVerifierService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    verifyAndReplayLedger(tenantId: string, entries: JournalEntry[], clientAssertedHash?: string): {
        isValid: boolean;
        verifiedRunningHash: string;
        failedIndex: number;
        tamperedSequenceIndices: number[];
    };
}
