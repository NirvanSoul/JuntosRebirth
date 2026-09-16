import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { linking } from '@/navigation/linking';
import { LoadingState } from '@/components/feedback/LoadingState/LoadingState';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { OnboardingNavigator } from '@/features/onboarding/OnboardingNavigator';
import { OnboardingRestartContext } from '@/features/onboarding/context/OnboardingRestartContext';
import { useNameScreenIllustrationReady } from '@/features/onboarding/hooks/useNameScreenIllustrationReady';
import { useOnboardingCompletion } from '@/features/onboarding/hooks/useOnboardingCompletion';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { fontFamily } from '@/theme/fonts';
import { markStartup } from '@/lib/diagnostics/startupTrace';

export function RootNavigator({ fontsReady = true }: { fontsReady?: boolean }) {
  const { colors, isDark, isReady: isThemeReady } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isReady: isAuthReady, session } = useBetterAuthSession();
  const {
    complete: completeOnboarding,
    hasCompleted: hasCompletedOnboarding,
    isReady: isOnboardingReady,
    reset: resetOnboarding,
    setHasCompleted: setOnboardingCompleted,
  } = useOnboardingCompletion();
  const isNameIllustrationReady = useNameScreenIllustrationReady();

  useEffect(() => {
    if (isAuthReady) {
      markStartup('session_ready');
    }
  }, [isAuthReady]);

  const hasVerifiedSession = session?.user.emailVerified === true;

  useEffect(() => {
    if (hasVerifiedSession && !hasCompletedOnboarding) {
      setOnboardingCompleted(true);
    }
  }, [hasCompletedOnboarding, hasVerifiedSession, setOnboardingCompleted]);

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

  // La apariencia guardada se lee de AsyncStorage en paralelo con las fuentes;
  // esperarla evita pintar el fondo claro un instante a quien fijó el oscuro.
  if (
    !fontsReady ||
    !isThemeReady ||
    // Sin onboarding completado, la sesión no decide el destino: mostrar el
    // flujo evita que un refresco tras el alta desmonte el formulario OTP.
    // Una vez completado, se conserva el bloqueo de sesión del arranque.
    (hasCompletedOnboarding && !isAuthReady) ||
    !isOnboardingReady ||
    // La primera lámina del onboarding lleva ilustración: se abre con ella ya
    // en caché para que no aparezca segundos después que el texto.
    (!hasVerifiedSession && !hasCompletedOnboarding && !isNameIllustrationReady)
  ) {
    return (
      <View style={styles.root} testID="root-navigator-backdrop">
        <LoadingState />
      </View>
    );
  }

  const content = hasVerifiedSession ? (
    <MainTabsNavigator />
  ) : !hasCompletedOnboarding ? (
    <OnboardingNavigator onComplete={completeOnboarding} />
  ) : (
    <AccessScreen />
  );

  // El fondo del root nativo es blanco. Las escenas del drawer y de las pestañas
  // son transparentes y las pestañas se cruzan con `animation: 'fade'`, así que
  // sin esta capa opaca el blanco del root asoma como un destello durante la
  // transición: imperceptible en claro, evidente en oscuro.
  return (
    <View style={styles.root} testID="root-navigator-backdrop">
      {/* Mientras `linking` resuelve la URL inicial no hay hijos montados; la
          misma barra ocupa ese hueco para que su avance continúe sin reinicio. */}
      <OnboardingRestartContext.Provider value={resetOnboarding}>
        <NavigationContainer
          fallback={<LoadingState />}
          linking={linking}
          theme={navigationTheme}
        >
          {content}
        </NavigationContainer>
      </OnboardingRestartContext.Provider>
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
