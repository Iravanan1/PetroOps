export interface LedgerSnapshot {
  snapshotId: string;
  sequenceId: number;
  timestamp: number;
  balances: Record<string, number>; // Account ID -> Balance
  payoutUtrsMatched: string[];
  blockHash: string;
  signature: string;
}

export interface SnapshotComparisonResult {
  snapshotIdA: string;
  snapshotIdB: string;
  timestampDelta: number;
  balanceDiffs: Record<string, {
    valA: number;
    valB: number;
    delta: number;
    percentageChange: number;
  }>;
  commonUtrsCount: number;
  addedUtrs: string[];
  removedUtrs: string[];
  integrityVerification: {
    validA: boolean;
    validB: boolean;
    matchingSequence: boolean;
  };
}

export class SnapshotComparisonEngine {
  constructor() {}

  /**
   * Compares two snapshots and outputs an analytical diff matrix
   */
  public compareSnapshots(snapA: LedgerSnapshot, snapB: LedgerSnapshot): SnapshotComparisonResult {
    const balanceDiffs: Record<string, any> = {};

    const allAccountIds = new Set([
      ...Object.keys(snapA.balances),
      ...Object.keys(snapB.balances)
    ]);

    allAccountIds.forEach(accId => {
      const valA = snapA.balances[accId] || 0;
      const valB = snapB.balances[accId] || 0;
      const delta = parseFloat((valB - valA).toFixed(2));
      const percentageChange = valA === 0 ? (valB === 0 ? 0 : 100) : parseFloat(((delta / valA) * 100).toFixed(2));

      balanceDiffs[accId] = {
        valA,
        valB,
        delta,
        percentageChange
      };
    });

    const setA = new Set(snapA.payoutUtrsMatched);
    const setB = new Set(snapB.payoutUtrsMatched);

    const commonUtrs = snapA.payoutUtrsMatched.filter(utr => setB.has(utr));
    const addedUtrs = snapB.payoutUtrsMatched.filter(utr => !setA.has(utr));
    const removedUtrs = snapA.payoutUtrsMatched.filter(utr => !setB.has(utr));

    // Simulated signature integrity check
    const validA = snapA.blockHash.length > 0 && snapA.signature.startsWith("SIG_");
    const validB = snapB.blockHash.length > 0 && snapB.signature.startsWith("SIG_");
    const matchingSequence = snapB.sequenceId >= snapA.sequenceId;

    return {
      snapshotIdA: snapA.snapshotId,
      snapshotIdB: snapB.snapshotId,
      timestampDelta: snapB.timestamp - snapA.timestamp,
      balanceDiffs,
      commonUtrsCount: commonUtrs.length,
      addedUtrs,
      removedUtrs,
      integrityVerification: {
        validA,
        validB,
        matchingSequence
      }
    };
  }

  /**
   * Generates mock snapshots for comparison trials
   */
  public simulateSnapshot(snapId: string, seq: number, baseBalances: Record<string, number>, baseUtrs: string[]): LedgerSnapshot {
    const balances = { ...baseBalances };
    
    // Mutate balances slightly
    Object.keys(balances).forEach(k => {
      balances[k] = parseFloat((balances[k] + (Math.random() - 0.2) * 5000).toFixed(2));
    });

    const addedCount = Math.floor(Math.random() * 3) + 1;
    const currentUtrs = [...baseUtrs];
    for (let i = 0; i < addedCount; i++) {
      currentUtrs.push(`PP_UTR_${Math.floor(1000000 + Math.random() * 9000000)}`);
    }

    const payloadString = JSON.stringify(balances) + seq + currentUtrs.join(",");
    let hash = 0;
    for (let i = 0; i < payloadString.length; i++) {
      hash = (hash << 5) - hash + payloadString.charCodeAt(i);
      hash |= 0;
    }
    const blockHash = Math.abs(hash).toString(16);

    return {
      snapshotId: snapId,
      sequenceId: seq,
      timestamp: Date.now() - (10 - seq) * 3600 * 1000, // staggered backward
      balances,
      payoutUtrsMatched: currentUtrs,
      blockHash,
      signature: `SIG_HMAC_${blockHash.slice(0, 8)}`
    };
  }
}
