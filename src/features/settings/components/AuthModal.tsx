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
import { useRecoveryPhase } from '@/features/auth/hooks/useRecoveryPhase';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import {
  SignUpScreen,
  signUpTotalSteps,
} from '@/features/auth/screens/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import { useDeferredAuthenticatedMark } from '@/features/legal/hooks/useDeferredAuthenticatedMark';
import { useLegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';
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
  const { scheduleMarkAuthenticated } = useDeferredAuthenticatedMark();
  const { setRecoveryHalted } = useLegalSessionGate();
  const {
    cancelReset,
    completeRecovery,
    finishRecovery,
    phase: recoveryPhase,
    startRecovery,
  } = useRecoveryPhase();
  const [step, setStep] = useState<AuthModalStep>({ screen: 'entry' });

  // B3 + B7 + B7(r4): la pausa deriva solo de la fase de recuperación, nunca de
  // `visible`. Mientras existe la sesión del OTP se sostiene durante
  // `canceling` y `cancelError`; solo cae al pasar a `inactive` —tras un
  // signOut('local') con éxito o al terminar el restablecimiento— o al
  // desmontar el host. Cerrar el modal ya no puede despausar la puerta por
  // orden de efectos antes de que el signOut asíncrono termine.
  useEffect(() => {
    setRecoveryHalted(recoveryPhase.kind !== 'inactive');
    return () => setRecoveryHalted(false);
  }, [recoveryPhase.kind, setRecoveryHalted]);

  useEffect(() => {
    if (visible) {
      setStep({ screen: 'entry' });
    }
  }, [visible]);

  // B7(r4)+B10(r6): si `visible` cae a mitad de recuperación por una vía que no
  // pasa por requestClose (el padre fuerza el cierre), la sesión del OTP se
  // sigue cancelando solo cuando NO hay ya una cancelación en vuelo ni una
  // terminación encolada (`canceling`/`cancelingCompletion`): re-llamar
  // `cancelReset` ahí abriría un segundo signOut. La pausa no la libera el
  // cierre: la gobierna solo la fase, así que se mantiene mientras el signOut
  // está pendiente y si este falla.
  //
  // B13(r8): `cancelError` ya NO dispara aquí. Reintentar solo se hace a
  // petición de la persona, con el mensaje delante: un reintento automático es
  // invisible, y encadenado con un fallo persistente formaba el ciclo
  // cancelError → canceling → cancelError a espaldas de todos. Si el padre
  // fuerza el cierre estando en `cancelError`, la fase se sostiene y con ella la
  // pausa de la puerta: la sesión del OTP nunca queda habilitada. Falla cerrado.
  useEffect(() => {
    if (!visible && recoveryPhase.kind === 'active') {
      void cancelReset(() => undefined);
    }
  }, [cancelReset, recoveryPhase.kind, visible]);

  // B7(r4)+B9(r5): toda salida por cancelación posterior a la creación de la
  // sesión del OTP pasa por `cancelReset`. `requestClose` es el único camino de
  // cancelación hacia `onClose` —si la fase sigue viva, primero se cierra la
  // sesión local y solo tras el éxito el modal se oculta; si el signOut falla,
  // el modal permanece con el mensaje visible y el mismo botón reintenta—. El
  // cierre por éxito es una transición distinta: el `onSuccess` de
  // `ResetPasswordScreen` ENTREGA `onClose` a `completeRecovery` y es el hook
  // quien lo ejecuta —de inmediato si no hay cancelación en vuelo, o al resolver
  // la carrera si la hay, y nunca si ya ganó la cancelación (B13/B14)—. El host
  // no cierra por su cuenta ni pasa por `requestClose` en ese camino.
  const requestClose = () => {
    if (recoveryPhase.kind !== 'inactive') {
      void cancelReset(onClose);
    } else {
      onClose();
    }
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
      case 'forgot':
        // Hasta aquí nunca existe la sesión del OTP (solo se crea al verificar
        // el código): salir de la recuperación solo normaliza la fase.
        finishRecovery();
        setStep({ screen: 'login' });
        return;
      case 'verify-recovery':
        setStep({ screen: 'forgot' });
        return;
      case 'reset':
        // B7(r4) ruta 1: volver desde «nueva contraseña» sin ponerla es
        // cancelar. La vuelta a forgot espera al signOut('local') con éxito; si
        // falla, queda `cancelError` con el mensaje visible y el mismo botón
        // reintenta, y la pausa jamás se libera con la sesión del OTP viva.
        void cancelReset(() => setStep({ screen: 'forgot' }));
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
      allowManualDismiss={recoveryPhase.kind === 'inactive'}
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

        {recoveryPhase.kind === 'cancelError' ? (
          <Text style={styles.cancelError} tone="expense" variant="footnote">
            {recoveryPhase.message}
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
                  startRecovery();
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
                  startRecovery();
                  setStep({ screen: 'forgot' });
                }}
                onSuccess={() => void handleAuthenticated()}
                purpose="signup"
              />
            ) : null}

            {step.screen === 'forgot' ? (
              <ForgotPasswordScreen
                onCancel={requestClose}
                onNavigateToLogin={() => {
                  finishRecovery();
                  setStep({ screen: 'login' });
                }}
                onSuccess={({ email }) =>
                  setStep({ screen: 'verify-recovery', email })
                }
              />
            ) : null}

            {step.screen === 'verify-recovery' ? (
              <VerifyCodeScreen
                email={step.email}
                onCancel={requestClose}
                onSuccess={() => setStep({ screen: 'reset' })}
                purpose="recovery"
              />
            ) : null}

            {step.screen === 'reset' ? (
              <ResetPasswordScreen
                onCancel={() => void cancelReset(onClose)}
                // B9: el éxito real de setNewPassword termina por la transición
                // distinguida (completeRecovery), no vuelve a intentar cerrar la
                // sesión aunque un cancelar anterior haya fallado.
                // B13(r8): el cierre por éxito se ENTREGA al hook en vez de
                // ejecutarse aquí. Sin cancelación en vuelo se ejecuta de
                // inmediato; con una en vuelo queda encolado y solo lo ejecuta la
                // resolución si gana la terminación. Así nunca se cierra el modal
                // antes de conocer al ganador ni se ocultan dos destinos.
                onSuccess={() => completeRecovery(onClose)}
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
