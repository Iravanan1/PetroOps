import React from 'react';
import { ClaudeTheme } from './ClaudeInspiredTheme';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div 
    className={`rounded-xl border ${className}`}
    style={{
      backgroundColor: ClaudeTheme.colors.background.secondary,
      borderColor: ClaudeTheme.colors.border.light,
      boxShadow: ClaudeTheme.shadows.card,
    }}
  >
    {children}
  </div>
);

export const PrimaryButton = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${className}`}
    style={{
      backgroundColor: ClaudeTheme.colors.text.primary,
      color: ClaudeTheme.colors.background.secondary,
      fontSize: '14px',
    }}
  >
    {children}
  </button>
);

export const SecondaryButton = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium border transition-all duration-200 hover:bg-black/5 ${className}`}
    style={{
      backgroundColor: 'transparent',
      borderColor: ClaudeTheme.colors.border.default,
      color: ClaudeTheme.colors.text.primary,
      fontSize: '14px',
    }}
  >
    {children}
  </button>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 
    className="font-semibold mb-4"
    style={{
      color: ClaudeTheme.colors.text.primary,
      fontSize: '18px',
      letterSpacing: '-0.01em'
    }}
  >
    {children}
  </h2>
);
