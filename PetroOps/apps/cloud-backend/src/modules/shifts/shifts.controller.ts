import { Controller, Post, Body, Param, Put, Get, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Controller('api/v1/stations/:stationId/shifts')
export class ShiftsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  async openShift(
    @Param('stationId') stationId: string,
    @Body() body: { supervisorId: string; shiftName: string; startTime: string }
  ) {
    if (!body.supervisorId || !body.shiftName || !body.startTime) {
      throw new BadRequestException('Required fields: supervisorId, shiftName, startTime');
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

  @Put(':shiftId/close')
  @HttpCode(HttpStatus.OK)
  async closeShift(
    @Param('shiftId') shiftId: string,
    @Body() body: { cashCollected: number; endTime: string }
  ) {
    if (body.cashCollected === undefined || !body.endTime) {
      throw new BadRequestException('Required fields: cashCollected, endTime');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Check if shift exists
      const existingShift = await tx.shift.findUnique({
        where: { id: shiftId }
      });
      if (!existingShift) {
        throw new BadRequestException('Target shift not found.');
      }
      if (existingShift.isClosed) {
        throw new BadRequestException('Target shift is already closed.');
      }

      // 2. Aggregate sales recorded under this shift
      const salesAggregate = await tx.sale.aggregate({
        where: { shiftId },
        _sum: { amount: true }
      });
      const cashExpected = salesAggregate._sum.amount || 0.0;
      const variance = body.cashCollected - cashExpected;

      // 3. Update shift status with variance
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

  @Get(':shiftId')
  @HttpCode(HttpStatus.OK)
  async getShiftDetails(
    @Param('shiftId') shiftId: string
  ) {
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
      throw new BadRequestException('Shift record not found.');
    }

    return shift;
  }
}
