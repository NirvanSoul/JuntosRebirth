import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { StepProgressBar } from '@/components/ui/StepProgressBar/StepProgressBar';
import { Text } from '@/components/ui/Text/Text';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import {
  SignUpScreen,
  signUpTotalSteps,
} from '@/features/auth/screens/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import { useDeferredAuthenticatedMark } from '@/features/legal/hooks/useDeferredAuthenticatedMark';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import { spacing } from '@/theme/spacing';
import { getDisclosureEntering } from '@/theme/transitions';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AccessStep =
  | { screen: 'entry' }
  | { screen: 'login' }
  | { screen: 'signup'; step: number }
  | { screen: 'verify-signup'; email: string }
  | { screen: 'forgot' }
  | { screen: 'verify-recovery'; email: string }
  | { screen: 'reset' };

const stepTitles: Record<AccessStep['screen'], string> = {
  entry: 'Empieza con Juntos',
  login: 'Iniciar sesión',
  signup: 'Crear cuenta',
  'verify-signup': 'Verifica tu correo',
  forgot: 'Recuperar contraseña',
  'verify-recovery': 'Verifica tu correo',
  reset: 'Nueva contraseña',
};

/** Host de autenticación a pantalla completa, reutilizando los mismos formularios de Ajustes. */
export function AccessScreen() {
  const styles = useThemedStyles(createStyles);
  const { markGuestComplete } = useOnboardingStatus();
  const { scheduleMarkAuthenticated } = useDeferredAuthenticatedMark();
  const [step, setStep] = useState<AccessStep>({ screen: 'entry' });
  const [isCompletingGuest, setCompletingGuest] = useState(false);

  // El marcado de «autenticado» se difiere hasta que la puerta legal habilite
  // la sesión: mientras falte evidencia no se marca el onboarding.
  const completeAuthenticated = () => {
    scheduleMarkAuthenticated();
  };

  const completeGuest = async () => {
    if (isCompletingGuest) return;
    setCompletingGuest(true);
    await markGuestComplete();
  };

  const goBack = () => {
    switch (step.screen) {
      case 'login':
        setStep({ screen: 'entry' });
        return;
      case 'signup':
        setStep(
          step.step > 1
            ? { screen: 'signup', step: step.step - 1 }
            : { screen: 'entry' },
        );
        return;
      case 'verify-signup':
        setStep({ screen: 'signup', step: 1 });
        return;
      case 'forgot':
      case 'reset':
        setStep({ screen: 'login' });
        return;
      case 'verify-recovery':
        setStep({ screen: 'forgot' });
        return;
      case 'entry':
        return;
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="access-screen"
      >
        <View
          style={[
            styles.header,
            step.screen === 'signup' ? styles.signupHeader : null,
          ]}
        >
          {step.screen !== 'entry' ? (
            step.screen === 'signup' ? (
              <ModalCloseButton onPress={goBack} variant="back" />
            ) : (
              <ModalPrimaryAction
                accessibilityLabel="Volver"
                label="Atrás"
                onPress={goBack}
                style={styles.backAction}
                variant="surface"
              />
            )
          ) : null}
          <Text accessibilityRole="header" variant="title">
            {stepTitles[step.screen]}
          </Text>
        </View>

        {step.screen === 'signup' || step.screen === 'verify-signup' ? (
          <StepProgressBar
            currentStep={
              step.screen === 'verify-signup' ? signUpTotalSteps + 1 : step.step
            }
            testID="access-signup-progress"
            totalSteps={signUpTotalSteps + 1}
          />
        ) : null}

        <Animated.View entering={getDisclosureEntering()} key={step.screen}>
          {step.screen === 'entry' ? (
            <View style={styles.entryActions}>
              <Text tone="secondary" variant="body">
                Crea una cuenta para proteger y sincronizar tus datos entre
                dispositivos.
              </Text>
              <ModalPrimaryAction
                accessibilityLabel="Crear cuenta"
                label="Crear cuenta"
                onPress={() => setStep({ screen: 'signup', step: 1 })}
                testID="access-open-signup"
                variant="cta"
              />
              <ModalPrimaryAction
                accessibilityLabel="Ya tengo cuenta"
                label="Ya tengo cuenta"
                onPress={() => setStep({ screen: 'login' })}
                testID="access-open-login"
                variant="surface"
              />
              <ModalPrimaryAction
                accessibilityLabel="Probar sin cuenta"
                disabled={isCompletingGuest}
                label={isCompletingGuest ? 'Preparando…' : 'Probar sin cuenta'}
                onPress={() => void completeGuest()}
                testID="access-continue-guest"
                variant="surface"
              />
            </View>
          ) : null}

          {step.screen === 'login' ? (
            <LoginScreen
              onCancel={goBack}
              onNavigateToForgotPassword={() => setStep({ screen: 'forgot' })}
              onNavigateToSignUp={() => setStep({ screen: 'signup', step: 1 })}
              onSuccess={() => void completeAuthenticated()}
            />
          ) : null}

          {step.screen === 'signup' ? (
            <SignUpScreen
              onNavigateToLogin={() => setStep({ screen: 'login' })}
              onStepChange={(nextStep) =>
                setStep({ screen: 'signup', step: nextStep })
              }
              onSuccess={({ email }) =>
                setStep({ screen: 'verify-signup', email })
              }
              source="access-signup"
              step={step.step}
            />
          ) : null}

          {step.screen === 'verify-signup' ? (
            <VerifyCodeScreen
              email={step.email}
              onCancel={goBack}
              onGoToLogin={() => setStep({ screen: 'login' })}
              onGoToRecovery={() => setStep({ screen: 'forgot' })}
              onSuccess={() => completeAuthenticated()}
              purpose="signup"
            />
          ) : null}

          {step.screen === 'forgot' ? (
            <ForgotPasswordScreen
              onCancel={goBack}
              onNavigateToLogin={() => setStep({ screen: 'login' })}
              onSuccess={({ email }) =>
                setStep({ screen: 'verify-recovery', email })
              }
            />
          ) : null}

          {step.screen === 'verify-recovery' ? (
            <VerifyCodeScreen
              email={step.email}
              onCancel={goBack}
              onSuccess={() => setStep({ screen: 'reset' })}
              purpose="recovery"
            />
          ) : null}

          {step.screen === 'reset' ? (
            <ResetPasswordScreen onCancel={goBack} onSuccess={goBack} />
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      gap: spacing.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.huge,
      paddingBottom: spacing.huge,
    },
    header: { gap: spacing.lg },
    signupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backAction: { alignSelf: 'flex-start' },
    entryActions: { gap: spacing.lg },
  });
}
