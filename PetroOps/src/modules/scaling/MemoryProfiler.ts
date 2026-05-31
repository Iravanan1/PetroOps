export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  allocationsPerSec: number;
  warningLevel: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export class MemoryProfiler {
  private baseHeap: number = 25 * 1024 * 1024; // 25MB base
  private allocationRate: number = 0;

  /**
   * Tracks simulated memory load based on the number of events currently held in memory.
   */
  public trackSimulatedMemory(eventCount: number): MemoryStats {
    // Assume each ledger event object takes ~150 bytes on average
    const eventMemory = eventCount * 150;
    
    // Simulate garbage collection fluctuations (± 5%)
    const gcVariance = 1 + ((Math.random() - 0.5) * 0.1); 
    
    const used = (this.baseHeap + eventMemory) * gcVariance;
    const limit = 2048 * 1024 * 1024; // 2GB typical limit for v8

    const ratio = used / limit;
    let warningLevel: 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (ratio > 0.9) warningLevel = 'CRITICAL';
    else if (ratio > 0.7) warningLevel = 'HIGH';

    return {
      usedJSHeapSize: used,
      totalJSHeapSize: used * 1.2,
      jsHeapSizeLimit: limit,
      allocationsPerSec: this.allocationRate,
      warningLevel
    };
  }

  public registerAllocations(count: number): void {
    this.allocationRate = count;
  }
}

export const memoryProfiler = new MemoryProfiler();
