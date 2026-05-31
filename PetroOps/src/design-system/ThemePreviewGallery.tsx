import React from 'react';
import { useTheme } from './PetroOpsThemeProvider';
import { ThemeMode } from './ThemePersistenceService';
import { ThemeColors, LightThemeColors, DarkThemeColors, LightContrastColors, DarkContrastColors } from './AccessibilityThemeEngine';
import { Eye, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export const ThemePreviewGallery: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const previewConfigs: { id: ThemeMode; label: string; colors: ThemeColors }[] = [
    { id: 'light', label: 'Light Theme (Claude-Style)', colors: LightThemeColors },
    { id: 'dark', label: 'Dark Theme (Low-Strain)', colors: DarkThemeColors },
    { id: 'light-contrast', label: 'Light High Contrast (Sunlight)', colors: LightContrastColors },
    { id: 'dark-contrast', label: 'Dark High Contrast (Night)', colors: DarkContrastColors }
  ];

  return (
    <div className="space-y-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)] rounded-3xl p-6 shadow-xs">
      <div>
        <h3 className="text-xs uppercase font-black text-[var(--color-text-primary)] tracking-wider">Multi-Theme Live Preview Gallery</h3>
        <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-bold mt-1">Review operational contrast levels, double-entry ledgers, and OCR glyph readabilities across all modes.</p>
      </div>

      <div className="border-t border-[var(--color-border-light)] my-4" />

      {/* Side-by-side dynamic previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {previewConfigs.map((cfg) => {
          const isSelected = theme === cfg.id;

          return (
            <div 
              key={cfg.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all relative ${
                isSelected ? 'border-[var(--color-accent-brand)] shadow-sm' : 'border-[var(--color-border-light)]'
              }`}
              style={{
                backgroundColor: cfg.colors.bgPrimary,
                borderColor: isSelected ? 'var(--color-accent-brand)' : cfg.colors.borderLight
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <span 
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: cfg.colors.textPrimary }}
                >
                  {cfg.label}
                </span>
                
                <button
                  onClick={() => setTheme(cfg.id)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border cursor-pointer transition-all active:scale-95 ${
                    isSelected ? 'bg-[#1A1A1A] text-white' : 'bg-transparent hover:bg-black/5'
                  }`}
                  style={{
                    borderColor: cfg.colors.borderDefault,
                    color: isSelected ? '#FFFFFF' : cfg.colors.textPrimary
                  }}
                >
                  {isSelected ? 'Active Mode' : 'Switch Mode'}
                </button>
              </div>

              {/* Simulated Palette chips */}
              <div className="flex gap-2">
                <PaletteChip color={cfg.colors.bgPrimary} label="BG" text={cfg.colors.textPrimary} />
                <PaletteChip color={cfg.colors.bgSecondary} label="Card" text={cfg.colors.textPrimary} />
                <PaletteChip color={cfg.colors.borderDefault} label="Border" text={cfg.colors.textPrimary} />
                <PaletteChip color={cfg.colors.accentBrand} label="Brand" text="#FFFFFF" />
                <PaletteChip color={cfg.colors.accentSuccess} label="Ok" text="#FFFFFF" />
                <PaletteChip color={cfg.colors.accentDanger} label="Alert" text="#FFFFFF" />
              </div>

              {/* Simulated Double-Entry Ledger Row */}
              <div 
                className="p-3 border rounded-xl space-y-2"
                style={{
                  backgroundColor: cfg.colors.bgSecondary,
                  borderColor: cfg.colors.borderLight
                }}
              >
                <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: cfg.colors.borderLight }}>
                  <span className="text-[9px] font-black uppercase" style={{ color: cfg.colors.textSecondary }}>Shift #42 Trial Balance</span>
                  <span className="text-[9px] font-bold" style={{ color: cfg.colors.accentSuccess }}>✓ Deterministic</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span style={{ color: cfg.colors.textPrimary }}>Debit: Cash Drawer Float</span>
                  <span style={{ color: cfg.colors.textPrimary }}>₹14,500.00</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span style={{ color: cfg.colors.textPrimary }}>Credit: UPI Settlement Bank</span>
                  <span style={{ color: cfg.colors.textPrimary }}>₹14,500.00</span>
                </div>
              </div>

              {/* Simulated OCR Warning and Mismatch Alerts */}
              <div 
                className="p-3 border rounded-xl flex items-start gap-2.5"
                style={{
                  backgroundColor: cfg.colors.bgSecondary,
                  borderColor: cfg.colors.borderLight
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" style={{ color: cfg.colors.accentDanger }} />
                <div>
                  <span className="text-[9px] font-black uppercase block" style={{ color: cfg.colors.accentDanger }}>
                    Reconciled Variance Trap
                  </span>
                  <p className="text-[8px] font-bold mt-0.5 leading-tight uppercase" style={{ color: cfg.colors.textSecondary }}>
                    Scanned OCR Total (₹12,400) differs from Portal Ledger (₹12,740). Audit approval required.
                  </p>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper for Palette chips
const PaletteChip: React.FC<{ color: string; label: string; text: string }> = ({ color, label, text }) => {
  return (
    <div 
      className="flex-1 h-9 rounded-lg flex flex-col justify-center items-center border border-black/10 select-none cursor-default"
      style={{ backgroundColor: color }}
    >
      <span className="text-[8px] font-extrabold uppercase" style={{ color: text }}>{label}</span>
    </div>
  );
};

export default ThemePreviewGallery;
