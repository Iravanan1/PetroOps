import * as crypto from 'crypto';

export interface LocalMutation {
  uuid: string;
  table: 'Sale' | 'DipReading' | 'Shift' | 'LedgerBook';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: string;
  checksum: string;
}

export class ClientSyncQueue {
  private queue: LocalMutation[] = [];

  /**
   * Registers a new operational transaction mutation locally.
   * Generates an idempotent transaction UUID and SHA-256 payload checksum for security verification.
   */
  public enqueue(
    table: 'Sale' | 'DipReading' | 'Shift' | 'LedgerBook',
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
  ): LocalMutation {
    const uuid = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create unique SHA-256 payload checksum
    const sha = crypto.createHash('sha256');
    sha.update(`${uuid}:${table}:${action}:${JSON.stringify(payload)}:${timestamp}`);
    const checksum = sha.digest('hex');

    const mutation: LocalMutation = {
      uuid,
      table,
      action,
      payload,
      timestamp,
      checksum
    };

    this.queue.push(mutation);
    return mutation;
  }

  public getPending(): LocalMutation[] {
    return [...this.queue];
  }

  public clearIds(uuids: string[]): void {
    this.queue = this.queue.filter((mutation) => !uuids.includes(mutation.uuid));
  }

  public clearQueue(): void {
    this.queue = [];
  }
}
