import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';

import { linking } from '@/navigation/linking';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { useLegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';
import { LegalSessionGateScreen } from '@/features/legal/screens/LegalSessionGateScreen';
import { OnboardingNavigator } from '@/features/onboarding/OnboardingNavigator';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import { useTheme } from '@/theme/useTheme';
import { fontFamily } from '@/theme/fonts';

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { isReady: isAuthReady, session } = useAuthSession();
  const {
    isReady: isOnboardingReady,
    markAuthenticated,
    status,
  } = useOnboardingStatus();
  const legalGate = useLegalSessionGate();

  useEffect(() => {
    // El onboarding no se marca como autenticado mientras falte la evidencia
    // legal: se marca solo cuando la puerta habilita la sesión.
    if (
      isAuthReady &&
      session &&
      legalGate.isLegallyEnabled &&
      status.accessMode !== 'authenticated'
    ) {
      void markAuthenticated();
    }
  }, [
    isAuthReady,
    legalGate.isLegallyEnabled,
    markAuthenticated,
    session,
    status.accessMode,
  ]);

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

  const showLegalGate = Boolean(
    session && legalGate.status.kind === 'required',
  );

  return (
    <>
      <NavigationContainer linking={linking} theme={navigationTheme}>
        {content}
      </NavigationContainer>
      {showLegalGate ? (
        <LegalSessionGateScreen
          error={legalGate.error}
          missingDocuments={legalGate.missingDocuments}
          onAbandon={() => void legalGate.abandonSession()}
          onRetry={legalGate.retryGate}
          onSubmit={(decision) => legalGate.submitRegularization(decision)}
        />
      ) : null}
    </>
  );
}
