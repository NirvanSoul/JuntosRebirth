import { useEffect, useState } from 'react';
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
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { loadPendingEmailVerification } from '@/features/auth/services/pendingEmailVerification';
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
  // El código verificado viaja hasta aquí: la API lo pide junto con la
  // contraseña nueva, porque verificarlo no abre sesión.
  | { screen: 'reset'; code: string; email: string };

const stepTitles: Record<AccessStep['screen'], string> = {
  entry: 'Empieza con Juntos',
  login: 'Iniciar sesión',
  signup: 'Crear cuenta',
  'verify-signup': 'Verifica tu correo',
  forgot: 'Recuperar contraseña',
  'verify-recovery': 'Verifica tu correo',
  reset: 'Nueva contraseña',
};

/** Host único a pantalla completa para los flujos de autenticación. */
export function AccessScreen() {
  const styles = useThemedStyles(createStyles);
  const { session } = useBetterAuthSession();
  const pendingVerificationEmail =
    session?.user && !session.user.emailVerified ? session.user.email : null;
  const [step, setStep] = useState<AccessStep>(() =>
    pendingVerificationEmail
      ? { screen: 'verify-signup', email: pendingVerificationEmail }
      : { screen: 'entry' },
  );

  // Si el alta acaba de crear una sesión sin verificar, RootNavigator vuelve a
  // montar esta pantalla. Recuperamos el OTP desde la sesión, no desde memoria
  // efímera del formulario que se acaba de desmontar.
  useEffect(() => {
    if (!pendingVerificationEmail) return;
    setStep({ screen: 'verify-signup', email: pendingVerificationEmail });
  }, [pendingVerificationEmail]);

  // La sesión provisional puede desaparecer o refrescarse antes de que la
  // pantalla se vuelva a montar. En ese caso el correo almacenado es la fuente
  // de continuidad del OTP; no concede acceso ni contiene credenciales.
  useEffect(() => {
    let isMounted = true;
    void loadPendingEmailVerification()
      .then((email) => {
        if (isMounted && email) {
          setStep({ screen: 'verify-signup', email });
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

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
            </View>
          ) : null}

          {step.screen === 'login' ? (
            <LoginScreen
              onCancel={goBack}
              onEmailVerificationRequired={(email) =>
                setStep({ screen: 'verify-signup', email })
              }
              onNavigateToForgotPassword={() => setStep({ screen: 'forgot' })}
              onNavigateToSignUp={() => setStep({ screen: 'signup', step: 1 })}
              onSuccess={() => undefined}
            />
          ) : null}

          {step.screen === 'signup' ? (
            <SignUpScreen
              onGoogleSuccess={() => undefined}
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
              onCancel={goBack}
              onSuccess={() => undefined}
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
              onSuccess={({ code }) =>
                setStep({ screen: 'reset', code, email: step.email })
              }
              purpose="recovery"
            />
          ) : null}

          {step.screen === 'reset' ? (
            <ResetPasswordScreen
              code={step.code}
              email={step.email}
              onCancel={goBack}
              onSuccess={goBack}
            />
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
