import React, { useState, useEffect } from 'react';
import {
  PetroleumRulesEngine,
  WetStockRecord,
  NozzleRecord,
  AnomalyEvent
} from '../modules/accounting/PetroleumRulesEngine';

/**
 * WetStockPage
 * ─────────────
 * Routes: /wetstock (summary), /wetstock/variances, /wetstock/history, /wetstock/nozzles
 */

// ─── Mock data (replaced by Firestore reads in production) ───────
const MOCK_TANKS: WetStockRecord[] = [
  {
    tankId: 'T1', fuelType: 'MS',
    openingDip: 15420, closingDip: 11280, deliveryReceived: 0,
    pumpSalesExtracted: 4180, evaporationAllowancePct: 0.08
  },
  {
    tankId: 'T2', fuelType: 'HSD',
    openingDip: 8900, closingDip: 6210, deliveryReceived: 0,
    pumpSalesExtracted: 2650, evaporationAllowancePct: 0.06
  }
];

const MOCK_NOZZLES: NozzleRecord[] = [
  {
    nozzleId: 'N1', fuelType: 'MS',
    openingMeter: 12450.50, closingMeter: 14280.20,
    testingQty: 5.0, historicalLastClose: 12450.50, fuelRate: 104.50
  },
  {
    nozzleId: 'N2', fuelType: 'HSD',
    openingMeter: 8520.10, closingMeter: 9830.60,
    testingQty: 0, historicalLastClose: 8520.10, fuelRate: 92.30
  },
  {
    nozzleId: 'N3', fuelType: 'MS',
    openingMeter: 6700.00, closingMeter: 9050.30,
    testingQty: 2.0, historicalLastClose: 6700.00, fuelRate: 104.50
  }
];

// ─── Severity chip ────────────────────────────────────────────────
const SeverityChip: React.FC<{ severity: AnomalyEvent['severity'] }> = ({ severity }) => {
  const map = {
    INFO:     { bg: '#1e3a5f', color: '#60a5fa', label: 'INFO' },
    WARNING:  { bg: '#3b2f0a', color: '#fbbf24', label: 'WARNING' },
    HIGH:     { bg: '#4c1d0a', color: '#fb923c', label: 'HIGH' },
    CRITICAL: { bg: '#4c0519', color: '#f87171', label: 'CRITICAL' }
  };
  const s = map[severity];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}22`,
      borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700
    }}>{s.label}</span>
  );
};

// ─── Tank dip card ────────────────────────────────────────────────
const TankCard: React.FC<{ tank: WetStockRecord; variance: number }> = ({ tank, variance }) => {
  const physicalMovement = tank.openingDip + tank.deliveryReceived - tank.closingDip;
  const allowance = tank.pumpSalesExtracted * (tank.evaporationAllowancePct / 100);
  const isAnomaly = Math.abs(variance) > allowance;

  return (
    <div style={{
      background: '#1e293b', border: `1px solid ${isAnomaly ? '#ef4444' : '#334155'}`,
      borderRadius: 12, padding: 20
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Tank {tank.tankId}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{tank.fuelType}</div>
        </div>
        <div style={{
          background: isAnomaly ? '#7f1d1d' : '#14532d',
          color: isAnomaly ? '#fca5a5' : '#86efac',
          borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700
        }}>
          {isAnomaly ? '⚠ VARIANCE' : '✓ OK'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
        {[
          ['Opening Dip', `${tank.openingDip.toFixed(0)} L`],
          ['Closing Dip', `${tank.closingDip.toFixed(0)} L`],
          ['Delivery In', `${tank.deliveryReceived.toFixed(0)} L`],
          ['Pump Sales', `${tank.pumpSalesExtracted.toFixed(0)} L`],
          ['Physical Move', `${physicalMovement.toFixed(0)} L`],
          ['Variance', `${variance.toFixed(2)} L`]
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Nozzle card ─────────────────────────────────────────────────
const NozzleCard: React.FC<{ nozzle: NozzleRecord; hasRollback: boolean }> = ({ nozzle, hasRollback }) => {
  const netSales = nozzle.closingMeter - nozzle.openingMeter - nozzle.testingQty;
  return (
    <div style={{
      background: '#1e293b', border: `1px solid ${hasRollback ? '#ef4444' : '#334155'}`,
      borderRadius: 12, padding: 18
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{nozzle.nozzleId} ({nozzle.fuelType})</div>
        {hasRollback
          ? <span style={{ color: '#f87171', fontSize: 12, fontWeight: 700 }}>🚨 ROLLBACK</span>
          : <span style={{ color: '#4ade80', fontSize: 12 }}>✓ Normal</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
        {[
          ['Opening', `${nozzle.openingMeter.toFixed(2)} L`],
          ['Closing', `${nozzle.closingMeter.toFixed(2)} L`],
          ['Testing', `${nozzle.testingQty.toFixed(2)} L`],
          ['Net Sales', `${netSales.toFixed(2)} L`],
          ['Value', `₹${(netSales * nozzle.fuelRate).toLocaleString('en-IN')}`],
          ['Rate', `₹${nozzle.fuelRate}/L`]
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ color: '#64748b', fontSize: 10 }}>{label}</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────
export default function WetStockPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'variances' | 'nozzles' | 'history'>('summary');
  const [riskReport, setRiskReport] = useState<ReturnType<typeof PetroleumRulesEngine.evaluateFullRisk> | null>(null);

  useEffect(() => {
    const report = PetroleumRulesEngine.evaluateFullRisk({
      nozzles: MOCK_NOZZLES,
      tanks: MOCK_TANKS,
      densitySamples: [
        { fuelType: 'MS', densityBaseline: 745.5, densityMeasured: 744.8, temperatureC: 28 },
        { fuelType: 'HSD', densityBaseline: 830.0, densityMeasured: 829.2, temperatureC: 28 }
      ],
      settlement: {
        cardBatchTotal: 45200, upiMerchantTotal: 38100,
        cardSalesOnRegister: 45200, upiSalesOnRegister: 38100
      },
      attendants: []
    });
    setRiskReport(report);
  }, []);

  const tabs = [
    { key: 'summary', label: '📊 Summary' },
    { key: 'variances', label: '⚠ Variances' },
    { key: 'nozzles', label: '⛽ Nozzles' },
    { key: 'history', label: '📜 History' }
  ] as const;

  const riskColour = {
    LOW: '#4ade80', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#f87171'
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      color: '#f8fafc', fontFamily: "'Inter', sans-serif", padding: 24
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
          🛢 Wet Stock Intelligence
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
          Real-time fuel inventory · ETG dip matching · Nozzle calibration
        </p>
      </div>

      {/* Risk Score Banner */}
      {riskReport && (
        <div style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 12, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Risk Score</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: riskColour[riskReport.overallRiskLevel] }}>
              {riskReport.riskScore}<span style={{ fontSize: 14 }}>/100</span>
            </div>
            <div style={{ fontSize: 12, color: riskColour[riskReport.overallRiskLevel], fontWeight: 700 }}>
              {riskReport.overallRiskLevel}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {riskReport.fraudIndicators.length === 0 ? (
              <div style={{ color: '#4ade80', fontSize: 13 }}>✓ No fraud indicators detected</div>
            ) : (
              riskReport.fraudIndicators.map((fi, i) => (
                <div key={i} style={{ color: '#fca5a5', fontSize: 12, marginBottom: 4 }}>⚠ {fi}</div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? '#0f172a' : 'transparent',
            color: activeTab === tab.key ? '#f1f5f9' : '#64748b',
            border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
            transition: 'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && riskReport && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            {MOCK_TANKS.map(tank => (
              <TankCard
                key={tank.tankId}
                tank={tank}
                variance={riskReport.wetstockVarianceSummary[tank.tankId] ?? 0}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'variances' && riskReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {riskReport.anomalyTimeline.length === 0 ? (
            <div style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
              padding: 40, textAlign: 'center', color: '#4ade80', fontSize: 15
            }}>
              ✓ No variances detected for current period.
            </div>
          ) : (
            riskReport.anomalyTimeline.map((event, i) => (
              <div key={i} style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 16
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <SeverityChip severity={event.severity} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{event.category}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{event.entity}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
                    {new Date(event.timestamp).toLocaleTimeString('en-IN')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{event.message}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                  Δ {event.delta.toFixed(2)} {event.unit}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'nozzles' && riskReport && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {MOCK_NOZZLES.map(nozzle => (
            <NozzleCard
              key={nozzle.nozzleId}
              nozzle={nozzle}
              hasRollback={riskReport.nozzleRollbacksDetected.includes(nozzle.nozzleId)}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24,
          textAlign: 'center', color: '#64748b', fontSize: 14
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📜</div>
          Historical dip data will appear here once shifts are processed and snapshots locked.
          <br />
          <span style={{ fontSize: 12 }}>Snapshots from last 30 days will be surfaced via the Hydration Controller.</span>
        </div>
      )}
    </div>
  );
}
