import { useState, useEffect, useCallback } from 'react';
import { OfflineRecoveryEngine, QueuedSyncEvent } from './OfflineRecoveryEngine';

export interface QueuedEdit {
  id: string;
  type: 'shift_entry' | 'nozzle_update' | 'credit_recovery' | 'manager_approval';
  payload: Record<string, unknown>;
  branchId: string;
  queuedAt: string;
  attempts: number;
}

function mapEventToEdit(evt: QueuedSyncEvent): QueuedEdit {
  let mappedType: QueuedEdit['type'] = 'shift_entry';
  if (evt.type === 'nozzle_update') mappedType = 'nozzle_update';
  else if (evt.type === 'credit_recovery') mappedType = 'credit_recovery';
  else if (evt.type === 'manager_override') mappedType = 'manager_approval';

  return {
    id: evt.id,
    type: mappedType,
    payload: evt.payload as Record<string, unknown>,
    branchId: evt.branchId,
    queuedAt: evt.queuedAt,
    attempts: evt.attempts
  };
}

export function useOfflineQueue(
  onFlush?: (edit: QueuedEdit) => Promise<void>
) {
  const engine = OfflineRecoveryEngine.getInstance();
  const [isOnline, setIsOnline] = useState(() => engine.getStatus().isOnline);
  const [pendingEdits, setPendingEdits] = useState<QueuedEdit[]>(() =>
    engine.getQueue().map(mapEventToEdit)
  );
  const [isFlushing, setIsFlushing] = useState(() => engine.getStatus().isFlushing);

  useEffect(() => {
    const unsubscribe = engine.subscribe((status) => {
      setIsOnline(status.isOnline);
      setIsFlushing(status.isFlushing);
      setPendingEdits(engine.getQueue().map(mapEventToEdit));
    });
    return unsubscribe;
  }, [engine]);

  // Hook into online events to execute any user-specified onFlush callbacks if provided
  useEffect(() => {
    if (isOnline && pendingEdits.length > 0 && onFlush && !isFlushing) {
      pendingEdits.forEach(edit => onFlush(edit).catch(() => {}));
    }
  }, [isOnline, pendingEdits, onFlush, isFlushing]);

  const enqueue = useCallback((
    type: QueuedEdit['type'],
    payload: Record<string, unknown>,
    branchId: string
  ) => {
    let mappedType: QueuedSyncEvent['type'] = 'shift_entry';
    if (type === 'nozzle_update') mappedType = 'nozzle_update';
    else if (type === 'credit_recovery') mappedType = 'credit_recovery';
    else if (type === 'manager_approval') mappedType = 'manager_override';

    return engine.enqueue(mappedType, payload, branchId);
  }, [engine]);

  const flushQueue = useCallback(async () => {
    engine.triggerImmediateSync();
  }, [engine]);

  const removeEdit = useCallback((id: string) => {
    engine.deleteSingleEvent(id);
  }, [engine]);

  const clearQueue = useCallback(() => {
    engine.clearOfflineQueue();
  }, [engine]);

  return {
    isOnline,
    pendingEdits,
    pendingCount: pendingEdits.length,
    isFlushing,
    enqueue,
    flushQueue,
    removeEdit,
    clearQueue
  };
}
