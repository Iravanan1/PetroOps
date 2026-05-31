import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Printer, TrendingUp, TrendingDown,
  UserCheck, Fuel, Activity, Database, AlertOctagon, Clock,
  ArrowRight, ShieldAlert, Award, FileText, CheckCircle2, ChevronRight,
  TrendingUp as TrendUpIcon, Users, IndianRupee, ClipboardList, Settings
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getSeededOperationalData } from './Dashboard';

export default function SingleDayOperationCenter() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Core stats
  const [dayData, setDayData] = useState<{
    date: string;
    totalSales: number;
    petrolSales: number;
    dieselSales: number;
    nozzleSales: Array<{ id: string; name: string; fuel: string; open: number; close: number; litres: number; rate: number; sales: number }>;
    tanks: Array<{ name: string; fuel: string; capacity: number; open: number; received: number; close: number; bookExpected: number; variance: number }>;
    shifts: Array<{ id: string; label: string; supervisor: string; collections: number; shortage: number; status: string }>;
    anomalies: Array<{ id: string; message: string; severity: 'high' | 'medium' | 'low'; category: string }>;
    operators: Array<{ name: string; shift: string; fuelSoldLiters: number; cashCollected: number; rating: number }>;
    expenses: Array<{ category: string; amount: number; description: string }>;
    reconciliation: {
      openingCash: number;
      fuelRevenue: number;
      creditRecovery: number;
      payouts: number;
      expectedCash: number;
      actualCash: number;
      cashDifference: number;
    };
  } | null>(null);

  // Load and construct day stats
  useEffect(() => {
    setLoading(true);
    // Simulate API fetch delay
    setTimeout(() => {
      const activeDate = date || '2026-05-28';
      const allShifts = getSeededOperationalData();
      const shiftsForDay = allShifts.filter(s => s.shiftDate === activeDate);

      // Core fallback values
      let totalSales = 0;
      let petrolSales = 0;
      let dieselSales = 0;
      const shiftsList: any[] = [];
      const nozzleSalesMap = new Map<string, any>();

      if (shiftsForDay.length > 0) {
        shiftsForDay.forEach(s => {
          const shiftTotal = s.actualCash + s.cardSales + s.upiSales + s.creditSales - s.expenses;
          totalSales += shiftTotal;

          shiftsList.push({
            id: s.id,
            label: s.shiftLabel,
            supervisor: s.shiftLabel.includes('Morning') ? 'Ramesh Kumar' : 'Sanjay Kumar',
            collections: shiftTotal,
            shortage: s.cashShortage,
            status: s.status
          });

          // Aggregate nozzle readings
          s.readings?.forEach(r => {
            const litres = r.closing - r.opening - r.testing;
            const salesVal = litres * r.rate;
            if (r.fuel.toLowerCase().includes('speed') || r.fuel.toLowerCase().includes('ms')) {
              petrolSales += salesVal;
            } else {
              dieselSales += salesVal;
            }

            const existing = nozzleSalesMap.get(r.fuel) || { open: r.opening, close: r.closing, litres: 0, sales: 0, rate: r.rate };
            nozzleSalesMap.set(r.fuel, {
              open: Math.min(existing.open, r.opening),
              close: Math.max(existing.close, r.closing),
              litres: existing.litres + litres,
              sales: existing.sales + salesVal,
              rate: r.rate
            });
          });
        });
      } else {
        totalSales = 146600;
        petrolSales = 54200;
        dieselSales = 92400;
        nozzleSalesMap.set('Speed 97', { open: 10450, close: 10970, litres: 520, sales: 54200, rate: 104.2 });
        nozzleSalesMap.set('High-Speed Diesel', { open: 24090, close: 25090, litres: 1000, sales: 92400, rate: 92.4 });
        
        shiftsList.push(
          { id: 'shift-1', label: 'Morning Shift A', supervisor: 'Ramesh Kumar', collections: 71200, shortage: 150, status: 'APPROVED' },
          { id: 'shift-2', label: 'Evening Shift B', supervisor: 'Sanjay Kumar', collections: 75400, shortage: -120, status: 'PENDING_REVIEW' }
        );
      }

      const nozzleList = Array.from(nozzleSalesMap.entries()).map(([fuel, data], idx) => ({
        id: `nozzle-${idx + 1}`,
        name: `Nozzle #${idx + 1} (${fuel})`,
        fuel,
        ...data
      }));

      // Tanks details
      const msLitres = nozzleSalesMap.get('Speed 97')?.litres || 520;
      const hsdLitres = nozzleSalesMap.get('High-Speed Diesel')?.litres || 1000;

      const tanksList = [
        {
          name: 'Main Tank 1 (Petrol)',
          fuel: 'Speed 97',
          capacity: 25000,
          open: 18400,
          received: 0,
          close: 17850,
          bookExpected: 18400 - msLitres,
          variance: 17850 - (18400 - msLitres)
        },
        {
          name: 'Main Tank 2 (Diesel)',
          fuel: 'High-Speed Diesel',
          capacity: 45000,
          open: 31200,
          received: 10000,
          close: 40150,
          bookExpected: 31200 + 10000 - hsdLitres,
          variance: 40150 - (31200 + 10000 - hsdLitres)
        }
      ];

      // Anomaly list mapping
      const anomaliesList: any[] = [];
      if (shiftsForDay.length > 0) {
        shiftsForDay.forEach(s => {
          if (s.ocrConfidence < 85) {
            anomaliesList.push({
              id: `${s.id}-low-conf`,
              message: `Low scan reading confidence (${s.ocrConfidence}%) on ${s.shiftLabel}`,
              severity: 'medium',
              category: 'scan'
            });
          }
          if (Math.abs(s.cashShortage) > 1500) {
            anomaliesList.push({
              id: `${s.id}-cash-short`,
              message: `High Cash Difference (INR ${s.cashShortage.toLocaleString()}) on ${s.shiftLabel}`,
              severity: 'high',
              category: 'cash'
            });
          }
        });
      } else {
        anomaliesList.push(
          { id: 'anom-1', message: 'Low scan reading confidence (78%) on Morning Shift A', severity: 'medium', category: 'scan' },
          { id: 'anom-2', message: 'High Cash Difference (INR -1,200) on Evening Shift B', severity: 'high', category: 'cash' }
        );
      }

      // 1. Operator summaries details
      const operatorsList = [
        { name: 'Ramesh Attendant', shift: 'Morning Shift A', fuelSoldLiters: 760, cashCollected: 71200, rating: 5 },
        { name: 'Sanjay Kumar', shift: 'Evening Shift B', fuelSoldLiters: 780, cashCollected: 75400, rating: 4 },
        { name: 'Sunil Patil', shift: 'Night Duty C', fuelSoldLiters: 0, cashCollected: 0, rating: 5 }
      ];

      // 2. Local expenses list details
      const expensesList = [
        { category: 'Generator Diesel', amount: 1500, description: 'Power backup backup fuel buy' },
        { category: 'Tea & Refreshment', amount: 350, description: 'Forecourt attendant daily snacks' },
        { category: 'Forecourt Cleaning', amount: 500, description: 'Bay washing detergent buys' }
      ];

      // 3. Cash reconciliation ledger details
      const reconciliationDetails = {
        openingCash: 5000,
        fuelRevenue: petrolSales + dieselSales,
        creditRecovery: 8000,
        payouts: 2350,
        expectedCash: 5000 + (petrolSales + dieselSales) + 8000 - 2350,
        actualCash: 5000 + (petrolSales + dieselSales) + 8000 - 2350 - 1200,
        cashDifference: -1200
      };

      setDayData({
        date: activeDate,
        totalSales,
        petrolSales,
        dieselSales,
        nozzleSales: nozzleList,
        tanks: tanksList,
        shifts: shiftsList,
        anomalies: anomaliesList,
        operators: operatorsList,
        expenses: expensesList,
        reconciliation: reconciliationDetails
      });
      setLoading(false);
    }, 300);
  }, [date]);

  if (loading || !dayData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b13]">
        <div className="text-center space-y-4 animate-pulse">
          <Fuel className="w-10 h-10 text-orange-500 mx-auto animate-bounce" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-mono">Loading HPCL Potaliya Operations...</p>
        </div>
      </div>
    );
  }

  const printSummary = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] p-6 sm:p-8 font-sans">
      {/* Back & Breadcrumbs */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-900/60 hover:bg-slate-800 rounded-2xl border border-slate-800/40 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span>Potaliya Petroleum</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span>Operational History</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-300 font-black">{dayData.date}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-800/40">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#B45309] bg-[#B45309]/10 border border-[#B45309]/20 rounded-full">
              HPCL Potaliya Petroleum
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Fully Audited Day
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-orange-500" /> Daily History Center
          </h1>
          <p className="text-sm text-slate-400 font-light mt-1">Single-day summarized pump collections, fuel stock variance, and supervisor shifts.</p>
        </div>

        <button
          onClick={printSummary}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all bg-slate-900 border border-slate-800 text-slate-300 hover:text-white print:hidden"
        >
          <Printer className="w-4 h-4" /> Print Daily Receipt
        </button>
      </div>

      {/* Daily Visual Sales Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Sales Circular Metric */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">Total Revenue</p>
            <p className="text-3xl font-black text-white font-mono">₹{dayData.totalSales.toLocaleString('en-IN')}</p>
            <p className="text-[9px] text-slate-500 font-medium mt-1">Sum of cash, upi, cards & credit</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-[#B45309] border-t-[#B45309]/20 flex items-center justify-center animate-spin-slow">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
        </div>

        {/* Petrol Sales Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">Petrol Sold (MS)</p>
            <p className="text-3xl font-black text-orange-400 font-mono">₹{dayData.petrolSales.toLocaleString('en-IN')}</p>
            <p className="text-[9px] text-slate-500 font-medium mt-1">Including Speed 97 premium fuel</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        {/* Diesel Sales Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">Diesel Sold (HSD)</p>
            <p className="text-3xl font-black text-blue-400 font-mono">₹{dayData.dieselSales.toLocaleString('en-IN')}</p>
            <p className="text-[9px] text-slate-500 font-medium mt-1">Standard high-speed diesel</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Fuel className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* OPERATOR-FRIENDLY VISUAL GRAPHS PANEL */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40 mb-8 space-y-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" /> Attendant-Friendly Visual Analytics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Graph 1: Volume Comparison (Petrol vs Diesel) */}
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Fuel Volume Comparison</span>
              <span className="text-xs font-semibold text-slate-350">Liters sold comparisons</span>
            </div>
            
            {/* Inline SVG Bar Graph */}
            <div className="py-2">
              <svg viewBox="0 0 100 50" className="w-full h-24">
                {/* Background grid lines */}
                <line x1="10" y1="5" x2="90" y2="5" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="10" y1="20" x2="90" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="10" y1="35" x2="90" y2="35" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="10" y1="45" x2="90" y2="45" stroke="#334155" strokeWidth="1" />
                
                {/* Petrol Bar (Orange) */}
                <rect x="25" y="25" width="16" height="20" rx="3" fill="url(#orange-grad)" />
                <text x="33" y="21" textAnchor="middle" fill="#f97316" fontSize="5" fontWeight="bold" fontFamily="monospace">520 L</text>
                <text x="33" y="49" textAnchor="middle" fill="#64748b" fontSize="4.5" fontWeight="bold">PETROL</text>
                
                {/* Diesel Bar (Blue) */}
                <rect x="58" y="10" width="16" height="35" rx="3" fill="url(#blue-grad)" />
                <text x="66" y="6" textAnchor="middle" fill="#3b82f6" fontSize="5" fontWeight="bold" fontFamily="monospace">1000 L</text>
                <text x="66" y="49" textAnchor="middle" fill="#64748b" fontSize="4.5" fontWeight="bold">DIESEL</text>

                {/* Gradients definitions */}
                <defs>
                  <linearGradient id="orange-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#7c2d12" />
                  </linearGradient>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Graph 2: Hourly Sales Activity (Busiest Hours Trend) */}
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Hourly Sales Velocity</span>
              <span className="text-xs font-semibold text-slate-350">Peak customer traffic hours</span>
            </div>
            
            {/* Inline SVG Sparkline Curve Chart */}
            <div className="py-2">
              <svg viewBox="0 0 100 45" className="w-full h-24">
                {/* Area Fill Gradient under Sparkline */}
                <path d="M 5 40 Q 20 5, 35 30 T 65 15 T 95 40 Z" fill="url(#spark-area)" opacity="0.15" />
                
                {/* Sparkline Curve */}
                <path d="M 5 40 Q 20 5, 35 30 T 65 15 T 95 40" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Peak Indicator Dot */}
                <circle cx="21" cy="7" r="3.5" fill="#f97316" stroke="#0f172a" strokeWidth="1" className="animate-pulse" />
                <text x="21" y="3" textAnchor="middle" fill="#f97316" fontSize="5" fontWeight="bold">09:00 AM PEAK</text>
                
                {/* Baseline */}
                <line x1="5" y1="40" x2="95" y2="40" stroke="#334155" strokeWidth="1" />
                
                {/* Time markers labels */}
                <text x="5" y="44" textAnchor="start" fill="#64748b" fontSize="4">06:00 AM</text>
                <text x="50" y="44" textAnchor="middle" fill="#64758b" fontSize="4">12:00 PM</text>
                <text x="95" y="44" textAnchor="end" fill="#64748b" fontSize="4">10:00 PM</text>

                <defs>
                  <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Graph 3: Depletion Timeline (Main Tanks) */}
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Fuel Depletion Rate</span>
              <span className="text-xs font-semibold text-slate-350">Days to stock replenishment limit</span>
            </div>
            
            {/* Inline SVG Depletion Gauge */}
            <div className="py-2 flex flex-col gap-3 justify-center h-full">
              {/* Petrol depletion bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono font-bold">
                  <span className="text-orange-400">Petrol Stock Life</span>
                  <span className="text-white">41 Days Left</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all" style={{ width: '71.5%' }} />
                </div>
              </div>

              {/* Diesel depletion bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono font-bold">
                  <span className="text-blue-400">Diesel Stock Life</span>
                  <span className="text-white">35 Days Left</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all" style={{ width: '89.2%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Core Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left Column (2-span): Nozzle, Tank, Expenses & Cash Reconciliation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Nozzle-Wise Sales (Fuel Sold) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Fuel Sold by Nozzle (Click to Drill-Down)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayData.nozzleSales.map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate(`/wetstock-intel/nozzles`)}
                  className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl cursor-pointer hover:border-orange-500/40 hover:scale-[1.02] transition-all group"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-bold text-slate-300 group-hover:text-orange-400 transition-colors">{n.name}</span>
                    <span className="text-[10px] font-black font-mono bg-slate-950 px-2 py-0.5 rounded text-slate-500">₹{n.rate}/L</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Fuel Sold:</span>
                    <span className="font-bold text-slate-200">{n.litres} Litres</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Sales Value:</span>
                    <span className="font-extrabold text-orange-400">₹{n.sales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-600 font-semibold group-hover:text-slate-400 transition-all">
                    <span>Meters: {n.open}L → {n.close}L</span>
                    <span className="flex items-center gap-0.5">Drill Down <ArrowRight className="w-2.5 h-2.5" /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tank-Wise Fuel Stock (Visual Dips) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" /> Fuel Stock by Tank
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dayData.tanks.map(t => {
                const fillPct = (t.close / t.capacity) * 100;
                return (
                  <div
                    key={t.name}
                    onClick={() => navigate('/reconciliation/wetstock')}
                    className="p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl cursor-pointer hover:border-blue-500/40 transition-all flex gap-4 items-center group"
                  >
                    {/* Visual Cylinder */}
                    <div className="w-14 h-24 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex-shrink-0">
                      <div
                        className="absolute bottom-0 left-0 w-full transition-all duration-500"
                        style={{
                          height: `${fillPct}%`,
                          background: t.fuel.includes('Diesel')
                            ? 'linear-gradient(to top, #1e3a8a, #3b82f6)'
                            : 'linear-gradient(to top, #78350f, #b45309)'
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black font-mono text-slate-400 group-hover:text-white">
                        {fillPct.toFixed(0)}%
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">{t.fuel}</p>
                      <div className="mt-2.5 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Opening Stock:</span>
                          <span className="font-medium text-slate-200">{t.open} L</span>
                        </div>
                        {t.received > 0 && (
                          <div className="flex justify-between text-emerald-400 font-semibold">
                            <span>Replenished:</span>
                            <span>+{t.received} L</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Closing Stock:</span>
                          <span className="font-bold text-slate-200">{t.close} L</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800/60 font-semibold">
                          <span className="text-slate-500">Fuel Mismatch:</span>
                          <span className={t.variance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {t.variance > 0 ? `+${t.variance}` : t.variance} L
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cash Reconciliation Ledger Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-500" /> Counted Cash Reconciliation Sheet
            </h2>
            <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block">OPENING FLOAT</span>
                  <span className="text-slate-200 font-bold">₹{dayData.reconciliation.openingCash.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block">FUEL REVENUE</span>
                  <span className="text-slate-200 font-bold">₹{dayData.reconciliation.fuelRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block">CREDIT RECOVERY</span>
                  <span className="text-emerald-400 font-bold">+₹{dayData.reconciliation.creditRecovery.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block">PAIDOUTS (EXPENSES)</span>
                  <span className="text-rose-400 font-bold">-₹{dayData.reconciliation.payouts.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 text-xs">
                <div className="font-semibold text-slate-400">EXPECTED CASH IN TILL:</div>
                <div className="font-mono font-bold text-slate-200">₹{dayData.reconciliation.expectedCash.toLocaleString('en-IN')}</div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="font-semibold text-slate-400">COUNTED PHYSICAL CASH:</div>
                <div className="font-mono font-bold text-slate-200">₹{dayData.reconciliation.actualCash.toLocaleString('en-IN')}</div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs mt-2">
                <div className="font-black text-rose-300">CASH DIFFERENCE (SHORTAGE):</div>
                <div className="font-mono font-black text-rose-400">₹{dayData.reconciliation.cashDifference.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Daily Forecourt Expenses Ledger */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-rose-400" /> Daily Forecourt Expenses
            </h2>
            <div className="space-y-3">
              {dayData.expenses.map((exp, idx) => (
                <div key={idx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{exp.category}</span>
                    <span className="text-[10px] text-slate-500 leading-none">{exp.description}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-rose-400">-₹{exp.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              
              <div className="pt-2 flex justify-between text-xs font-mono font-black border-t border-slate-800/60">
                <span className="text-slate-400 uppercase">Total Cash Expenses:</span>
                <span className="text-rose-400">₹{dayData.reconciliation.payouts.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Shift summaries, Operator summaries, Suspicious activity, and AI forecasting */}
        <div className="space-y-6">
          
          {/* Shift Summaries */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" /> Shift Summaries (Click to Review)
            </h2>
            <div className="space-y-3">
              {dayData.shifts.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => navigate(`/operations/shifts/${s.id}`)}
                  className="p-3.5 bg-slate-900/40 border border-slate-800/60 hover:border-orange-500/30 rounded-2xl flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{s.label}</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Supervisor: {s.supervisor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-200">₹{s.collections.toLocaleString('en-IN')}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border inline-block mt-1 ${
                      s.status === 'APPROVED' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {s.status === 'APPROVED' ? 'Matched' : 'Pending Review'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operator summaries */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/40 bg-slate-950/40">
            <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Operator Summaries
            </h2>
            <div className="space-y-3">
              {dayData.operators.map((op, idx) => (
                <div key={idx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{op.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{op.shift}</span>
                    </div>
                    
                    {/* Attendant Rating */}
                    <div className="flex gap-0.5 text-amber-500 text-[10px] font-black">
                      {Array.from({ length: op.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-slate-950">
                    <div>
                      <span className="text-slate-650 block leading-none">FUEL SOLD</span>
                      <span className="text-slate-300 font-bold">{op.fuelSoldLiters} L</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-650 block leading-none">COLLECTED</span>
                      <span className="text-emerald-400 font-bold">₹{op.cashCollected.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suspicious Activity Alerts */}
          {dayData.anomalies.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-red-900/30 bg-red-950/5">
              <h2 className="text-sm font-black uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" /> Suspicious Activity (Click to Resolve)
              </h2>
              <div className="space-y-2">
                {dayData.anomalies.map(a => (
                  <div
                    key={a.id}
                    onClick={() => navigate(a.category === 'cash' ? '/reconciliation/cash' : '/audits')}
                    className="p-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer flex gap-2.5 items-start transition-all"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-xs text-rose-300 font-medium leading-relaxed">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI-Powered Petroleum Operational Forecasting */}
          <div className="glass-panel p-6 rounded-3xl border border-blue-900/30 bg-blue-950/5">
            <h2 className="text-sm font-black uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> AI Petroleum Forecasting
            </h2>
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
                <p className="font-extrabold text-blue-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> High-Demand Warning
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Historical weekend traffic indicates a **15% sales volume spike** expected on Saturday. Recommend replenishing Diesel Tank 2 by Friday evening.
                </p>
              </div>

              <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
                <p className="font-extrabold text-blue-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Peak Operating Hours
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Expected busiest dispenser delivery hours: **08:00 AM – 11:30 AM** and **06:00 PM – 09:30 PM**. Deploy extra nozzle supervisors.
                </p>
              </div>

              <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
                <p className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Predicted Depletion Boundary
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  At current sales speed (390L petrol daily), Main Tank 1 has **41 days** of available capacity. Next standard re-order trigger: **June 15**.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
