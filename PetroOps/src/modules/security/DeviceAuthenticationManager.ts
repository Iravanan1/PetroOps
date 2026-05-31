export interface HardwareDeviceAuth {
  deviceId: string;
  hardwareMac: string;
  token: string;
  isEnrolled: boolean;
  role: 'OPERATOR' | 'MANAGER' | 'KIOSK';
}

export class DeviceAuthenticationManager {
  private allowedDevices: Map<string, HardwareDeviceAuth> = new Map();

  constructor() {
    // Seed with a verified kiosk
    this.allowedDevices.set('pump-kiosk-01', {
      deviceId: 'pump-kiosk-01',
      hardwareMac: '00:1A:2B:3C:4D:5E',
      token: 'SEC-TOKEN-XYZ-123',
      isEnrolled: true,
      role: 'KIOSK'
    });
  }

  public authenticateDevice(deviceId: string, providedMac: string, token: string): boolean {
    console.log(`[Security] Authenticating physical device connection: ${deviceId}`);
    
    const device = this.allowedDevices.get(deviceId);
    if (!device) {
      console.warn(`[Security] REJECTED: Unrecognized device ID (${deviceId})`);
      return false;
    }

    if (!device.isEnrolled) {
      console.warn(`[Security] REJECTED: Device not enrolled (${deviceId})`);
      return false;
    }

    if (device.hardwareMac !== providedMac || device.token !== token) {
      console.error(`[Security] CRITICAL REJECTED: Hardware MAC or Token mismatch on ${deviceId}. Spoofing attempt?`);
      return false;
    }

    console.log(`[Security] Device ${deviceId} authenticated successfully. Role: ${device.role}`);
    return true;
  }

  public enrollDevice(auth: HardwareDeviceAuth): void {
    // In production, this would require an admin pin/override
    this.allowedDevices.set(auth.deviceId, auth);
    console.log(`[Security] Device ${auth.deviceId} successfully enrolled.`);
  }
}

export const deviceAuthManager = new DeviceAuthenticationManager();
