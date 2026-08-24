import { NavigationContainer } from '@react-navigation/native';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';

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

  // B3: mientras hay una pausa de recuperación en curso, el host mostrado no
  // puede cambiar por la sesión cruda que acaba de crear el OTP: la persona
  // aún está poniendo la contraseña nueva en AccessScreen, o en el flujo de
  // invitación dentro de MainTabs. El ref recuerda qué host estaba activo
  // antes de que la pausa llegara.
  const wasAccessShown = useRef(false);

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

  let content: ReactNode;
  if (!status.completed) {
    content = <OnboardingNavigator />;
  } else if (legalGate.status.kind === 'halted') {
    // La sesión del OTP de recuperación no desmonta a mitad del restablecimiento.
    content = wasAccessShown.current ? <AccessScreen /> : <MainTabsNavigator />;
  } else if (status.accessMode === 'authenticated' && !session) {
    wasAccessShown.current = true;
    content = <AccessScreen />;
  } else {
    wasAccessShown.current = false;
    content = <MainTabsNavigator />;
  }

  // B5: la superficie queda bloqueada también durante la comprobación, no solo
  // cuando falta evidencia: ningún efecto puede dispararse mientras la puerta
  // verifica y la persona ve el estado en curso.
  const showLegalGate = Boolean(
    session &&
    (legalGate.status.kind === 'required' ||
      legalGate.status.kind === 'checking'),
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
          variant={
            legalGate.status.kind === 'checking' ? 'checking' : 'required'
          }
        />
      ) : null}
    </>
  );
}
