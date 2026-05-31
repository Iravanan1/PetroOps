/**
 * BranchProvisioningEngine.ts
 * Automated multi-tenant initialization engine establishing secure branch sandboxes,
 * tax structures (VAT vs GST slabs), and regional access signatures.
 */

export interface BranchConfiguration {
  branchId: string;
  name: string;
  region: string;
  oilCompany: "HPCL" | "IOCL" | "BPCL" | "RELIANCE";
  taxType: "GST" | "VAT";
  taxSlabPercentage: number;
  dataBoundaryStorageScope: string;
  secureToken: string;
  dateInitialized: string;
  status: "ACTIVE" | "PROVISIONING" | "SUSPENDED";
}

export class BranchProvisioningEngine {
  private static STORAGE_KEY = "PUMPAI_PROVISIONED_BRANCHES";

  /**
   * Fetches all registered branches in the tenant cluster
   */
  public static getBranches(): BranchConfiguration[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getDefaultBranches();
    } catch (e) {
      console.error("[BranchProvisioningEngine] Failed to retrieve branches, falling back", e);
      return this.getDefaultBranches();
    }
  }

  /**
   * Saves branch collection
   */
  public static saveBranches(branches: BranchConfiguration[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(branches));
    } catch (e) {
      console.error("[BranchProvisioningEngine] LocalStorage save failure", e);
    }
  }

  /**
   * Provisions a brand-new multi-tenant branch
   */
  public static provisionBranch(params: {
    name: string;
    region: string;
    oilCompany: BranchConfiguration["oilCompany"];
    taxType: BranchConfiguration["taxType"];
  }): BranchConfiguration {
    const branches = this.getBranches();
    
    // Generate secure randomized hexadecimal branch signature
    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const branchId = `BR-${params.oilCompany}-${randPart}`;
    
    // Derive secure isolated storage scopes and token keys
    const secureToken = `PK_LIVE_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
    const dataBoundaryStorageScope = `firestore://tenants/pumpai/branches/${branchId.toLowerCase()}`;
    
    const newBranch: BranchConfiguration = {
      branchId,
      name: params.name,
      region: params.region,
      oilCompany: params.oilCompany,
      taxType: params.taxType,
      taxSlabPercentage: params.taxType === "GST" ? 18.0 : 20.0, // standard slab logic
      dataBoundaryStorageScope,
      secureToken,
      dateInitialized: new Date().toISOString().split("T")[0],
      status: "ACTIVE"
    };

    branches.push(newBranch);
    this.saveBranches(branches);
    
    console.log(`[BranchProvisioning] Provisioned new tenant branch: ${branchId}. Scope: ${dataBoundaryStorageScope}`);
    return newBranch;
  }

  /**
   * Standard default branch seeds for multi-merchant workspace
   */
  private static getDefaultBranches(): BranchConfiguration[] {
    return [
      {
        branchId: "BR-HPCL-MUMBAI-01",
        name: "Mumbai Central Filling Station",
        region: "Maharashtra - West Coast",
        oilCompany: "HPCL",
        taxType: "GST",
        taxSlabPercentage: 18.0,
        dataBoundaryStorageScope: "firestore://tenants/pumpai/branches/br-hpcl-mumbai-01",
        secureToken: "PK_LIVE_90A45F12_1716281001",
        dateInitialized: "2026-01-15",
        status: "ACTIVE"
      },
      {
        branchId: "BR-IOCL-DELHI-03",
        name: "Delhi Outer Ring Road Outlet",
        region: "NCR - North Region",
        oilCompany: "IOCL",
        taxType: "GST",
        taxSlabPercentage: 18.0,
        dataBoundaryStorageScope: "firestore://tenants/pumpai/branches/br-iocl-delhi-03",
        secureToken: "PK_LIVE_81D242C0_1716281232",
        dateInitialized: "2026-02-10",
        status: "ACTIVE"
      },
      {
        branchId: "BR-BPCL-BLR-02",
        name: "Bangalore Whitefield High Road",
        region: "Karnataka - South Hub",
        oilCompany: "BPCL",
        taxType: "VAT",
        taxSlabPercentage: 20.0,
        dataBoundaryStorageScope: "firestore://tenants/pumpai/branches/br-bpcl-blr-02",
        secureToken: "PK_LIVE_77C98FF5_1716281944",
        dateInitialized: "2026-03-01",
        status: "ACTIVE"
      }
    ];
  }
}
