"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryAuditorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let TelemetryAuditorService = class TelemetryAuditorService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async auditStationDiscrepancy(stationId, timeWindowMinutes = 30) {
        const boundaryTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        const tankDips = await this.prisma.dipReading.findMany({
            where: {
                tank: { stationId },
                timestamp: { gte: boundaryTime }
            },
            orderBy: { timestamp: 'asc' }
        });
        const totalSales = await this.prisma.sale.aggregate({
            where: {
                shift: { stationId },
                timestamp: { gte: boundaryTime }
            },
            _sum: { litersSold: true }
        });
        const netAtgDrop = this.calculateNetAtgDrop(tankDips);
        const recordedSales = totalSales._sum.litersSold || 0;
        const variance = netAtgDrop - recordedSales;
        const alertThreshold = 15.0;
        return {
            stationId,
            timeWindowMinutes,
            netAtgDrop,
            recordedSales,
            variance,
            isAnomalous: variance > alertThreshold,
            classification: variance > alertThreshold ? 'THEFT_OR_LEAK_DETECTED' : 'STABLE',
            timestamp: new Date().toISOString()
        };
    }
    calculateNetAtgDrop(readings) {
        if (readings.length < 2)
            return 0;
        const initial = readings[0].litersCalculated;
        const final = readings[readings.length - 1].litersCalculated;
        return Math.max(0, initial - final);
    }
};
exports.TelemetryAuditorService = TelemetryAuditorService;
exports.TelemetryAuditorService = TelemetryAuditorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelemetryAuditorService);
//# sourceMappingURL=telemetry-auditor.service.js.map