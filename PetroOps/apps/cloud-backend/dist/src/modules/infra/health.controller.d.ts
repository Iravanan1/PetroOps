import { PrismaService } from '../../prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    checkHealth(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: {
                status: string;
                provider: string;
                error: any;
            };
            cache: {
                status: string;
                provider: string;
            };
        };
    }>;
}
