import React, { useEffect, useState, useRef } from 'react';
import { CanonicalSnapshot } from '../modules/snapshots/CanonicalSnapshotEngine';
import { AccountingEngine } from '../modules/accounting/AccountingEngine';
import { PDFExportService } from '../modules/shared/PDFExportService';
import { CSVExportService } from '../modules/shared/CSVExportService';

/**
 * DailyClosingSheet
 * ─────────────────
 * Print-optimised daily financial summary dashboard.
 * Routes: /reports/daily, /reports/transactions, /reports/audits
 *
 * Uses CSS page-break rules to format cleanly for A4 physical printing.
 * Dashboard cards are hidden in print mode; tabular sections are preserved.
 */

const MOCK_BRANCH_ID = 'potaliya_station_001';

function useDailySnapshot(branchId: string, date: string) {
  const [snapshot, setSnapshot] = useState<CanonicalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    AccountingEngine.getSnapshot(branchId, date, 'daily')
      .then(snap => { setSnapshot(snap); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [branchId, date]);

  return { snapshot, loading, error };
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatusBadge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    background: ok ? '#dcfce7' : '#fee2e2',
    color: ok ? '#166534' : '#991b1b',
    border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`
  }}>{ok ? '✓' : '✗'} {label}</span>
);

const SummaryRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label, value, highlight = false
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    background: highlight ? '#fefce8' : 'transparent'
  }}>
    <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
    <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{value}</span>
  </div>
);

export default function DailyClosingSheet() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const { snapshot, loading, error } = useDailySnapshot(MOCK_BRANCH_ID, selectedDate);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!snapshot) return;
    PDFExportService.printDailyClosingSheet(snapshot, [], {
      branchName: 'Potaliya Petroleum Station',
      title: 'Daily Closing Balance Sheet',
      thermalMode: false
    });
  };

  const handleThermalPrint = () => {
    if (!snapshot) return;
    PDFExportService.printDailyClosingSheet(snapshot, [], {
      branchName: 'Potaliya Petroleum',
      title: 'Daily Closing',
      thermalMode: true
    });
  };

  const handleCSVExport = () => {
    if (!snapshot) return;
    CSVExportService.exportSnapshotSummary([snapshot], 'Potaliya_Station');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 16 }}>Loading closing data…</div>
      </div>
    );
  }

  return (
    <>
      {/* ── Print stylesheet ──────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { page-break-inside: avoid; }
          .print-break-before { page-break-before: always; }
          body { background: white !important; color: black !important; }
          .report-card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: '24px'
      }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="no-print" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                📊 Daily Closing Sheet
              </h1>
              <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
                Replay-verified · Immutable · Approved
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13
                }}
              />
              <button onClick={handleCSVExport} style={{
                background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
              }}>⬇ CSV</button>
              <button onClick={handleThermalPrint} style={{
                background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
              }}>🧾 Thermal</button>
              <button onClick={handlePrint} style={{
                background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
              }}>🖨 Print A4</button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 10,
            padding: '12px 16px', color: '#fca5a5', marginBottom: 20
          }}>⚠ {error}</div>
        )}

        {!snapshot ? (
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 14,
            padding: 40, textAlign: 'center', color: '#64748b'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15 }}>No closing data found for {selectedDate}.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Process a shift first to generate a snapshot.</div>
          </div>
        ) : (
          <div ref={printRef}>
            {/* ── Status Bar ──────────────────────────────────────── */}
            <div className="print-section" style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 12, padding: '14px 20px', marginBottom: 20,
              display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'
            }}>
              <StatusBadge ok={snapshot.isLocked} label="LOCKED" />
              <StatusBadge ok={snapshot.isBalanced} label="BALANCED" />
              <StatusBadge ok={snapshot.isValid} label="VALID" />
              <StatusBadge ok={snapshot.carryForwardMatch} label="CARRY-FWD MATCH" />
              <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>
                Checksum: <code style={{ color: '#22d3ee' }}>{snapshot.replayChecksum}</code>
              </div>
            </div>

            {/* ── Main Grid ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* Cash Card */}
              <div className="report-card print-section" style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20
              }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  💰 Cash Summary
                </div>
                <SummaryRow label="Opening Cash" value={fmt(snapshot.openingCash)} />
                <SummaryRow label="Closing Cash (Till)" value={fmt(snapshot.closingCash)} highlight />
                <SummaryRow label="Cash Collected" value={fmt(snapshot.totalCashCollected)} />
              </div>

              {/* Revenue Card */}
              <div className="report-card print-section" style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20
              }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  ⛽ Revenue
                </div>
                <SummaryRow label="Total Fuel Revenue" value={fmt(snapshot.totalRevenue)} highlight />
                <SummaryRow label="UPI Settlements" value={fmt(snapshot.totalUPISettled)} />
                <SummaryRow label="Card Settlements" value={fmt(snapshot.totalCardSettled)} />
              </div>

              {/* Credit Card */}
              <div className="report-card print-section" style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20
              }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  📑 Credit
                </div>
                <SummaryRow label="Credit Sales" value={fmt(snapshot.totalOutstandingCredit)} />
                <SummaryRow label="Credit Recovered" value={fmt(snapshot.totalCreditRecovered)} />
                <SummaryRow label="Expenses Paid" value={fmt(snapshot.totalExpensesPaid)} />
              </div>

              {/* Wetstock Card */}
              <div className="report-card print-section" style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20
              }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  🛢 Wet Stock
                </div>
                <SummaryRow
                  label="Wet Stock Variance"
                  value={`${snapshot.wetstockVariance.toFixed(2)} L`}
                  highlight={Math.abs(snapshot.wetstockVariance) > 5}
                />
                <SummaryRow label="Locked At" value={new Date(snapshot.lockedAt).toLocaleTimeString('en-IN')} />
              </div>
            </div>

            {/* ── Account Balances Table ───────────────────────────── */}
            <div className="report-card print-section print-break-before" style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 20, marginBottom: 20
            }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                📒 Account Balances (Replay-Verified)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Account</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Balance (INR)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(snapshot.balances) as [string, number][]).map(([account, balance]) => (
                    <tr key={account} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '9px 14px', color: '#e2e8f0' }}>{account}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: balance >= 0 ? '#4ade80' : '#f87171' }}>
                        {fmt(balance)}
                      </td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
                        {['Fuel Revenue'].includes(account) ? 'CREDIT' : 'DEBIT'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
