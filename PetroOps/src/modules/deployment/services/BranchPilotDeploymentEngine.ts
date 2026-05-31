/**
 * BranchPilotDeploymentEngine.ts
 * Enterprise-grade multi-tenant deployment engine managing branch-level parameters,
 * OMC structural templates (HPCL, BPCL, IOCL), tank profiles, and authorization scopes.
 */

export interface NozzleConfig {
  id: string;
  name: string;
  productType: "MS" | "HSD" | "XP95" | "Speed" | "Power";
  tankId: string;
  currentMeter: number;
}

export interface TankGeometry {
  id: string;
  name: string;
  productType: "MS" | "HSD" | "XP95" | "Speed" | "Power";
  capacity: number; // in Liters
  densityStandard: number; // standard kg/m3 (e.g. 745.0 for MS, 830.0 for HSD)
  currentDip: number; // in Liters
  currentWaterLevel: number; // in mm
}

export interface SupervisorAccess {
  id: string;
  name: string;
  role: "manager" | "supervisor" | "auditor";
  authorizedTokenSignature: string;
}

export interface BranchProfile {
  branchId: string;
  name: string;
  omc: "HPCL" | "BPCL" | "IOCL" | "Reliance" | "Nayara" | "Independent";
  nozzleLayouts: NozzleConfig[];
  tanks: TankGeometry[];
  authorizedSupervisors: SupervisorAccess[];
  taxSettings: {
    stateCode: string;
    vatRateMS: number; // Value Added Tax on Motor Spirit
    vatRateHSD: number; // Value Added Tax on High Speed Diesel
    gstRateLubricants: number; // standard GST e.g. 0.18
  };
}

export class BranchPilotDeploymentEngine {
  private static STORAGE_KEY = "pumpai_branch_profiles";

  /**
   * Generates a default production profile for standard Indian Oil Marketing Companies (OMCs)
   */
  public static generateOmcDefaultProfile(
    branchId: string,
    name: string,
    omc: "HPCL" | "BPCL" | "IOCL" | "Reliance" | "Nayara" | "Independent"
  ): BranchProfile {
    const defaultTanks: TankGeometry[] = [
      {
        id: "tank_ms_01",
        name: "Tank 01 - Motor Spirit (Petrol)",
        productType: "MS",
        capacity: 20000,
        densityStandard: 745.5,
        currentDip: 14500.20,
        currentWaterLevel: 2.0,
      },
      {
        id: "tank_hsd_01",
        name: "Tank 02 - High Speed Diesel",
        productType: "HSD",
        capacity: 25000,
        densityStandard: 831.2,
        currentDip: 18900.50,
        currentWaterLevel: 5.0,
      },
    ];

    const defaultNozzles: NozzleConfig[] = [
      { id: "nozzle_ms_1", name: "Bay 1 - Petrol Nozzle A", productType: "MS", tankId: "tank_ms_01", currentMeter: 120594.30 },
      { id: "nozzle_ms_2", name: "Bay 1 - Petrol Nozzle B", productType: "MS", tankId: "tank_ms_01", currentMeter: 245912.80 },
      { id: "nozzle_hsd_1", name: "Bay 2 - Diesel Nozzle A", productType: "HSD", tankId: "tank_hsd_01", currentMeter: 450912.40 },
      { id: "nozzle_hsd_2", name: "Bay 2 - Diesel Nozzle B", productType: "HSD", tankId: "tank_hsd_01", currentMeter: 781045.10 },
    ];

    // HPCL/BPCL/IOCL premium branding variants addition
    if (omc === "HPCL") {
      defaultTanks.push({
        id: "tank_power_01",
        name: "Tank 03 - Power Premium Petrol",
        productType: "Power",
        capacity: 10000,
        densityStandard: 750.0,
        currentDip: 6780.40,
        currentWaterLevel: 0.0,
      });
      defaultNozzles.push({
        id: "nozzle_power_1",
        name: "Bay 3 - HP Power Premium Nozzle A",
        productType: "Power",
        tankId: "tank_power_01",
        currentMeter: 40912.60,
      });
    } else if (omc === "BPCL") {
      defaultTanks.push({
        id: "tank_speed_01",
        name: "Tank 03 - Speed Premium Petrol",
        productType: "Speed",
        capacity: 12000,
        densityStandard: 751.5,
        currentDip: 8120.10,
        currentWaterLevel: 1.0,
      });
      defaultNozzles.push({
        id: "nozzle_speed_1",
        name: "Bay 3 - BP Speed Premium Nozzle A",
        productType: "Speed",
        tankId: "tank_speed_01",
        currentMeter: 89012.30,
      });
    } else if (omc === "IOCL") {
      defaultTanks.push({
        id: "tank_xp95_01",
        name: "Tank 03 - XP95 Premium Petrol",
        productType: "XP95",
        capacity: 15000,
        densityStandard: 753.0,
        currentDip: 9450.60,
        currentWaterLevel: 0.0,
      });
      defaultNozzles.push({
        id: "nozzle_xp95_1",
        name: "Bay 3 - IOC XP95 Premium Nozzle A",
        productType: "XP95",
        tankId: "tank_xp95_01",
        currentMeter: 51294.70,
      });
    }

    return {
      branchId,
      name,
      omc,
      nozzleLayouts: defaultNozzles,
      tanks: defaultTanks,
      authorizedSupervisors: [
        { id: "sup_01", name: "Shreyansh (Admin)", role: "auditor", authorizedTokenSignature: "sha256:auditor_signature_shreyansh_pumpai" },
        { id: "sup_02", name: "Rajesh Kumar", role: "manager", authorizedTokenSignature: "sha256:manager_signature_rajesh_pumpai" },
        { id: "sup_03", name: "Anil Sharma", role: "supervisor", authorizedTokenSignature: "sha256:supervisor_signature_anil_pumpai" },
      ],
      taxSettings: {
        stateCode: "MH", // Maharashtra state standard VAT percentages default
        vatRateMS: 0.26, // 26% Petrol VAT
        vatRateHSD: 0.24, // 24% Diesel VAT
        gstRateLubricants: 0.18, // 18% standard GST for lubricants
      },
    };
  }

  /**
   * Save branch profile to localStorage persistent cache simulator
   */
  public static saveBranchProfile(profile: BranchProfile): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const profiles: Record<string, BranchProfile> = stored ? JSON.parse(stored) : {};
    profiles[profile.branchId] = profile;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
  }

  /**
   * Retrieve branch profile
   */
  public static getBranchProfile(branchId: string): BranchProfile {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const profiles: Record<string, BranchProfile> = stored ? JSON.parse(stored) : {};
    if (profiles[branchId]) {
      return profiles[branchId];
    }
    
    // Fallback: Generate Default HPCL Central profile on-the-fly
    const defaultProfile = this.generateOmcDefaultProfile(
      branchId,
      "Central Retail Station - HPCL Pilot Branch",
      "HPCL"
    );
    this.saveBranchProfile(defaultProfile);
    return defaultProfile;
  }

  /**
   * Updates current nozzle counter meter in configuration
   */
  public static updateNozzleMeter(branchId: string, nozzleId: string, closingReading: number): void {
    const profile = this.getBranchProfile(branchId);
    const idx = profile.nozzleLayouts.findIndex(n => n.id === nozzleId);
    if (idx !== -1) {
      if (closingReading < profile.nozzleLayouts[idx].currentMeter) {
        throw new Error(`Meter rollback violation: Attempted to set counter ${closingReading} which is less than current standard ${profile.nozzleLayouts[idx].currentMeter}.`);
      }
      profile.nozzleLayouts[idx].currentMeter = closingReading;
      this.saveBranchProfile(profile);
    } else {
      throw new Error(`Nozzle with ID ${nozzleId} does not exist in branch profile.`);
    }
  }

  /**
   * Updates physical tank dipping statistics
   */
  public static updateTankLevel(branchId: string, tankId: string, physicalDip: number, waterLevel: number): void {
    const profile = this.getBranchProfile(branchId);
    const idx = profile.tanks.findIndex(t => t.id === tankId);
    if (idx !== -1) {
      if (physicalDip < 0 || physicalDip > profile.tanks[idx].capacity) {
        throw new Error(`Volumetric boundary violation: Tank physical dip level ${physicalDip} exceeds tank capacity limit ${profile.tanks[idx].capacity}.`);
      }
      profile.tanks[idx].currentDip = physicalDip;
      profile.tanks[idx].currentWaterLevel = waterLevel;
      this.saveBranchProfile(profile);
    } else {
      throw new Error(`Tank with ID ${tankId} does not exist in branch profile.`);
    }
  }
}
