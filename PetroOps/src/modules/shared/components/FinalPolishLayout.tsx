import React, { useState, useEffect } from 'react';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UnifiedAppTheme } from '../UnifiedAppTheme';

interface FinalPolishLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function FinalPolishLayout({
  title,
  subtitle,
  onBack,
  actions,
  children
}: FinalPolishLayoutProps) {
  const navigate = useNavigate();
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('pumpai_sunlight_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pumpai_sunlight_mode', String(sunlightMode));
    if (sunlightMode) {
      document.documentElement.classList.add('sunlight-mode');
    } else {
      document.documentElement.classList.remove('sunlight-mode');
    }
  }, [sunlightMode]);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-[#1A1A1A] pb-20 font-sans antialiased">
      
      {/* Premium layout navigation header */}
      <nav className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#EBEBEA] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 border border-[#EBEBEA] hover:bg-[#F9F9F8] rounded-xl transition-all cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-[#1A1A1A]" />
            </button>
          )}
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-[#1A1A1A] uppercase">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[9px] text-[#666666] font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-3 rounded-2xl border transition-all cursor-pointer min-h-[48px] ${
              sunlightMode 
                ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100' 
                : 'bg-white border-[#D9D9D6] hover:bg-[#F3F3F1] text-[#1A1A1A]'
            }`}
          >
            <Sun className="h-4.5 w-4.5 text-amber-600 animate-spin-slow" />
            {sunlightMode ? 'Attendant Shade' : 'Sunlight Mode'}
          </button>
          {actions}
        </div>
      </nav>

      {/* Main children container */}
      <main className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
