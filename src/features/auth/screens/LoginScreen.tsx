import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import {
  confirmGuestDataMerge,
  login,
} from '@/features/auth/services/loginService';
import { isValidEmail } from '@/features/auth/utils/authValidation';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type LoginScreenProps = {
  onCancel: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToSignUp?: () => void;
  onSuccess: () => void;
};

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type LoginState =
  | { step: 'idle' }
  | { step: 'submitting' }
  | { step: 'confirm-merge' }
  | { step: 'merging' }
  | { step: 'error'; message: string };

export function LoginScreen({
  onCancel,
  onNavigateToForgotPassword,
  onNavigateToSignUp,
  onSuccess,
}: LoginScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [state, setState] = useState<LoginState>({ step: 'idle' });
  const isSubmitting = state.step === 'submitting';
  const isMerging = state.step === 'merging';

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    const errors: LoginFieldErrors = {};
    if (!isValidEmail(trimmedEmail)) {
      errors.email = 'Ingresa un correo válido.';
    }
    if (password.length === 0) {
      errors.password = 'Ingresa tu contraseña.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setState({ step: 'submitting' });
    try {
      const outcome = await login({ email: trimmedEmail, password });
      if (outcome.status === 'signed-in') {
        onSuccess();
        return;
      }
      setState({ step: 'confirm-merge' });
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos iniciar sesión.',
      });
    }
  };

  const handleConfirmMerge = async () => {
    setState({ step: 'merging' });
    try {
      await confirmGuestDataMerge();
      onSuccess();
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos combinar tus datos.',
      });
    }
  };

  if (state.step === 'confirm-merge' || state.step === 'merging') {
    return (
      <View style={styles.container}>
        <Text tone="secondary" variant="label">
          Este dispositivo tiene movimientos y categorías guardados como
          invitado. ¿Quieres combinarlos con tu cuenta?
        </Text>
        <View style={styles.actionsRow}>
          <ModalPrimaryAction
            accessibilityLabel="Ahora no, continuar sin combinar"
            disabled={isMerging}
            label="Ahora no"
            onPress={onSuccess}
            style={styles.actionButton}
            variant="surface"
          />
          <ModalPrimaryAction
            accessibilityLabel="Combinar mis datos con la cuenta"
            disabled={isMerging}
            label={isMerging ? 'Combinando…' : 'Combinar mis datos'}
            onPress={() => void handleConfirmMerge()}
            style={styles.actionButton}
            testID="login-confirm-merge"
            variant="cta"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthTextField
        autoComplete="email"
        editable={!isSubmitting}
        error={fieldErrors.email}
        keyboardType="email-address"
        label="Correo"
        onChangeText={setEmail}
        placeholder="tucorreo@ejemplo.com"
        testID="login-email"
        textContentType="emailAddress"
        value={email}
      />
      <AuthTextField
        autoComplete="password"
        editable={!isSubmitting}
        error={fieldErrors.password}
        label="Contraseña"
        onChangeText={setPassword}
        onSubmitEditing={() => void handleSubmit()}
        placeholder="Tu contraseña"
        returnKeyType="done"
        secureTextEntry
        testID="login-password"
        textContentType="password"
        value={password}
      />

      {onNavigateToForgotPassword ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onNavigateToForgotPassword}
          style={styles.linkButtonEnd}
        >
          <Text tone="brand" variant="footnote">
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>
      ) : null}

      {state.step === 'error' ? (
        <Text tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel="Iniciar sesión"
        disabled={isSubmitting}
        label={isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
        onPress={() => void handleSubmit()}
        testID="login-submit"
        variant="cta"
      />

      {onNavigateToSignUp ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onNavigateToSignUp}
          style={styles.linkButton}
        >
          <Text tone="secondary" variant="footnote">
            ¿No tienes cuenta? Crear una
          </Text>
        </Pressable>
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
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { gap: spacing.lg },
    linkButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkButtonEnd: {
      minHeight: layout.minTouchTarget,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionButton: { flex: 1 },
  });
}
