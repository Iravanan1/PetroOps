import React from 'react';

export const metadata = {
  title: 'PetroOps | Complete Fuel Station ERP, Automation, & AI',
  description: 'Scalable multi-platform operating systems for BPCL, HPCL, IOCL, and private retail stations.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col font-sans">
        {/* Navigation */}
        <header className="h-20 border-b border-slate-900 px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center font-bold text-slate-950">P</div>
            <span className="font-bold text-xl tracking-tight text-white">PetroOps</span>
          </div>

          <nav className="hidden md:flex space-x-8 text-sm font-medium text-slate-400">
            <a href="/" className="hover:text-emerald-400 transition-colors">Home</a>
            <a href="/features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="/solutions" className="hover:text-emerald-400 transition-colors">PSU Solutions</a>
            <a href="/pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
          </nav>

          <div>
            <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all hover:scale-105">
              Book a Free Demo
            </button>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/40 py-12 px-8 text-center text-xs text-slate-500">
          <p>© 2026 PetroOps Systems Inc. All rights reserved. Complies with PESO and public sector oil marketing guidelines.</p>
        </footer>
      </body>
    </html>
  );
}
