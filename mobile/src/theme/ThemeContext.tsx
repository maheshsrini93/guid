import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { type ColorScheme, type ColorTokens, colors } from './colors';

const STORAGE_KEY = 'guid-theme-preference';

interface ThemeContextValue {
  colors: ColorTokens;
  isDark: boolean;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [userPreference, setUserPreference] = useState<ColorScheme | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setUserPreference(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const colorScheme: ColorScheme = userPreference ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = colorScheme === 'dark';

  const toggleTheme = useCallback(() => {
    const next: ColorScheme = isDark ? 'light' : 'dark';
    setUserPreference(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: colors[colorScheme],
      isDark,
      colorScheme,
      toggleTheme,
    }),
    [colorScheme, isDark, toggleTheme]
  );

  // Don't render until we've checked AsyncStorage to avoid flash
  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
