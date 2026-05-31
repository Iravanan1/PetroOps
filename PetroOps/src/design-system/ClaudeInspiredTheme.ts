/**
 * Claude-Inspired Enterprise Theme Definitions
 * Replaces the dark utilitarian mode with a soft, off-white, minimal aesthetic.
 */

export const ClaudeTheme = {
  colors: {
    background: {
      primary: 'var(--color-bg-primary, #F9F9F8)',   // Soft off-white
      secondary: 'var(--color-bg-secondary, #FFFFFF)', // Pure white for cards
      tertiary: 'var(--color-bg-tertiary, #F3F3F1)',  // Subtle gray for hovered rows/active states
    },
    text: {
      primary: 'var(--color-text-primary, #1A1A1A)',   // Deep charcoal
      secondary: 'var(--color-text-secondary, #666666)', // Warm gray
      tertiary: 'var(--color-text-tertiary, #999999)',  // Light gray
    },
    border: {
      light: 'var(--color-border-light, #EBEBEA)',     // Very soft border
      default: 'var(--color-border-default, #D9D9D6)',   // Standard structural border
      strong: 'var(--color-border-strong, #B3B3B3)',    // High-contrast border for inputs
    },
    accent: {
      brand: 'var(--color-accent-brand, #D35400)',     // Warm rust/orange
      success: 'var(--color-accent-success, #2E7D32)',   // Muted forest green
      warning: 'var(--color-accent-warning, #F57F17)',   // Muted amber
      danger: 'var(--color-accent-danger, #C62828)',    // Muted brick red
      info: 'var(--color-accent-info, #1565C0)',      // Muted sapphire blue
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
    dropdown: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    modal: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)'
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    baseSize: '15px',       // Slightly larger base font for readability
    lineHeight: '1.6',
  }
};
