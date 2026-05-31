import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface SyncMutation {
  id: string;
  table: 'Sale' | 'DipReading' | 'Shift' | 'LedgerBook';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: string;
  sequenceNo: number;
}

export interface SyncPayload {
  stationId: string;
  clientId: string;
  lastSyncTimestamp: string;
  mutationsQueue: SyncMutation[];
}

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processes local edge mutations sequentially inside a secure database transaction,
   * returning success/conflict mappings for each entry.
   */
  public async processSyncDelta(payload: SyncPayload) {
    const { stationId, clientId, mutationsQueue } = payload;

    return await this.prisma.$transaction(async (tx) => {
      const results: { id: string; status: 'COMPLETED' | 'CONFLICTED'; error?: string; dbId?: string }[] = [];

      for (const mutation of mutationsQueue) {
        try {
          let dbId = '';
          if (mutation.table === 'Sale') {
            if (mutation.action === 'INSERT') {
              const res = await tx.sale.create({ data: mutation.data });
              dbId = res.id;
            } else if (mutation.action === 'UPDATE') {
              const res = await tx.sale.update({
                where: { id: mutation.data.id },
                data: mutation.data
              });
              dbId = res.id;
            }
          } else if (mutation.table === 'DipReading') {
            if (mutation.action === 'INSERT') {
              const res = await tx.dipReading.create({ data: mutation.data });
              dbId = res.id;
            }
          } else if (mutation.table === 'Shift') {
            if (mutation.action === 'INSERT') {
              const res = await tx.shift.create({ data: mutation.data });
              dbId = res.id;
            } else if (mutation.action === 'UPDATE') {
              const res = await tx.shift.update({
                where: { id: mutation.data.id },
                data: mutation.data
              });
              dbId = res.id;
            }
          } else if (mutation.table === 'LedgerBook') {
            if (mutation.action === 'INSERT') {
              // Convert serialised BigInt sequences safely
              const parsedData = { ...mutation.data };
              if (parsedData.sequenceNo) {
                parsedData.sequenceNo = BigInt(parsedData.sequenceNo);
              }
              const res = await tx.ledgerBook.create({ data: parsedData });
              dbId = res.id;
            }
          }

          results.push({ id: mutation.id, status: 'COMPLETED', dbId });
        } catch (error: any) {
          results.push({ id: mutation.id, status: 'CONFLICTED', error: error.message });
        }
      }

      // Record Sync Log Session for auditor tracking
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
}
