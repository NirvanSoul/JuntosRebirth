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
import { usePasswordRecoveryFlow } from '@/features/auth/recovery/usePasswordRecoveryFlow';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import {
  SignUpScreen,
  signUpTotalSteps,
} from '@/features/auth/screens/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import { useDeferredAuthenticatedMark } from '@/features/legal/hooks/useDeferredAuthenticatedMark';
import { spacing } from '@/theme/spacing';
import { getDisclosureEntering } from '@/theme/transitions';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AuthModalProps = {
  onClose: () => void;
  visible: boolean;
};

/** A dónde lleva la cancelación del episodio en este anfitrión. */
type ExitIntent = 'close' | 'back-to-login';

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
  const { scheduleMarkAuthenticated } = useDeferredAuthenticatedMark();
  const [step, setStep] = useState<AuthModalStep>({ screen: 'entry' });

  // ADR-084: el anfitrión ya no coordina nada, y tampoco recuerda a dónde iba.
  // La intención viaja con la petición y la custodia la MÁQUINA, que solo la
  // guarda si acepta la transición: gana la primera aceptada. Guardarla aquí
  // antes de despachar no servía —`canCancel` viene del render anterior, así que
  // tras aceptar un guardado una cancelación rechazada dejaba su intención
  // escrita y ganaba más tarde a la que sí se aceptaba—.
  const recovery = usePasswordRecoveryFlow({
    onCanceled: (intent) => {
      if (intent === 'back-to-login') {
        setStep({ screen: 'login' });
        return;
      }
      onClose();
    },
    onCompleted: onClose,
  });

  const requestCancelWith = (intent: ExitIntent) => {
    recovery.requestCancel(intent);
  };

  useEffect(() => {
    if (visible) {
      setStep({ screen: 'entry' });
    }
  }, [visible]);

  /** Un episodio terminado ya no gobierna nada: cerrar es cerrar. */
  const isEpisodeOver =
    recovery.state.kind === 'inactive' ||
    recovery.state.kind === 'completed' ||
    recovery.state.kind === 'canceled';

  // ADR-084: cerrar con un episodio VIVO es pedir su cancelación, y el
  // controlador decide. El modal no se oculta por su cuenta: lo hará cuando el
  // episodio llegue a un terminal y ejecute el destino. Si el guardado está en
  // vuelo, `canCancel` es falso y la petición se ignora —ni cierre, ni carrera—.
  //
  // Con el episodio ya terminado se cierra directamente: pedir otra cancelación
  // ahí sería un `no-op` del reductor y el modal quedaría atrapado —tras
  // cancelar con destino «volver a login», el estado se queda en `canceled`—.
  const requestClose = () => {
    if (isEpisodeOver) {
      onClose();
      return;
    }
    requestCancelWith('close');
  };

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
      case 'verify-recovery':
        // Navegación interna del episodio: volver a pedir el código NO lo
        // abandona. Se conserva tal como estaba antes del rediseño.
        setStep({ screen: 'forgot' });
        return;
      case 'forgot':
      case 'reset':
        // ADR-084: aquí «Atrás» sí abandona el episodio, y la máquina sabe si
        // hay sesión del OTP que cerrar y si el momento lo admite. Desde
        // `reset` con el guardado en vuelo se ignora, que es exactamente lo que
        // cierra la carrera.
        requestCancelWith('back-to-login');
        return;
      case 'entry':
        requestClose();
        return;
    }
  };

  const handleAuthenticated = async () => {
    // El marcado de «autenticado» se difiere hasta que la puerta legal
    // habilite la sesión; el modal solo se cierra.
    scheduleMarkAuthenticated();
    onClose();
  };

  return (
    <AppModal
      allowManualDismiss={isEpisodeOver || recovery.canCancel}
      containsScrollable
      onClose={requestClose}
      stackBehavior="push"
      testID="auth-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {step.screen !== 'entry' ? (
            // I1: mientras `saving` la máquina rechaza la salida; el botón se
            // deshabilita de verdad, no solo se ignora.
            <ModalCloseButton
              disabled={recovery.state.kind === 'saving'}
              onPress={goBack}
              variant="back"
            />
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

        {recovery.errorMessage !== null && step.screen !== 'reset' ? (
          <Text style={styles.cancelError} tone="expense" variant="footnote">
            {recovery.errorMessage}
          </Text>
        ) : null}

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
                onCancel={requestClose}
                onNavigateToForgotPassword={() => {
                  recovery.start();
                  setStep({ screen: 'forgot' });
                }}
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
                source="settings-signup"
                step={step.step}
              />
            ) : null}

            {step.screen === 'verify-signup' ? (
              <VerifyCodeScreen
                email={step.email}
                onCancel={requestClose}
                onGoToLogin={() => setStep({ screen: 'login' })}
                onGoToRecovery={() => {
                  recovery.start();
                  setStep({ screen: 'forgot' });
                }}
                onSuccess={() => void handleAuthenticated()}
                purpose="signup"
              />
            ) : null}

            {step.screen === 'forgot' ? (
              <ForgotPasswordScreen
                onCancel={requestClose}
                onNavigateToLogin={() => requestCancelWith('back-to-login')}
                onSuccess={({ email }) => {
                  recovery.codeSent();
                  setStep({ screen: 'verify-recovery', email });
                }}
              />
            ) : null}

            {step.screen === 'verify-recovery' ? (
              <VerifyCodeScreen
                email={step.email}
                onCancel={requestClose}
                onSuccess={() => {
                  // A partir de aquí existe la sesión del OTP: la máquina lo
                  // sabe y cancelar pasará siempre por `signOut('local')`.
                  recovery.codeVerified();
                  setStep({ screen: 'reset' });
                }}
                purpose="recovery"
              />
            ) : null}

            {step.screen === 'reset' ? (
              // ADR-084: pantalla controlada. Ni llama a `setNewPassword` ni
              // decide el destino; entrega la contraseña y el controlador hace
              // el resto. `canCancel` cierra la salida mientras guarda.
              <ResetPasswordScreen
                canCancel={recovery.canCancel || recovery.canRetryCancel}
                errorMessage={recovery.errorMessage}
                isSubmitting={recovery.state.kind === 'saving'}
                onCancel={() => requestCancelWith('back-to-login')}
                onSubmit={recovery.requestSave}
              />
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
    cancelError: { marginBottom: spacing.sm },
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
