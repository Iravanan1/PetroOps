import { TelemetryAuditorService } from './telemetry-auditor.service';
export declare class AIController {
    private readonly auditorService;
    constructor(auditorService: TelemetryAuditorService);
    getTelemetryAudit(stationId: string, window?: string): Promise<{
        stationId: string;
        timeWindowMinutes: number;
        netAtgDrop: number;
        recordedSales: number;
        variance: number;
        isAnomalous: boolean;
        classification: string;
        timestamp: string;
    }>;
}
