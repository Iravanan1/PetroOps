import { PrismaService } from '../../prisma.service';
export declare class TelemetryAuditorService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    auditStationDiscrepancy(stationId: string, timeWindowMinutes?: number): Promise<{
        stationId: string;
        timeWindowMinutes: number;
        netAtgDrop: number;
        recordedSales: number;
        variance: number;
        isAnomalous: boolean;
        classification: string;
        timestamp: string;
    }>;
    private calculateNetAtgDrop;
}
