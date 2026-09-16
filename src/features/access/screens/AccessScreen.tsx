import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { StepProgressBar } from '@/components/ui/StepProgressBar/StepProgressBar';
import { OnboardingScreenLayout } from '@/features/onboarding/components/OnboardingScreenLayout';
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
import type { ColorTokens } from '@/theme/types';
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

/** Ancho ÷ alto real de `10_loginicon.png`, para el tamaño estándar de lámina. */
const entryIllustrationAspectRatio = 1206 / 1218;

/** Host único a pantalla completa para los flujos de autenticación. */
type AccessScreenProps = {
  /** Se invoca al autenticar desde el último paso de onboarding. */
  onAuthenticated?: () => Promise<void>;
};

export function AccessScreen({ onAuthenticated }: AccessScreenProps) {
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
  const [syncedVerificationEmail, setSyncedVerificationEmail] = useState<
    string | null
  >(null);
  if (
    pendingVerificationEmail &&
    pendingVerificationEmail !== syncedVerificationEmail
  ) {
    setSyncedVerificationEmail(pendingVerificationEmail);
    setStep({ screen: 'verify-signup', email: pendingVerificationEmail });
  }

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

  const handleAuthenticated = () => {
    if (!onAuthenticated) return;
    void onAuthenticated().catch((error: unknown) => {
      console.error('[access] No se pudo completar el onboarding', error);
    });
  };

  // La entrada es la undécima lámina del onboarding: se dibuja con la misma
  // estructura que las diez anteriores (progreso, ilustración a tamaño
  // estándar, titular revelado y acción principal al pie) en vez de repetir
  // aquí sus medidas. El resto de pasos conserva el andamiaje con scroll,
  // porque son formularios que conviven con el teclado.
  if (step.screen === 'entry') {
    return (
      <OnboardingScreenLayout
        actionLabel="Crear cuenta"
        currentStep={11}
        illustrationAspectRatio={entryIllustrationAspectRatio}
        illustrationSource={require('../../../../assets/Onboarding/10_loginicon.png')}
        onAction={() => setStep({ screen: 'signup', step: 1 })}
        secondaryAction={
          <ModalPrimaryAction
            accessibilityLabel="Iniciar sesión"
            label="Iniciar sesión"
            onPress={() => setStep({ screen: 'login' })}
            style={styles.onboardingLoginAction}
            testID="onboarding-login-open-login"
            variant="surface"
          />
        }
        subtitle="Inicia sesión fácilmente o crea una cuenta, para empezar a mejorar tus finanzas."
        testID="onboarding-login"
        title={'Empecemos esto\nJuntos.'}
      />
    );
  }

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
            step.screen === 'signup' || step.screen === 'login'
              ? styles.inlineHeader
              : null,
          ]}
        >
          {step.screen === 'signup' || step.screen === 'login' ? (
            <ModalCloseButton onPress={goBack} variant="back" />
          ) : (
            <ModalPrimaryAction
              accessibilityLabel="Volver"
              label="Atrás"
              onPress={goBack}
              style={styles.backAction}
              variant="surface"
            />
          )}
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
          {step.screen === 'login' ? (
            <LoginScreen
              onEmailVerificationRequired={(email) =>
                setStep({ screen: 'verify-signup', email })
              }
              onNavigateToForgotPassword={() => setStep({ screen: 'forgot' })}
              onNavigateToSignUp={() => setStep({ screen: 'signup', step: 1 })}
              onSuccess={handleAuthenticated}
            />
          ) : null}

          {step.screen === 'signup' ? (
            <SignUpScreen
              onGoogleSuccess={handleAuthenticated}
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
              onSuccess={handleAuthenticated}
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

function createStyles(colors: ColorTokens) {
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
    inlineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    backAction: { alignSelf: 'flex-start' },
    onboardingLoginAction: { backgroundColor: colors.keypad, borderWidth: 0 },
  });
}
