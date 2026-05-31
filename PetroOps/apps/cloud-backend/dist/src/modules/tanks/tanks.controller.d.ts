import { PrismaService } from '../../prisma.service';
export declare class TanksController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTanks(stationId: string): Promise<{
        fillPercentage: number;
        capacityRemaining: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        fuelType: string;
        capacityLiters: number;
        currentLevel: number;
        waterLevel: number;
        temperature: number;
        stationId: string;
    }[]>;
    getTankDetails(stationId: string, tankId: string): Promise<{
        dipReadings: {
            id: string;
            tankId: string;
            timestamp: Date;
            readingType: string;
            fuelLevelMm: number;
            waterLevelMm: number;
            litersCalculated: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        fuelType: string;
        capacityLiters: number;
        currentLevel: number;
        waterLevel: number;
        temperature: number;
        stationId: string;
    }>;
}
