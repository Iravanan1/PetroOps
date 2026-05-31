import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemePersistenceService, ThemeMode, FontScale } from './ThemePersistenceService';
import { AccessibilityThemeEngine } from './AccessibilityThemeEngine';

export interface ThemeContextType {
  theme: ThemeMode;
  fontScale: FontScale;
  contrastPreference: boolean;
  setTheme: (theme: ThemeMode) => void;
  setFontScale: (scale: FontScale) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const PetroOpsThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState(() => ThemePersistenceService.getPrefs());

  // Apply theme and font sizes on mount and whenever preferences change
  useEffect(() => {
    AccessibilityThemeEngine.applyTheme(prefs.theme, prefs.fontScale);
  }, [prefs.theme, prefs.fontScale]);

  const setTheme = (theme: ThemeMode) => {
    const updated = ThemePersistenceService.savePrefs({ theme });
    setPrefs(updated);
  };

  const setFontScale = (fontScale: FontScale) => {
    const updated = ThemePersistenceService.savePrefs({ fontScale });
    setPrefs(updated);
  };

  return (
    <ThemeContext.Provider value={{
      theme: prefs.theme,
      fontScale: prefs.fontScale,
      contrastPreference: prefs.contrastPreference,
      setTheme,
      setFontScale
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a PetroOpsThemeProvider');
  }
  return context;
};

export default PetroOpsThemeProvider;
