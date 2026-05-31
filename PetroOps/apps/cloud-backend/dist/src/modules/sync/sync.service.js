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
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SyncService = class SyncService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processSyncDelta(payload) {
        const { stationId, clientId, mutationsQueue } = payload;
        return await this.prisma.$transaction(async (tx) => {
            const results = [];
            for (const mutation of mutationsQueue) {
                try {
                    let dbId = '';
                    if (mutation.table === 'Sale') {
                        if (mutation.action === 'INSERT') {
                            const res = await tx.sale.create({ data: mutation.data });
                            dbId = res.id;
                        }
                        else if (mutation.action === 'UPDATE') {
                            const res = await tx.sale.update({
                                where: { id: mutation.data.id },
                                data: mutation.data
                            });
                            dbId = res.id;
                        }
                    }
                    else if (mutation.table === 'DipReading') {
                        if (mutation.action === 'INSERT') {
                            const res = await tx.dipReading.create({ data: mutation.data });
                            dbId = res.id;
                        }
                    }
                    else if (mutation.table === 'Shift') {
                        if (mutation.action === 'INSERT') {
                            const res = await tx.shift.create({ data: mutation.data });
                            dbId = res.id;
                        }
                        else if (mutation.action === 'UPDATE') {
                            const res = await tx.shift.update({
                                where: { id: mutation.data.id },
                                data: mutation.data
                            });
                            dbId = res.id;
                        }
                    }
                    else if (mutation.table === 'LedgerBook') {
                        if (mutation.action === 'INSERT') {
                            const parsedData = { ...mutation.data };
                            if (parsedData.sequenceNo) {
                                parsedData.sequenceNo = BigInt(parsedData.sequenceNo);
                            }
                            const res = await tx.ledgerBook.create({ data: parsedData });
                            dbId = res.id;
                        }
                    }
                    results.push({ id: mutation.id, status: 'COMPLETED', dbId });
                }
                catch (error) {
                    results.push({ id: mutation.id, status: 'CONFLICTED', error: error.message });
                }
            }
            await tx.syncSession.create({
                data: {
                    stationId,
                    clientId,
                    lastSyncTime: new Date(),
                    syncStatus: 'COMPLETED'
                }
            });
            return {
                success: true,
                timestamp: new Date().toISOString(),
                processedMutations: results
            };
        });
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map