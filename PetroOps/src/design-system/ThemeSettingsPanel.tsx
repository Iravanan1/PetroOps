import React from 'react';
import { useTheme } from './PetroOpsThemeProvider';
import { ThemeMode, FontScale } from './ThemePersistenceService';
import { Sun, Moon, Eye, Type, Check } from 'lucide-react';

export const ThemeSettingsPanel: React.FC = () => {
  const { theme, fontScale, setTheme, setFontScale } = useTheme();

  const themesList: { id: ThemeMode; label: string; icon: React.ElementType; desc: string }[] = [
    { 
      id: 'light', 
      label: 'Light Mode', 
      icon: Sun, 
      desc: 'Calm, off-white operational style with premium Claude-inspired readability.' 
    },
    { 
      id: 'dark', 
      label: 'Dark Mode', 
      icon: Moon, 
      desc: 'Calm, dark low-light theme. Designed to minimize operator eye strain.' 
    },
    { 
      id: 'light-contrast', 
      label: 'Light Contrast', 
      icon: Eye, 
      desc: 'High structural contrast & 2px borders. Tailored for extreme sunlight readability.' 
    },
    { 
      id: 'dark-contrast', 
      label: 'Dark Contrast', 
      icon: Eye, 
      desc: 'Night-shift, accessibility-first pure black layout with high visibility alarms.' 
    }
  ];

  const scalesList: { id: FontScale; label: string; desc: string }[] = [
    { id: 'sm', label: 'Compact', desc: '85% font size (13px)' },
    { id: 'md', label: 'Standard', desc: '100% font size (15px)' },
    { id: 'lg', label: 'Readable', desc: '120% font size (18px)' },
    { id: 'xl', label: 'Magnified', desc: '140% font size (20px)' }
  ];

  return (
    <div className="space-y-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)] rounded-3xl p-6 shadow-xs">
      <div>
        <h3 className="text-xs uppercase font-black text-[var(--color-text-primary)] tracking-wider">Operational Branding & Theme Center</h3>
        <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-bold mt-1">Configure workspace visibility, terminal high contrast, and accessibility preferences.</p>
      </div>

      <div className="border-t border-[var(--color-border-light)] my-4" />

      {/* Themes grid */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Select Visual Theme</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themesList.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 border rounded-2xl flex flex-col justify-between text-left transition-all relative cursor-pointer group h-28 ${
                  isActive
                    ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-accent-brand)] shadow-xs'
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-light)] hover:bg-[var(--color-bg-tertiary)]/40'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className={`p-1.5 rounded-lg border ${isActive ? 'bg-[var(--color-bg-secondary)] border-[var(--color-accent-brand)]/20' : 'bg-[var(--color-bg-primary)] border-[var(--color-border-light)]'}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent-brand)]' : 'text-[var(--color-text-secondary)]'}`} />
                  </div>
                  {isActive && (
                    <div className="bg-[var(--color-accent-brand)] text-white p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-black uppercase text-[var(--color-text-primary)]">{t.label}</span>
                  <span className="text-[9px] block text-[var(--color-text-secondary)] mt-0.5 leading-tight font-bold">{t.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--color-border-light)] my-4" />

      {/* Font scales grid */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <Type className="w-4 h-4" /> Text Zoom & Accessibility Scaling
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scalesList.map((s) => {
            const isActive = fontScale === s.id;

            return (
              <button
                key={s.id}
                onClick={() => setFontScale(s.id)}
                className={`p-3 border rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer h-20 ${
                  isActive
                    ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-accent-brand)] font-semibold'
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-light)] hover:bg-[var(--color-bg-tertiary)]/40'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">{s.label}</span>
                <span className="text-[9px] block text-[var(--color-text-secondary)] leading-tight font-bold mt-1">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default ThemeSettingsPanel;
