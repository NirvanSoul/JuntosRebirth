import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  loadAppPreferences,
  saveAppPreferences,
} from '@/state/appPreferences/appPreferencesRepository';
import { defaultAppPreferences } from '@/state/appPreferences/types';
import { resolveColorTokens } from '@/theme/colors';
import { resolveShadows } from '@/theme/shadows';
import type {
  AppearancePreference,
  ColorScheme,
  ColorTokens,
  ThemeShadows,
} from '@/theme/types';

type ThemeContextValue = {
  appearance: AppearancePreference;
  colorScheme: ColorScheme;
  colors: ColorTokens;
  isDark: boolean;
  isReady: boolean;
  setAppearance: (appearance: AppearancePreference) => Promise<void>;
  shadows: ThemeShadows;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveEffectiveScheme(
  appearance: AppearancePreference,
  systemScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (appearance === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return appearance;
}

type ThemeProviderProps = PropsWithChildren<{
  initialAppearance?: AppearancePreference;
}>;

export function ThemeProvider({
  children,
  initialAppearance,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>(
    initialAppearance ?? defaultAppPreferences.appearance,
  );
  const [isReady, setReady] = useState(initialAppearance !== undefined);

  useEffect(() => {
    if (initialAppearance !== undefined) {
      return;
    }

    let isMounted = true;

    void loadAppPreferences()
      .then((preferences) => {
        if (isMounted) {
          setAppearanceState(preferences.appearance);
        }
      })
      .finally(() => {
        if (isMounted) {
          setReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialAppearance]);

  const setAppearance = useCallback(async (nextAppearance: AppearancePreference) => {
    setAppearanceState(nextAppearance);
    await saveAppPreferences({ appearance: nextAppearance });
  }, []);

  const colorScheme = resolveEffectiveScheme(appearance, systemScheme);
  const colors = useMemo(() => resolveColorTokens(colorScheme), [colorScheme]);
  const shadows = useMemo(() => resolveShadows(colorScheme), [colorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearance,
      colorScheme,
      colors,
      isDark: colorScheme === 'dark',
      isReady,
      setAppearance,
      shadows,
    }),
    [appearance, colorScheme, colors, isReady, setAppearance, shadows],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }

  return context;
}

export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
