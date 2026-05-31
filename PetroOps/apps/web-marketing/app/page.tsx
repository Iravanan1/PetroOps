import React from 'react';

export default function MarketingHome() {
  return (
    <div className="space-y-32 pb-24">
      {/* Hero Section */}
      <section className="px-8 pt-20 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-block bg-slate-900 border border-slate-800 text-emerald-400 font-semibold px-4 py-1.5 rounded-full text-xs tracking-wider">
          COMPLETE DISPENSER AUTOMATION & ERP
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          The Operating System for Modern <span className="text-emerald-500">Petrol Stations.</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Unify billing, Automatic Tank Gauges, double-entry ledger audits, and AI telemetry leak warnings in one secure, offline-first operating system.
        </p>

        <div className="flex justify-center items-center gap-4">
          <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-4 rounded-xl text-md transition-all hover:scale-105">
            Get Started Now
          </button>
          <button className="border border-slate-800 hover:bg-slate-900 text-white font-semibold px-8 py-4 rounded-xl text-md transition-all">
            Talk to an Expert
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="px-8 max-w-6xl mx-auto space-y-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white">Engineered for absolute forecourt trust.</h2>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-3xl space-y-4">
            <div className="text-3xl">🔌</div>
            <h3 className="font-bold text-lg text-white">Vendor-Agnostic Core</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Direct support for Gilbarco, Wayne, Orpak Forecourts, and Tokheim over dual RS-485 serial controllers.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-3xl space-y-4">
            <div className="text-3xl">🛜</div>
            <h3 className="font-bold text-lg text-white">Authoritative Offline Mode</h3>
            <p className="text-sm text-slate-400 leading-relaxed">The forecourt office continues billing and wetstock recording offline with zero cloud server dependencies.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-900 p-8 rounded-3xl space-y-4">
            <div className="text-3xl">⚡</div>
            <h3 className="font-bold text-lg text-white">AI-Telemetry Auditing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Aggregates ATG tank drops against nozzle flow totalizers real-time to alert you of structural underground fuel leakage.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
