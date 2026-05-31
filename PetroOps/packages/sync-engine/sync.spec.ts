import { ClientSyncQueue } from './client-sync-queue';

describe('Sync Engine client-sync-queue unit tests', () => {
  let syncQueue: ClientSyncQueue;

  beforeEach(() => {
    syncQueue = new ClientSyncQueue();
  });

  it('should successfully enqueue sale mutations and generate cryptographic SHA-256 checksums', () => {
    const salePayload = {
      shiftId: 'd664e5fa-14cb-4d43-9878-3a218fca8301',
      nozzleId: '57dbef1a-3a22-48cf-812e-9d2a3194bc02',
      litersSold: 25.5,
      pricePerLiter: 104.2,
      amount: 2657.1,
      paymentMethod: 'UPI',
      startTotalizer: 14820.5,
      endTotalizer: 14846.0
    };

    const entry = syncQueue.enqueue('Sale', 'INSERT', salePayload);

    expect(entry.uuid).toBeDefined();
    expect(entry.table).toBe('Sale');
    expect(entry.action).toBe('INSERT');
    expect(entry.payload).toEqual(salePayload);
    expect(entry.timestamp).toBeDefined();
    expect(entry.checksum).toHaveLength(64); // Valid SHA-256 hash length
    expect(syncQueue.getPending()).toHaveLength(1);
  });

  it('should support clearing completed IDs from the mutation list', () => {
    const entry1 = syncQueue.enqueue('Sale', 'INSERT', { litersSold: 10.0 });
    const entry2 = syncQueue.enqueue('DipReading', 'INSERT', { fuelLevelMm: 1200 });

    expect(syncQueue.getPending()).toHaveLength(2);

    syncQueue.clearIds([entry1.uuid]);
    const pending = syncQueue.getPending();
    
    expect(pending).toHaveLength(1);
    expect(pending[0].uuid).toBe(entry2.uuid);
  });

  it('should clear all items on clearQueue call', () => {
    syncQueue.enqueue('Sale', 'INSERT', { litersSold: 10.0 });
    syncQueue.enqueue('DipReading', 'INSERT', { fuelLevelMm: 1200 });

    expect(syncQueue.getPending()).toHaveLength(2);

    syncQueue.clearQueue();
    expect(syncQueue.getPending()).toHaveLength(0);
  });
});
