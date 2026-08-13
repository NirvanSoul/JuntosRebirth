import { NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';

import { linking } from '@/navigation/linking';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { OnboardingNavigator } from '@/features/onboarding/OnboardingNavigator';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import { useTheme } from '@/theme/useTheme';
import { fontFamily } from '@/theme/fonts';

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { isReady: isAuthReady, session } = useAuthSession();
  const { isReady: isOnboardingReady, status } = useOnboardingStatus();

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

  if (!isAuthReady || !isOnboardingReady) {
    return null;
  }

  const content = !status.completed ? (
    <OnboardingNavigator />
  ) : status.accessMode === 'authenticated' && !session ? (
    <AccessScreen />
  ) : (
    <MainTabsNavigator />
  );

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {content}
    </NavigationContainer>
  );
}
