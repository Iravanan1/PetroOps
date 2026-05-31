import React from 'react';
import { ClaudeTheme } from './ClaudeInspiredTheme';
import { AnimationFramework } from './AnimationFramework';

export const PremiumERPLayout = ({ children, title }: { children: React.ReactNode, title: string }) => {
  return (
    <div 
      className="min-h-screen font-sans"
      style={{
        backgroundColor: ClaudeTheme.colors.background.primary,
        color: ClaudeTheme.colors.text.primary,
        fontFamily: ClaudeTheme.typography.fontFamily
      }}
    >
      <style>{AnimationFramework.keyframes}</style>
      
      {/* Premium Top Navigation */}
      <header 
        className="sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderColor: ClaudeTheme.colors.border.light,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="font-bold text-xl tracking-tight text-[#1A1A1A]">PetroOps</h1>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-[#666666]">
              <a href="#" className="hover:text-black transition-colors">Operations</a>
              <a href="#" className="hover:text-black transition-colors">Accounting</a>
              <a href="#" className="hover:text-black transition-colors">HQ Intelligence</a>
              <a href="#" className="hover:text-black transition-colors">Settings</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shadow-sm">
              CA
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`max-w-7xl mx-auto px-6 py-8 ${AnimationFramework.classes.animateSlideUp}`}>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">{title}</h2>
          <p className="text-[#666666] text-sm mt-1">Enterprise Operations Control</p>
        </div>
        {children}
      </main>
    </div>
  );
};
