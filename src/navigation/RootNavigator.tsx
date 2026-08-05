import { NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';

import { linking } from '@/navigation/linking';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { useTheme } from '@/theme/useTheme';
import { fontFamily } from '@/theme/fonts';

export function RootNavigator() {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.brand,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.expense,
      },
      fonts: {
        regular: { fontFamily: fontFamily.regular, fontWeight: '400' as const },
        medium: { fontFamily: fontFamily.medium, fontWeight: '500' as const },
        bold: { fontFamily: fontFamily.bold, fontWeight: '700' as const },
        heavy: { fontFamily: fontFamily.bold, fontWeight: '700' as const },
      },
    }),
    [colors, isDark],
  );

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      <MainTabsNavigator />
    </NavigationContainer>
  );
}
