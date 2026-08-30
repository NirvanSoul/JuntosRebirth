import { NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { linking } from '@/navigation/linking';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { OnboardingNavigator } from '@/features/onboarding/OnboardingNavigator';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { fontFamily } from '@/theme/fonts';

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isReady: isAuthReady, session } = useAuthSession();
  const { isReady: isBetterAuthReady, session: betterAuthSession } =
    useBetterAuthSession();
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

  if (!isAuthReady || !isBetterAuthReady || !isOnboardingReady) {
    return <View style={styles.root} testID="root-navigator-backdrop" />;
  }

  // Better Auth crea sesión al registrar una cuenta, antes de que su correo
  // haya sido confirmado. Esa sesión pendiente no autoriza a entrar a la app.
  const isEmailVerificationPending = Boolean(
    betterAuthSession?.user && !betterAuthSession.user.emailVerified,
  );
  const content = !status.completed ? (
    <OnboardingNavigator />
  ) : status.accessMode === 'authenticated' &&
    ((!session && !betterAuthSession) || isEmailVerificationPending) ? (
    <AccessScreen />
  ) : (
    <MainTabsNavigator />
  );

  // El fondo del root nativo es blanco. Las escenas del drawer y de las pestañas
  // son transparentes y las pestañas se cruzan con `animation: 'fade'`, así que
  // sin esta capa opaca el blanco del root asoma como un destello durante la
  // transición: imperceptible en claro, evidente en oscuro.
  return (
    <View style={styles.root} testID="root-navigator-backdrop">
      <NavigationContainer linking={linking} theme={navigationTheme}>
        {content}
      </NavigationContainer>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
}
