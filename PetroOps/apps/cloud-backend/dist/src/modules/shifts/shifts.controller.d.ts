import { PrismaService } from '../../prisma.service';
export declare class ShiftsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    openShift(stationId: string, body: {
        supervisorId: string;
        shiftName: string;
        startTime: string;
    }): Promise<{
        id: string;
        stationId: string;
        shiftName: string;
        startTime: Date;
        endTime: Date | null;
        isClosed: boolean;
        reconcileState: string;
        cashExpected: number;
        cashCollected: number;
        variance: number;
        reconciledAt: Date | null;
        supervisorId: string;
    }>;
    closeShift(shiftId: string, body: {
        cashCollected: number;
        endTime: string;
    }): Promise<{
        success: boolean;
        shift: {
            id: string;
            stationId: string;
            shiftName: string;
            startTime: Date;
            endTime: Date | null;
            isClosed: boolean;
            reconcileState: string;
            cashExpected: number;
            cashCollected: number;
            variance: number;
            reconciledAt: Date | null;
            supervisorId: string;
        };
        cashExpected: number;
        variance: number;
    }>;
    getShiftDetails(shiftId: string): Promise<{
        sales: {
            id: string;
            litersSold: number;
            pricePerLiter: number;
            amount: number;
            paymentMethod: string;
            startTotalizer: number;
            endTotalizer: number;
            timestamp: Date;
            shiftId: string;
            nozzleId: string;
        }[];
        supervisor: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        stationId: string;
        shiftName: string;
        startTime: Date;
        endTime: Date | null;
        isClosed: boolean;
        reconcileState: string;
        cashExpected: number;
        cashCollected: number;
        variance: number;
        reconciledAt: Date | null;
        supervisorId: string;
    }>;
}
