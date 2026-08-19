import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import {
  resendCode,
  verifyCode,
} from '@/features/auth/services/verifyCodeService';
import type { VerifyCodePurpose } from '@/features/auth/types';
import { layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type VerifyCodeScreenBaseProps = {
  email: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/**
 * Unión discriminada por `purpose`: el caso `signup` exige los dos accesos de
 * cuenta existente (`onGoToLogin` y `onGoToRecovery`), de modo que ningún
 * anfitrión pueda montar la verificación de registro sin cablear la
 * recuperación de contraseña; el que lo olvide falla en typecheck. El caso
 * `recovery` no los necesita.
 */
type VerifyCodeScreenProps =
  | (VerifyCodeScreenBaseProps & {
      purpose: 'signup';
      onGoToLogin: () => void;
      onGoToRecovery: () => void;
    })
  | (VerifyCodeScreenBaseProps & { purpose: 'recovery' });

type VerifyState =
  | { step: 'idle' }
  | { step: 'submitting' }
  | { step: 'success' }
  | { step: 'error'; message: string };

/** Tiempo mínimo entre reenvíos de código, para evitar que un toque repetido sature el correo. */
const resendCooldownSeconds = 30;
const successIconSize = 64;

const successEntering = ZoomIn.springify()
  .damping(motion.disclosureSpring.damping)
  .mass(motion.disclosureSpring.mass)
  .stiffness(motion.disclosureSpring.stiffness)
  .reduceMotion(ReduceMotion.System);

const purposeCopy: Record<
  VerifyCodePurpose,
  { subtitle: (email: string) => string; success: string }
> = {
  signup: {
    subtitle: (email) =>
      `Ingresa el código que enviamos a ${email} para confirmar tu cuenta.`,
    success: 'Te enviamos un nuevo código de confirmación.',
  },
  recovery: {
    subtitle: (email) =>
      `Ingresa el código que enviamos a ${email} para recuperar tu contraseña.`,
    success: 'Te enviamos un nuevo código de recuperación.',
  },
};

export function VerifyCodeScreen(props: VerifyCodeScreenProps) {
  const { email, onCancel, onSuccess, purpose } = props;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [state, setState] = useState<VerifyState>({ step: 'idle' });
  const [isResending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  // Arranca en 1 (no 0) porque el código ya se envió al entrar a esta
  // pantalla: el cooldown de reenvío debe correr desde el primer envío.
  const [cooldownRoundId, setCooldownRoundId] = useState(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(resendCooldownSeconds);
  const isSubmitting = state.step === 'submitting';
  const canResend = !isResending && cooldownSeconds <= 0;

  useEffect(() => {
    setCooldownSeconds(resendCooldownSeconds);
    const intervalId = setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [cooldownRoundId]);

  useEffect(() => {
    if (state.step !== 'success') return;
    const timer = setTimeout(onSuccess, motion.authSuccessAutoContinueDelay);
    return () => clearTimeout(timer);
  }, [onSuccess, state.step]);

  const handleChangeCode = (value: string) => {
    setCode(value.replace(/\D/g, ''));
    setCodeError(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (code.length === 0) {
      setCodeError('Ingresa el código que te enviamos.');
      return;
    }

    setState({ step: 'submitting' });
    try {
      await verifyCode({ email, token: code, purpose });
      if (purpose === 'signup') {
        setState({ step: 'success' });
      } else {
        onSuccess();
      }
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos verificar el código.',
      });
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setResendMessage(null);
    try {
      await resendCode(email, purpose);
      setResendMessage(purposeCopy[purpose].success);
      setCooldownRoundId((current) => current + 1);
    } catch (caught) {
      setResendMessage(
        caught instanceof Error
          ? caught.message
          : 'No pudimos reenviar el código.',
      );
    } finally {
      setResending(false);
    }
  };

  if (state.step === 'success') {
    return (
      <Animated.View
        entering={successEntering}
        style={styles.successContainer}
        testID="verify-code-success"
      >
        <Ionicons
          color={colors.income}
          name="checkmark-circle"
          size={successIconSize}
          testID="verify-code-success-icon"
        />
        <Text accessibilityRole="header" variant="heading">
          ¡Cuenta creada!
        </Text>
        <Text style={styles.successSubtitle} tone="secondary" variant="label">
          Ya puedes empezar a usar Juntoss.
        </Text>
        <ModalPrimaryAction
          accessibilityLabel="Continuar"
          label="Continuar"
          onPress={onSuccess}
          testID="verify-code-success-continue"
          variant="cta"
        />
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Text tone="secondary" variant="label">
        {purposeCopy[purpose].subtitle(email)}
      </Text>

      <AuthTextField
        autoComplete="one-time-code"
        editable={!isSubmitting}
        error={codeError}
        keyboardType="number-pad"
        label="Código de verificación"
        onChangeText={handleChangeCode}
        onSubmitEditing={() => void handleSubmit()}
        placeholder="Código"
        returnKeyType="done"
        testID="verify-code-input"
        textContentType="oneTimeCode"
        value={code}
      />

      {state.step === 'error' ? (
        <Text tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel="Verificar código"
        disabled={isSubmitting}
        label={isSubmitting ? 'Verificando…' : 'Verificar código'}
        onPress={() => void handleSubmit()}
        testID="verify-code-submit"
        variant="cta"
      />

      <Pressable
        accessibilityLabel={
          canResend
            ? 'Reenviar código'
            : `Espera ${cooldownSeconds} segundos para reenviar`
        }
        accessibilityRole="button"
        disabled={!canResend}
        onPress={() => void handleResend()}
        style={styles.linkButton}
      >
        <Text tone={canResend ? 'brand' : 'muted'} variant="footnote">
          {canResend
            ? 'Reenviar código'
            : `Reenviar código (${cooldownSeconds}s)`}
        </Text>
      </Pressable>

      {resendMessage ? (
        <Text tone="secondary" variant="footnote">
          {resendMessage}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={onCancel}
        style={styles.linkButton}
      >
        <Text tone="muted" variant="footnote">
          Cancelar
        </Text>
      </Pressable>

      {props.purpose === 'signup' ? (
        <View style={styles.existingAccountHint}>
          <Text tone="secondary" variant="footnote">
            Si este correo no tenía cuenta, te llegará un código. Si ya tenía
            una, no recibirás uno aquí.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={props.onGoToLogin}
            style={styles.linkButton}
            testID="verify-code-go-to-login"
          >
            <Text tone="brand" variant="footnote">
              Iniciar sesión
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={props.onGoToRecovery}
            style={styles.linkButton}
            testID="verify-code-go-to-recovery"
          >
            <Text tone="brand" variant="footnote">
              Recuperar contraseña
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { gap: spacing.lg },
    existingAccountHint: {
      gap: spacing.sm,
      alignItems: 'center',
    },
    linkButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successContainer: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    successSubtitle: {
      textAlign: 'center',
    },
  });
}
