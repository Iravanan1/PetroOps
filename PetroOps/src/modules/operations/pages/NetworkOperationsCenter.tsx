import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Activity, ShieldCheck, AlertTriangle, 
  TrendingUp, Download, CheckCircle, RefreshCw, Smartphone
} from 'lucide-react';
import { StationHealthScoringEngine, StationHealthGrade } from '../StationHealthScoringEngine';

interface StationStatus {
  id: string;
  name: string;
  location: string;
  online: boolean;
  revenue: number;
  shortages: number;
  variance: number;
  ocrAccuracy: number;
  health: StationHealthGrade;
}

export default function NetworkOperationsCenter() {
  const navigate = useNavigate();
  const [selectedStationId, setSelectedStationId] = useState<string>('pune');
  const [stations, setStations] = useState<StationStatus[]>([]);

  useEffect(() => {
    // Generate evaluations for network branches
    const puneHealth = StationHealthScoringEngine.evaluateStation({
      upiMatchRate: 98.4,
      cashShortageSum: 450,
      wetstockVariancePct: -0.32,
      averageDaysToRecoverCredit: 12,
      ocrValidationRate: 96.2
    });

    const mumbaiHealth = StationHealthScoringEngine.evaluateStation({
      upiMatchRate: 91.2,
      cashShortageSum: 2450,
      wetstockVariancePct: -0.92,
      averageDaysToRecoverCredit: 28,
      ocrValidationRate: 88.5
    });

    const delhiHealth = StationHealthScoringEngine.evaluateStation({
      upiMatchRate: 99.1,
      cashShortageSum: 150,
      wetstockVariancePct: -0.15,
      averageDaysToRecoverCredit: 8,
      ocrValidationRate: 98.4
    });

    setStations([
      { id: 'pune', name: 'Pune Highway Potaliya', location: 'NH-4, Khed Shivapur', online: true, revenue: 1452000, shortages: 450, variance: -0.32, ocrAccuracy: 96.2, health: puneHealth },
      { id: 'mumbai', name: 'Mumbai Terminal Branch', location: 'Sion Highway, Sion', online: false, revenue: 1884000, shortages: 2450, variance: -0.92, ocrAccuracy: 88.5, health: mumbaiHealth },
      { id: 'delhi', name: 'Delhi Central Pump', location: 'Outer Ring Rd, Karol Bagh', online: true, revenue: 942000, shortages: 150, variance: -0.15, ocrAccuracy: 98.4, health: delhiHealth }
    ]);
  }, []);

  const selectedStation = stations.find(s => s.id === selectedStationId);

  return (
    <div className="bg-white border border-[#EBEBEA] rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Configuration headers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F9F9F8] border border-[#EBEBEA] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A1A] p-2 rounded-xl text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[#666666] tracking-wider block">Network Selection Desk</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedStationId}
                onChange={e => setSelectedStationId(e.target.value)}
                className="bg-white border border-[#D9D9D6] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none"
              >
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Global overview actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/operations/shift-monitor')}
            className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
          >
            Live Monitor Room
          </button>
          <button
            onClick={() => navigate('/operations/approvals')}
            className="px-4 py-2.5 bg-[#D35400] hover:bg-[#A04000] text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer min-h-[44px]"
          >
            Seals Approvals queue
          </button>
        </div>
      </div>

      {/* Network Station comparison Overview list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stations.map(stn => (
          <div 
            key={stn.id}
            onClick={() => setSelectedStationId(stn.id)}
            className={`p-5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-56 ${
              selectedStationId === stn.id
                ? 'border-[#D35400] bg-amber-50/20 shadow-xs'
                : 'border-[#EBEBEA] hover:border-[#B3B3B3] bg-white'
            }`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-black text-[#1A1A1A] line-clamp-1">{stn.name}</h4>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                  stn.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`} />
              </div>
              <p className="text-[9px] text-[#666666] font-mono uppercase">{stn.location}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-3 border-y border-[#EBEBEA]">
              <div>
                <span className="text-[8px] text-[#666666] uppercase block">Monthly Revenue</span>
                <span className="font-extrabold text-[#1A1A1A]">₹{stn.revenue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[8px] text-[#666666] uppercase block">Shortages (Total)</span>
                <span className="font-extrabold text-rose-700">₹{stn.shortages.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="text-[8px] text-[#666666] uppercase block">Health Grade</span>
                <span className={`text-[10px] font-black uppercase ${
                  stn.health.overallGrade === 'EXCELLENT'
                    ? 'text-emerald-700'
                    : stn.health.overallGrade === 'GOOD'
                      ? 'text-indigo-700'
                      : stn.health.overallGrade === 'FAIR'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                }`}>{stn.health.overallGrade} ({stn.health.overallScore})</span>
              </div>

              <span className="text-[9px] font-mono font-bold text-[#666666]">OCR: {stn.ocrAccuracy}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Station Detailed Breakdown */}
      {selectedStation && (
        <div className="border border-[#EBEBEA] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#EBEBEA]">
            <div>
              <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-tight">Health Analysis: {selectedStation.name}</h4>
              <p className="text-[9px] text-[#666666] font-mono mt-0.5">Location: {selectedStation.location}</p>
            </div>

            <span className={`text-[10px] px-3 py-1 rounded-xl font-black uppercase ${
              selectedStation.health.overallGrade === 'EXCELLENT'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : selectedStation.health.overallGrade === 'GOOD'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : selectedStation.health.overallGrade === 'FAIR'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              Grade: {selectedStation.health.overallGrade} ({selectedStation.health.overallScore}/100)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scorecard breakdowns */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-[#666666] block">Component Performance scorecards</span>
              
              <div className="space-y-3">
                {selectedStation.health.breakdowns.map((b, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#1A1A1A]">
                      <span className="text-[#666666] uppercase text-[9px]">{b.component}</span>
                      <span>{b.score}/100</span>
                    </div>
                    <div className="h-2 bg-[#F3F3F1] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          b.score > 90
                            ? 'bg-emerald-500'
                            : b.score > 70
                              ? 'bg-indigo-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${b.score}%` }}
                      />
                    </div>
                    <span className="block text-[8px] text-[#666666] font-bold mt-0.5">{b.explanation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Warnings lists */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-[#666666] block">Active Station Alarm Risks</span>
              {selectedStation.health.riskIndicators.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedStation.health.riskIndicators.map((risk, i) => (
                    <div key={i} className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-950 flex items-start gap-2 text-[10px] font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs font-bold text-emerald-800 border border-emerald-100 rounded-2xl bg-emerald-50/20">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-700 animate-bounce-slow" />
                  No severe operational alarm indicators. Station performing excellently!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
