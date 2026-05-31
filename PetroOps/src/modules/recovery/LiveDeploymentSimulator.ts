export type SimulationEvent = 
  | 'POWER_CUT' 
  | 'INTERNET_OUTAGE' 
  | 'ELECTRON_CRASH' 
  | 'DB_CORRUPTION' 
  | 'PRINTER_DISCONNECT';

export class LiveDeploymentSimulator {
  private activeFaults: Set<SimulationEvent> = new Set();
  private listeners: Array<(faults: SimulationEvent[]) => void> = [];

  public triggerFault(event: SimulationEvent): void {
    console.error(`[Chaos] INJECTING FAULT: ${event}`);
    this.activeFaults.add(event);
    this.notify();
    
    // Simulate real-world consequences
    if (event === 'POWER_CUT') {
      setTimeout(() => this.triggerFault('ELECTRON_CRASH'), 1000); // Usually power cut leads to crash unless UPS holds
    }
  }

  public resolveFault(event: SimulationEvent): void {
    console.log(`[Chaos] RESOLVING FAULT: ${event}`);
    this.activeFaults.delete(event);
    this.notify();
  }

  public getActiveFaults(): SimulationEvent[] {
    return Array.from(this.activeFaults);
  }

  public subscribe(cb: (faults: SimulationEvent[]) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    const faults = this.getActiveFaults();
    this.listeners.forEach(cb => cb(faults));
  }
}

export const deploymentSimulator = new LiveDeploymentSimulator();
