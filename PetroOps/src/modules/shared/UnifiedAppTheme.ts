/**
 * UnifiedAppTheme.ts
 * ──────────────────
 * Authoritative styling constants for Final_PumpAI premium off-white UI.
 * Standardizes harmonize palettes, typography, responsive gaps, and borders.
 */

export const UnifiedAppTheme = {
  colors: {
    bgMain: '#F9F9F8',      // Authoritative Calm off-white
    bgCard: '#FFFFFF',      // Clean premium white
    border: '#EBEBEA',      // Soft structural border
    borderFocus: '#B3B3B3', // Legible focus outline border
    textMain: '#1A1A1A',    // High-contrast readable charcoal
    textMuted: '#666666',   // Informative secondary gray
    primary: '#D35400',     // Hindustan Petroleum core branding accent orange
    primaryHover: '#A04000',
    emerald: '#059669',     // Cleared success metrics
    rose: '#E11D48',        // Fatal risk alert warnings
    amber: '#D97706'        // Standard warning indicators
  },
  typography: {
    fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  },
  spacing: {
    gapMain: '24px',
    gapItem: '16px',
    borderRadius: '24px',   // Rounded cards corners
    borderRadiusItem: '16px',
    borderRadiusInput: '12px'
  },
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.01)',
    premium: '0 4px 20px -2px rgba(0, 0, 0, 0.02)'
  }
};
export default UnifiedAppTheme;
