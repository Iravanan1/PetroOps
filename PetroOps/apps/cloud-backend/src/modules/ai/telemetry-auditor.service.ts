import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TelemetryAuditorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates if a physical discrepancy occurred by comparing fuel volume level drops 
   * (via Automatic Tank Gauge dip readings) against nozzle transaction meters within a time window.
   */
  public async auditStationDiscrepancy(stationId: string, timeWindowMinutes = 30) {
    const boundaryTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    // Get all dip readings in the window
    const tankDips = await this.prisma.dipReading.findMany({
      where: {
        tank: { stationId },
        timestamp: { gte: boundaryTime }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Sum sales for the active station
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
    
    // Theft or physical leak threshold limit
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

  private calculateNetAtgDrop(readings: any[]): number {
    if (readings.length < 2) return 0;
    const initial = readings[0].litersCalculated;
    const final = readings[readings.length - 1].litersCalculated;
    return Math.max(0, initial - final);
  }
}
