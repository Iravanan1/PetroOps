/**
 * AccessibilityThemeEngine.ts
 * ───────────────────────────
 * Programmatically binds styling tokens, font sizes, and accessibility preferences
 * directly to the document root element.
 */

import { ThemeMode, FontScale } from './ThemePersistenceService';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderLight: string;
  borderDefault: string;
  borderStrong: string;
  accentBrand: string;
  accentSuccess: string;
  accentWarning: string;
  accentDanger: string;
  accentInfo: string;
}

// ─── THEME PALETTE DEFINITIONS ──────────────────────────────────────────────────

export const LightThemeColors: ThemeColors = {
  bgPrimary: '#F9F9F8',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#F3F3F1',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  borderLight: '#E5E5E5',
  borderDefault: '#D9D9D6',
  borderStrong: '#B3B3B3',
  accentBrand: '#B45309', // Burnt Copper
  accentSuccess: '#2E7D32',
  accentWarning: '#F57F17',
  accentDanger: '#C62828',
  accentInfo: '#1E3A8A' // Muted Cobalt
};

export const DarkThemeColors: ThemeColors = {
  bgPrimary: '#0F1115',
  bgSecondary: '#171A21',
  bgTertiary: '#222630',
  textPrimary: '#F5F5F5',
  textSecondary: '#A0A5B5',
  textTertiary: '#707585',
  borderLight: '#2A2E39',
  borderDefault: '#3A3F4D',
  borderStrong: '#505668',
  accentBrand: '#B45309', // Burnt Copper
  accentSuccess: '#4CAF50',
  accentWarning: '#FFB300',
  accentDanger: '#E53935',
  accentInfo: '#2196F3'
};

export const LightContrastColors: ThemeColors = {
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F2F2F2',
  bgTertiary: '#E0E0E0',
  textPrimary: '#000000',
  textSecondary: '#000000',
  textTertiary: '#1A1A1A',
  borderLight: '#000000',
  borderDefault: '#000000',
  borderStrong: '#000000',
  accentBrand: '#B45309', // Burnt Copper
  accentSuccess: '#1B5E20',
  accentWarning: '#E65100',
  accentDanger: '#B71C1C',
  accentInfo: '#0D47A1'
};

export const DarkContrastColors: ThemeColors = {
  bgPrimary: '#000000',
  bgSecondary: '#121212',
  bgTertiary: '#222222',
  textPrimary: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textTertiary: '#E0E0E0',
  borderLight: '#FFFFFF',
  borderDefault: '#FFFFFF',
  borderStrong: '#FFFFFF',
  accentBrand: '#B45309', // Burnt Copper
  accentSuccess: '#66BB6A',
  accentWarning: '#FFA726',
  accentDanger: '#EF5350',
  accentInfo: '#42A5F5'
};

// ─── ACCESSIBILITY ENGINE ───────────────────────────────────────────────────────

export const AccessibilityThemeEngine = {
  /**
   * Applies the theme variables, font sizes, and contrast modes directly on HTML document root
   */
  applyTheme(theme: ThemeMode, fontScale: FontScale) {
    const root = document.documentElement;
    const colors = this.getColorsForMode(theme);

    // Apply colors to CSS Custom Properties
    root.style.setProperty('--color-bg-primary', colors.bgPrimary);
    root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
    root.style.setProperty('--color-bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--color-text-primary', colors.textPrimary);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-tertiary', colors.textTertiary);
    root.style.setProperty('--color-border-light', colors.borderLight);
    root.style.setProperty('--color-border-default', colors.borderDefault);
    root.style.setProperty('--color-border-strong', colors.borderStrong);
    root.style.setProperty('--color-accent-brand', colors.accentBrand);
    root.style.setProperty('--color-accent-success', colors.accentSuccess);
    root.style.setProperty('--color-accent-warning', colors.accentWarning);
    root.style.setProperty('--color-accent-danger', colors.accentDanger);
    root.style.setProperty('--color-accent-info', colors.accentInfo);

    // Apply class modifiers for styles and layout reflows
    root.className = ''; // Reset classes
    root.classList.add(`${theme}-mode`);
    
    if (theme === 'light-contrast' || theme === 'dark-contrast') {
      root.classList.add('sunlight-mode');
    }

    // Apply active font scale variables
    const fontSizes = {
      sm: { base: '13px', title: '16px', small: '10px' },
      md: { base: '15px', title: '18px', small: '11px' },
      lg: { base: '18px', title: '21px', small: '13px' },
      xl: { base: '20px', title: '24px', small: '15px' }
    };
    const activeSize = fontSizes[fontScale] || fontSizes.md;

    root.style.setProperty('--font-size-base', activeSize.base);
    root.style.setProperty('--font-size-title', activeSize.title);
    root.style.setProperty('--font-size-small', activeSize.small);
  },

  /**
   * Helper to retrieve color definitions based on theme mode
   */
  getColorsForMode(theme: ThemeMode): ThemeColors {
    switch (theme) {
      case 'dark':
        return DarkThemeColors;
      case 'light-contrast':
        return LightContrastColors;
      case 'dark-contrast':
        return DarkContrastColors;
      case 'light':
      default:
        return LightThemeColors;
    }
  }
};

export default AccessibilityThemeEngine;
