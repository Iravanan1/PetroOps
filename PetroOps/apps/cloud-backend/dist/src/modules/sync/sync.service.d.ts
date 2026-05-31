import { PrismaService } from '../../prisma.service';
export interface SyncMutation {
    id: string;
    table: 'Sale' | 'DipReading' | 'Shift' | 'LedgerBook';
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    data: any;
    timestamp: string;
    sequenceNo: number;
}
export interface SyncPayload {
    stationId: string;
    clientId: string;
    lastSyncTimestamp: string;
    mutationsQueue: SyncMutation[];
}
export declare class SyncService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    processSyncDelta(payload: SyncPayload): Promise<{
        success: boolean;
        timestamp: string;
        processedMutations: {
            id: string;
            status: "COMPLETED" | "CONFLICTED";
            error?: string;
            dbId?: string;
        }[];
    }>;
}
