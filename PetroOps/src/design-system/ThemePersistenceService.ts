/**
 * ThemePersistenceService.ts
 * ──────────────────────────
 * Handles local device persistence for active theme modes and accessibility options.
 * Works offline-first across Web, Electron, and Mobile containers.
 */

export type ThemeMode = 'light' | 'dark' | 'light-contrast' | 'dark-contrast';
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';

export interface UserPrefs {
  theme: ThemeMode;
  fontScale: FontScale;
  contrastPreference: boolean;
}

const STORAGE_KEY = 'petroops_theme_preferences';

const DEFAULT_PREFS: UserPrefs = {
  theme: 'light',
  fontScale: 'md',
  contrastPreference: false
};

export const ThemePersistenceService = {
  /**
   * Retrieves active theme preferences from local storage
   */
  getPrefs(): UserPrefs {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          theme: parsed.theme || DEFAULT_PREFS.theme,
          fontScale: parsed.fontScale || DEFAULT_PREFS.fontScale,
          contrastPreference: parsed.theme?.includes('contrast') || parsed.contrastPreference || DEFAULT_PREFS.contrastPreference
        };
      }
    } catch (e) {
      console.warn('[ThemePersistence] Failed to read theme prefs, using defaults:', e);
    }
    return DEFAULT_PREFS;
  },

  /**
   * Persists active theme preferences to local storage
   */
  savePrefs(prefs: Partial<UserPrefs>): UserPrefs {
    const current = this.getPrefs();
    const updated = { ...current, ...prefs };
    
    // Automatically match contrast flag to selected contrast theme
    if (updated.theme === 'light-contrast' || updated.theme === 'dark-contrast') {
      updated.contrastPreference = true;
    } else if (prefs.theme) {
      updated.contrastPreference = false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[ThemePersistence] Failed to write theme prefs:', e);
    }
    return updated;
  }
};

export default ThemePersistenceService;
