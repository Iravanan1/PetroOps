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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TanksController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let TanksController = class TanksController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTanks(stationId) {
        const tanks = await this.prisma.tank.findMany({
            where: { stationId }
        });
        return tanks.map(tank => {
            const fillPercentage = (tank.currentLevel / tank.capacityLiters) * 100;
            return {
                ...tank,
                fillPercentage,
                capacityRemaining: tank.capacityLiters - tank.currentLevel
            };
        });
    }
    async getTankDetails(stationId, tankId) {
        const tank = await this.prisma.tank.findFirst({
            where: { id: tankId, stationId },
            include: {
                dipReadings: {
                    take: 10,
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
        if (!tank) {
            throw new common_1.BadRequestException('Target tank not found.');
        }
        return tank;
    }
};
exports.TanksController = TanksController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('stationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "getTanks", null);
__decorate([
    (0, common_1.Get)(':tankId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('stationId')),
    __param(1, (0, common_1.Param)('tankId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TanksController.prototype, "getTankDetails", null);
exports.TanksController = TanksController = __decorate([
    (0, common_1.Controller)('api/v1/stations/:stationId/tanks'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TanksController);
//# sourceMappingURL=tanks.controller.js.map