export interface MutationStamp {
  mutationId: string;
  documentPath: string;
  fieldName: string;
  preValue: string;
  postValue: string;
  modifiedBy: string;
  ipAddress: string;
  authorizedSignature: string; // Cryptographic validation stamp
  timestamp: number;
}

export class TransactionMutationInspector {
  private auditLogs: MutationStamp[] = [];

  constructor() {
    this.initializeDefaultLogs();
  }

  private initializeDefaultLogs() {
    this.auditLogs = [
      {
        mutationId: "MUT_88291",
        documentPath: "/shifts/SF_990182",
        fieldName: "closingCashDeclared",
        preValue: "42850.00",
        postValue: "42550.00",
        modifiedBy: "manager_shreyansh",
        ipAddress: "192.168.1.12",
        authorizedSignature: "SIG_MUT_3f8a9e7d",
        timestamp: Date.now() - 3600 * 5 * 1000 // 5 hours ago
      },
      {
        mutationId: "MUT_88292",
        documentPath: "/shifts/SF_990182",
        fieldName: "varianceReason",
        preValue: "",
        postValue: "Operator drawer counted Rs. 300 short. Supervisor verified cash bag clearance.",
        modifiedBy: "manager_shreyansh",
        ipAddress: "192.168.1.12",
        authorizedSignature: "SIG_MUT_9c2b4e8f",
        timestamp: Date.now() - 3600 * 4.9 * 1000 // 4.9 hours ago
      }
    ];
  }

  public getMutationHistory(documentPath?: string): MutationStamp[] {
    if (documentPath) {
      return this.auditLogs.filter(log => log.documentPath === documentPath);
    }
    return this.auditLogs;
  }

  /**
   * Tracks and commits an absolute document cell mutation event with audit signatures
   */
  public logMutation(
    documentPath: string, 
    fieldName: string, 
    preValue: string, 
    postValue: string, 
    userId: string, 
    ip: string
  ): MutationStamp {
    const id = `MUT_${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Asymmetric validation hash simulation
    const stampData = `${id}:${documentPath}:${fieldName}:${preValue}:${postValue}:${userId}:${ip}`;
    let hash = 5381;
    for (let i = 0; i < stampData.length; i++) {
      hash = (hash * 33) ^ stampData.charCodeAt(i);
    }
    const signature = `SIG_MUT_${Math.abs(hash).toString(16).slice(0, 8)}`;

    const newMutation: MutationStamp = {
      mutationId: id,
      documentPath,
      fieldName,
      preValue,
      postValue,
      modifiedBy: userId,
      ipAddress: ip,
      authorizedSignature: signature,
      timestamp: Date.now()
    };

    this.auditLogs.push(newMutation);
    return newMutation;
  }

  /**
   * Asserts validity of a mutation signature
   */
  public verifyIntegrity(stamp: MutationStamp): boolean {
    const stampData = `${stamp.mutationId}:${stamp.documentPath}:${stamp.fieldName}:${stamp.preValue}:${stamp.postValue}:${stamp.modifiedBy}:${stamp.ipAddress}`;
    let hash = 5381;
    for (let i = 0; i < stampData.length; i++) {
      hash = (hash * 33) ^ stampData.charCodeAt(i);
    }
    const calculatedSignature = `SIG_MUT_${Math.abs(hash).toString(16).slice(0, 8)}`;
    return stamp.authorizedSignature === calculatedSignature;
  }
}
