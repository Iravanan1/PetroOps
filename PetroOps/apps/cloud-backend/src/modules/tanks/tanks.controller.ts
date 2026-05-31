import { Controller, Get, Param, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Controller('api/v1/stations/:stationId/tanks')
export class TanksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTanks(@Param('stationId') stationId: string) {
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

  @Get(':tankId')
  @HttpCode(HttpStatus.OK)
  async getTankDetails(
    @Param('stationId') stationId: string,
    @Param('tankId') tankId: string
  ) {
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
      throw new BadRequestException('Target tank not found.');
    }

    return tank;
  }
}
