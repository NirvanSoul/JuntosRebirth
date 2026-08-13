import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
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
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';
import { spacing } from '@/theme/spacing';
import { getDisclosureEntering } from '@/theme/transitions';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AuthModalProps = {
  onClose: () => void;
  visible: boolean;
};

type AuthModalStep =
  | { screen: 'entry' }
  | { screen: 'login' }
  | { screen: 'signup'; step: number }
  | { screen: 'verify-signup'; email: string }
  | { screen: 'forgot' }
  | { screen: 'verify-recovery'; email: string }
  | { screen: 'reset' };

const stepTitles: Record<AuthModalStep['screen'], string> = {
  entry: 'Tu cuenta',
  login: 'Iniciar sesión',
  signup: 'Crear cuenta',
  'verify-signup': 'Verifica tu correo',
  forgot: 'Recuperar contraseña',
  'verify-recovery': 'Verifica tu correo',
  reset: 'Nueva contraseña',
};

/**
 * Host de los cinco flujos de autenticación: enruta entre ellos con un
 * estado local, sin depender de la navegación de la app (las pantallas de
 * `features/auth/screens` son ajenas a este modal y se reutilizan tal cual
 * desde un flujo a pantalla completa más adelante).
 */
export function AuthModal({ onClose, visible }: AuthModalProps) {
  const styles = useThemedStyles(createStyles);
  const { markAuthenticated } = useOnboardingStatus();
  const [step, setStep] = useState<AuthModalStep>({ screen: 'entry' });

  useEffect(() => {
    if (visible) {
      setStep({ screen: 'entry' });
    }
  }, [visible]);

  const goBack = () => {
    switch (step.screen) {
      case 'login':
        setStep({ screen: 'entry' });
        return;
      case 'signup':
        if (step.step > 1) {
          setStep({ screen: 'signup', step: step.step - 1 });
        } else {
          setStep({ screen: 'entry' });
        }
        return;
      case 'verify-signup':
        setStep({ screen: 'signup', step: 1 });
        return;
      case 'forgot':
        setStep({ screen: 'login' });
        return;
      case 'verify-recovery':
        setStep({ screen: 'forgot' });
        return;
      case 'reset':
        setStep({ screen: 'forgot' });
        return;
      case 'entry':
        onClose();
        return;
    }
  };

  const handleAuthenticated = async () => {
    await markAuthenticated();
    onClose();
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="auth-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {step.screen !== 'entry' ? (
            <ModalCloseButton onPress={goBack} variant="back" />
          ) : null}
          <Text
            accessibilityRole="header"
            style={styles.headerText}
            variant="heading"
          >
            {stepTitles[step.screen]}
          </Text>
          {step.screen === 'entry' ? (
            <ModalCloseButton onPress={goBack} variant="close" />
          ) : null}
        </View>

        {step.screen === 'signup' || step.screen === 'verify-signup' ? (
          <StepProgressBar
            currentStep={
              step.screen === 'verify-signup' ? signUpTotalSteps + 1 : step.step
            }
            testID="auth-modal-signup-progress"
            totalSteps={signUpTotalSteps + 1}
          />
        ) : null}

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={getDisclosureEntering()} key={step.screen}>
            {step.screen === 'entry' ? (
              <View style={styles.entryActions}>
                <Text tone="secondary" variant="label">
                  Inicia sesión o crea una cuenta para proteger y sincronizar
                  tus datos entre dispositivos.
                </Text>
                <ModalPrimaryAction
                  accessibilityLabel="Iniciar sesión"
                  label="Iniciar sesión"
                  onPress={() => setStep({ screen: 'login' })}
                  testID="auth-modal-open-login"
                  variant="surface"
                />
                <ModalPrimaryAction
                  accessibilityLabel="Crear cuenta"
                  label="Crear cuenta"
                  onPress={() => setStep({ screen: 'signup', step: 1 })}
                  testID="auth-modal-open-signup"
                  variant="surface"
                />
              </View>
            ) : null}

            {step.screen === 'login' ? (
              <LoginScreen
                onCancel={onClose}
                onNavigateToForgotPassword={() => setStep({ screen: 'forgot' })}
                onNavigateToSignUp={() =>
                  setStep({ screen: 'signup', step: 1 })
                }
                onSuccess={() => void handleAuthenticated()}
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
                step={step.step}
              />
            ) : null}

            {step.screen === 'verify-signup' ? (
              <VerifyCodeScreen
                email={step.email}
                onCancel={onClose}
                onSuccess={() => void handleAuthenticated()}
                purpose="signup"
              />
            ) : null}

            {step.screen === 'forgot' ? (
              <ForgotPasswordScreen
                onCancel={onClose}
                onNavigateToLogin={() => setStep({ screen: 'login' })}
                onSuccess={({ email }) =>
                  setStep({ screen: 'verify-recovery', email })
                }
              />
            ) : null}

            {step.screen === 'verify-recovery' ? (
              <VerifyCodeScreen
                email={step.email}
                onCancel={onClose}
                onSuccess={() => setStep({ screen: 'reset' })}
                purpose="recovery"
              />
            ) : null}

            {step.screen === 'reset' ? (
              <ResetPasswordScreen onCancel={onClose} onSuccess={onClose} />
            ) : null}
          </Animated.View>
        </BottomSheetScrollView>
      </View>
    </AppModal>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerText: { flex: 1 },
    scrollContent: { paddingBottom: spacing.xl, gap: spacing.lg },
    entryActions: { gap: spacing.lg },
  });
}
