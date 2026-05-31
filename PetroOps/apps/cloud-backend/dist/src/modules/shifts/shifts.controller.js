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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let ShiftsController = class ShiftsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async openShift(stationId, body) {
        if (!body.supervisorId || !body.shiftName || !body.startTime) {
            throw new common_1.BadRequestException('Required fields: supervisorId, shiftName, startTime');
        }
        return await this.prisma.shift.create({
            data: {
                stationId,
                supervisorId: body.supervisorId,
                shiftName: body.shiftName,
                startTime: new Date(body.startTime),
                isClosed: false,
                cashExpected: 0.0,
                cashCollected: 0.0,
                variance: 0.0,
            }
        });
    }
    async closeShift(shiftId, body) {
        if (body.cashCollected === undefined || !body.endTime) {
            throw new common_1.BadRequestException('Required fields: cashCollected, endTime');
        }
        return await this.prisma.$transaction(async (tx) => {
            const existingShift = await tx.shift.findUnique({
                where: { id: shiftId }
            });
            if (!existingShift) {
                throw new common_1.BadRequestException('Target shift not found.');
            }
            if (existingShift.isClosed) {
                throw new common_1.BadRequestException('Target shift is already closed.');
            }
            const salesAggregate = await tx.sale.aggregate({
                where: { shiftId },
                _sum: { amount: true }
            });
            const cashExpected = salesAggregate._sum.amount || 0.0;
            const variance = body.cashCollected - cashExpected;
            const shift = await tx.shift.update({
                where: { id: shiftId },
                data: {
                    isClosed: true,
                    endTime: new Date(body.endTime),
                    cashExpected,
                    cashCollected: body.cashCollected,
                    variance,
                    reconcileState: Math.abs(variance) > 100.0 ? 'VARIANCE_WARNING' : 'BALANCED',
                    reconciledAt: new Date(),
                }
            });
            return {
                success: true,
                shift,
                cashExpected,
                variance
            };
        });
    }
    async getShiftDetails(shiftId) {
        const shift = await this.prisma.shift.findUnique({
            where: { id: shiftId },
            include: {
                supervisor: {
                    select: { id: true, email: true, firstName: true, lastName: true }
                },
                sales: true
            }
        });
        if (!shift) {
            throw new common_1.BadRequestException('Shift record not found.');
        }
        return shift;
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.Post)('open'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('stationId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "openShift", null);
__decorate([
    (0, common_1.Put)(':shiftId/close'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('shiftId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "closeShift", null);
__decorate([
    (0, common_1.Get)(':shiftId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('shiftId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShiftDetails", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, common_1.Controller)('api/v1/stations/:stationId/shifts'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map