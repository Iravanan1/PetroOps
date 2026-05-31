import { IPumpDriver } from './driver.interface';
import { GilbarcoDriver } from './drivers/gilbarco.driver';
import { VeederRootDriver } from './drivers/veeder_root.driver';
import { OrpakDriver } from './drivers/orpak.driver';

export class DriverRegistry {
  private static drivers: Map<string, () => IPumpDriver> = new Map([
    ['Gilbarco-2wire', () => new GilbarcoDriver()],
    ['Orpak-FCC', () => new OrpakDriver()],
    ['VeederRoot-TLS', () => new VeederRootDriver()],
    ['Wayne-Dart', () => new GilbarcoDriver()], // Reuses similar binary framing mapping
    ['Tokheim-Serial', () => new OrpakDriver()] // Reuses RS-485 loop wrapping
  ]);

  /**
   * Instantiates the correct pump or ATG driver based on the configured protocol key.
   */
  public static createDriver(protocol: string): IPumpDriver {
    const builder = this.drivers.get(protocol);
    if (!builder) {
      throw new Error(`Unsupported forecourt protocol configured: ${protocol}`);
    }
    return builder();
  }

  public static getSupportedProtocols(): string[] {
    return Array.from(this.drivers.keys());
  }
}
