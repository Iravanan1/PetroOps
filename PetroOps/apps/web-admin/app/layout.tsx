import React from 'react';
import './globals.css';

export const metadata = {
  title: 'PetroOps | Station Network ERP Portal',
  description: 'Enterprise Petroleum Operations & Forecourt Automation Core Systems',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 space-y-6 hidden md:block">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center font-bold text-slate-950">P</div>
            <span className="font-bold text-xl tracking-tight text-white">PetroOps</span>
          </div>

          <nav className="space-y-1">
            <a href="/" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium">
              <span>📊</span>
              <span>Overview</span>
            </a>
            <a href="/tanks" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <span>🛢️</span>
              <span>Tanks & Wetstock</span>
            </a>
            <a href="/ai-insights" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <span>🧠</span>
              <span>AI Insights</span>
            </a>
          </nav>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/30">
            <h2 className="font-semibold text-lg">HQ Controller Portal</h2>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2.5 py-1 rounded">St. Branch #04 (BPCL)</span>
              <div className="w-8 h-8 rounded-full bg-slate-700"></div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
