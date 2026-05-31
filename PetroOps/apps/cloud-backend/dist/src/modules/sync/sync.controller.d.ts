import { SyncService, SyncPayload } from './sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    syncDelta(payload: SyncPayload): Promise<{
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
