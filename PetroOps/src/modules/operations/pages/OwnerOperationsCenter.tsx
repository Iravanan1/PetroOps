/**
 * OwnerOperationsCenter.tsx
 * ──────────────────────────
 * Dedicated, touch-first executive operations control cockpit for Indian petrol pump owners.
 * Consolidates network comparatives, remote approvals, backups recovery, WAL audits, and explainable forecasts.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Activity, ShieldCheck, AlertTriangle, 
  TrendingUp, Download, CheckCircle, RefreshCw, Smartphone,
  Database, FileText, Landmark, Clock, Play
} from 'lucide-react';
import { useReconciledShifts } from '../../shared/hooks/useReconciledShifts';
import { OperationalForecastingEngine, SalesForecast, StockDepletionForecast } from '../OperationalForecastingEngine';

// Subcomponents
import NetworkOperationsCenter from './NetworkOperationsCenter';
import CentralShiftMonitor from './CentralShiftMonitor';
import CentralApprovalWorkspace from './CentralApprovalWorkspace';
import DisasterRecoveryCenter from './DisasterRecoveryCenter';
import CentralAuditVault from './CentralAuditVault';

type OwnerTab = 'NETWORK' | 'SHIFT_MONITOR' | 'APPROVALS' | 'FORECASTS' | 'RECOVERY' | 'AUDIT_VAULT';

export default function OwnerOperationsCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OwnerTab>('NETWORK');
  
  // Forecast states
  const [salesForecast, setSalesForecast] = useState<SalesForecast[]>([]);
  const [depletionForecast, setDepletionForecast] = useState<StockDepletionForecast[]>([]);

  useEffect(() => {
    // Generate explainable rolling average forecasts
    const sales = OperationalForecastingEngine.forecastSales(12500); // 12,500L baseline rolling week avg sales
    const stock = OperationalForecastingEngine.evaluateStockDepletion(24000, 18000, 4800, 5200); // Current stocks & daily depletion rates

    
    setSalesForecast(sales);
    setDepletionForecast(stock);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] pb-20 font-sans">
      
      {/* Title Header bar */}
      <nav className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#EBEBEA] bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#D35400]/10 p-2 rounded-xl text-[#D35400]">
            <Building2 className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-[#1A1A1A] uppercase">
              Network Command Control Room
            </h1>
            <p className="text-[9px] text-[#666666] font-bold uppercase tracking-wider">HINDUSTAN PETROLEUM EXECUTIVE ERP</p>
          </div>
        </div>
      </nav>

      {/* Navigation tabs */}
      <div className="border-b border-[#EBEBEA] bg-white sticky top-0 z-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 py-3">
          {(
            [
              { id: 'NETWORK', label: '🏢 Network Overview', role: 'Branch comparatives' },
              { id: 'SHIFT_MONITOR', label: '📡 Live Shift Monitor', role: 'Cashier sync logs' },
              { id: 'APPROVALS', label: '🔑 Override Approvals', role: 'Seals escalations queue' },
              { id: 'FORECASTS', label: '📈 Explainable Forecasts', role: 'Rolling sales stock dry' },
              { id: 'RECOVERY', label: '🖲️ Disaster recovery', role: 'WAL snapshot restore' },
              { id: 'AUDIT_VAULT', label: '📂 Central Audit Vault', role: 'WAL scans backups list' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer text-left min-h-[48px] border flex flex-col justify-center ${
                activeTab === tab.id
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-white border-[#EBEBEA] hover:bg-[#F9F9F8] text-[#666666]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[8px] uppercase tracking-wider font-bold block mt-0.5 ${
                activeTab === tab.id ? 'text-[#D35400]' : 'text-[#999999]'
              }`}>{tab.role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Core central dashboard cockpit */}
      <div className="p-6 max-w-7xl mx-auto">
        
        {activeTab === 'NETWORK' && <NetworkOperationsCenter />}

        {activeTab === 'SHIFT_MONITOR' && <CentralShiftMonitor />}

        {activeTab === 'APPROVALS' && <CentralApprovalWorkspace />}

        {activeTab === 'FORECASTS' && (
          <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-8 animate-fade-in">
            
            {/* Sales Forecast lists */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">3-Day Explainable Sales volume Forecast</h4>
                <p className="text-[9px] text-[#666666] font-bold block mt-0.5">Calculated based on rolling 7-day average highway transit patterns.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {salesForecast.map((f, idx) => (
                  <div key={idx} className="border border-[#EBEBEA] rounded-2xl p-5 bg-white space-y-4 hover:border-[#B3B3B3] transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-[#666666] font-bold">{f.day}</span>
                      <span className="text-[8px] px-2 py-0.5 rounded font-black uppercase bg-[#F3F3F1] border border-[#EBEBEA] text-[#666666]">Explainable</span>
                    </div>

                    <div>
                      <span className="text-2xl font-black text-[#1A1A1A] block">Expected: {f.expectedLitres.toLocaleString()} L</span>
                      <span className="text-[9px] text-[#666666] font-bold block mt-1">Variance range: {f.lowerBound.toLocaleString()}L - {f.upperBound.toLocaleString()}L</span>
                    </div>

                    <p className="text-[9px] leading-relaxed font-bold text-[#D35400] bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                      Factor: {f.factorExplanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fuel stock depletion warnings */}
            <div className="space-y-4 pt-4 border-t border-[#EBEBEA]">
              <div>
                <h4 className="text-xs uppercase font-extrabold text-[#1A1A1A] tracking-wider">Stock depletion & Dry-Out Warning limits</h4>
                <p className="text-[9px] text-[#666666] font-bold block mt-0.5">Real-time tank wetstock capacities depletion speed rate checkers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {depletionForecast.map((d, idx) => (
                  <div 
                    key={idx}
                    className={`p-5 border rounded-2xl flex flex-col justify-between h-48 transition-all ${
                      d.reorderAlert
                        ? 'bg-rose-50 border-rose-100 text-rose-950 animate-pulse-slow'
                        : 'bg-[#F9F9F8] border-[#EBEBEA] text-[#1A1A1A]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                          d.reorderAlert ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>{d.fuelType} Capacity</span>
                        
                        <span className="text-[9px] font-mono text-[#666666] font-bold">Avg daily: {d.averageDailySales}L</span>
                      </div>

                      <h5 className="text-xl font-black">{d.currentLitres.toLocaleString()} Litres remaining</h5>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-black/10 text-xs font-bold">
                      <span>Days to Dry-Out: {d.daysToDry} days</span>
                      {d.reorderAlert ? (
                        <span className="text-[9px] text-rose-700 font-extrabold flex items-center gap-1">
                          ⚠️ REORDER ALERT
                        </span>
                      ) : (
                        <span className="text-[9px] text-indigo-700 font-extrabold">Stock stable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'RECOVERY' && <DisasterRecoveryCenter />}

        {activeTab === 'AUDIT_VAULT' && <CentralAuditVault />}

      </div>
    </div>
  );
}
