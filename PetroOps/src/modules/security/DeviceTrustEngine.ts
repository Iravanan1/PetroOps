/**
 * DeviceTrustEngine.ts
 * ────────────────────
 * Manages physical terminal device registry signatures.
 * Restricts multi-station ledger access from untrusted mobile or desktop clients.
 */

export interface TrustedDevice {
  deviceId: string;
  label: string;
  fingerprint: string;
  trustedSince: string;
  lastActive: string;
  ipAddress: string;
  status: 'TRUSTED' | 'UNTRUSTED' | 'REVOKED';
}

export class DeviceTrustEngine {
  private static readonly STORAGE_KEY = 'pumpai_trusted_devices';

  /**
   * Loads current trusted devices
   */
  public static getDevices(): TrustedDevice[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Seed default demo registers on first load
      const defaultDevices: TrustedDevice[] = [
        { deviceId: 'dev-001', label: 'Main Station Office iPad', fingerprint: 'SHA-256:IPAD:MAIN:99201', trustedSince: '2026-05-01', lastActive: '2026-05-23 10:05', ipAddress: '192.168.1.45', status: 'TRUSTED' },
        { deviceId: 'dev-002', label: 'Attendant Nozzle Android Tablet', fingerprint: 'SHA-256:TAB:ATTEND:12904', trustedSince: '2026-05-10', lastActive: '2026-05-23 09:40', ipAddress: '192.168.1.102', status: 'TRUSTED' }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultDevices));
      return defaultDevices;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Evaluates and registers a new terminal device
   */
  public static registerDevice(label: string, ip: string): TrustedDevice {
    const devices = this.getDevices();
    const newDevice: TrustedDevice = {
      deviceId: `dev-${Date.now().toString().slice(-4)}`,
      label,
      fingerprint: `SHA-256:CUSTOM:${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      trustedSince: new Date().toISOString().slice(0, 10),
      lastActive: new Date().toISOString().slice(0, 16).replace('T', ' '),
      ipAddress: ip,
      status: 'TRUSTED'
    };

    devices.push(newDevice);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
    return newDevice;
  }

  /**
   * Revokes device access immediately
   */
  public static revokeDevice(deviceId: string): void {
    const devices = this.getDevices();
    const updated = devices.map(d => {
      if (d.deviceId === deviceId) {
        return { ...d, status: 'REVOKED' as const };
      }
      return d;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }
}
