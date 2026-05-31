import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Thermometer, ShieldAlert, Sparkles, CheckSquare, 
  HelpCircle, RefreshCw, BarChart2, Plus, Trash, Droplet
} from 'lucide-react';

export default function WetstockOperationsCenter() {
  const navigate = useNavigate();

  // Tank logs
  const [tanks, setTanks] = useState([
    { tankId: 'tank-01', fuelType: 'HSD', physicalDipMm: 1245, physicalQtyLtr: 14850, automationQtyLtr: 14820, varianceLtr: 30, density: 832.5 },
    { tankId: 'tank-02', fuelType: 'MS', physicalDipMm: 982, physicalQtyLtr: 9540, automationQtyLtr: 9555, varianceLtr: -15, density: 742.0 }
  ]);

  const [newDensityVal, setNewDensityVal] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleDensityChange = (index: number, value: number) => {
    const updated = [...tanks];
    updated[index].density = value;
    setTanks(updated);
  };

  const handleUpdateDips = (index: number, qty: number) => {
    const updated = [...tanks];
    updated[index].physicalQtyLtr = qty;
    updated[index].varianceLtr = qty - updated[index].automationQtyLtr;
    setTanks(updated);
  };

  const totalVariance = tanks.reduce((sum, t) => sum + t.varianceLtr, 0);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] p-6 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/operations/command-center')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#1A1A1A] transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO COMMAND CENTER
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#D35400]/10 p-2.5 rounded-2xl text-[#D35400]">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Wetstock Operations Center</h1>
              <p className="text-xs text-[#666666] mt-0.5">Physical tank dips, automated inventories, volumetric variance checks, and fuel density logs.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Detailed Wetstock Logs and Variance Charts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Fuel Tanks table */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Thermometer className="w-4.5 h-4.5 text-[#D35400]" /> Active Fuel Storage Tanks
              </h3>

              <div className="space-y-4">
                {tanks.map((t, idx) => (
                  <div key={t.tankId} className="p-4 bg-[#F9F9F8] border border-[#EBEBEA] rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-[#1A1A1A]">{t.tankId} ({t.fuelType})</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                        Math.abs(t.varianceLtr) > 25
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {Math.abs(t.varianceLtr) > 25 ? 'High Variance Warning' : 'Variance Clear'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Physical Dips (Ltrs)</span>
                        <input
                          type="number"
                          value={t.physicalQtyLtr}
                          onChange={(e) => handleUpdateDips(idx, Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Automation Stock</span>
                        <span className="text-xs font-mono font-bold block py-2.5 px-3 border border-[#EBEBEA] bg-[#F3F3F1] rounded-xl min-h-[44px]">
                          {t.automationQtyLtr} L
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#666666] block mb-1">Density (kg/m³)</span>
                        <input
                          type="number"
                          value={t.density}
                          onChange={(e) => handleDensityChange(idx, Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold border border-[#D9D9D6] rounded-xl bg-white focus:outline-none min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated shrinkage/leak detector panel */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 text-[#1A1A1A]">
                <BarChart2 className="w-4.5 h-4.5 text-[#D35400]" /> Volumetric Shrinkage Calibration
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed mb-4">
                Measures the percentage variance of daily inventory. Shrinkage occurs due to temperature expansion or evaporation, but must not exceed 0.25% of throughput.
              </p>
              
              <div className="h-4 bg-[#EBEBEA] rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${Math.abs(totalVariance) > 30 ? 'bg-[#C62828]' : 'bg-[#2E7D32]'}`}
                  style={{ width: '45%' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#666666] font-bold">
                <span>Safe Limit: +/- 50 Litres</span>
                <span className={Math.abs(totalVariance) > 30 ? 'text-[#C62828]' : 'text-[#2E7D32]'}>
                  Current Variance: {totalVariance.toFixed(1)} Litres
                </span>
              </div>
            </div>

          </div>

          {/* Sidebar cards: Stock Movements & Densitometers */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Leak Suspect status */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-2">
                Underground Leak Alert
              </h3>
              <div className="text-2xl font-black text-[#2E7D32]">ZERO LEAKS</div>
              <p className="text-[10px] text-[#666666] leading-relaxed">
                Daily volumetric tracking reports show no anomalous temperature or drystock drops. Seals are intact.
              </p>
            </div>

            {/* Tank Densitometers Panel */}
            <div className="bg-white border border-[#EBEBEA] rounded-3xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-[#666666] tracking-wider mb-1">
                Fuel Density Standards
              </h3>
              <div className="space-y-2 text-[10px] text-[#666666] leading-relaxed">
                <div className="p-3 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl">
                  <strong>High Speed Diesel (HSD):</strong>
                  <span className="block mt-0.5 font-mono text-[#1A1A1A] font-bold">Expected: 820.0 - 860.0 kg/m³</span>
                </div>
                <div className="p-3 bg-[#F9F9F8] border border-[#EBEBEA] rounded-xl">
                  <strong>Motor Spirit (Petrol / MS):</strong>
                  <span className="block mt-0.5 font-mono text-[#1A1A1A] font-bold">Expected: 720.0 - 775.0 kg/m³</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
