import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { requestPasswordReset } from '@/features/auth/services/resetPasswordService';
import { isValidEmail } from '@/features/auth/utils/authValidation';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ForgotPasswordScreenProps = {
  onCancel: () => void;
  onNavigateToLogin?: () => void;
  onSuccess: (result: { email: string }) => void;
};

type ForgotPasswordState =
  | { step: 'idle' }
  | { step: 'submitting' }
  | { step: 'error'; message: string };

export function ForgotPasswordScreen({
  onCancel,
  onNavigateToLogin,
  onSuccess,
}: ForgotPasswordScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<ForgotPasswordState>({ step: 'idle' });
  const isSubmitting = state.step === 'submitting';

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Ingresa un correo válido.');
      return;
    }
    setEmailError(null);

    setState({ step: 'submitting' });
    try {
      await requestPasswordReset(trimmedEmail);
      onSuccess({ email: trimmedEmail });
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos enviar el código de recuperación.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text tone="secondary" variant="label">
        Te enviaremos un código por correo para que puedas crear una nueva
        contraseña.
      </Text>

      <AuthTextField
        autoComplete="email"
        editable={!isSubmitting}
        error={emailError}
        keyboardType="email-address"
        label="Correo"
        onChangeText={setEmail}
        onSubmitEditing={() => void handleSubmit()}
        placeholder="tucorreo@ejemplo.com"
        returnKeyType="done"
        testID="forgot-password-email"
        textContentType="emailAddress"
        value={email}
      />

      {state.step === 'error' ? (
        <Text tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel="Enviar código de recuperación"
        disabled={isSubmitting}
        label={isSubmitting ? 'Enviando…' : 'Enviar código'}
        onPress={() => void handleSubmit()}
        testID="forgot-password-submit"
        variant="cta"
      />

      {onNavigateToLogin ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onNavigateToLogin}
          style={styles.linkButton}
        >
          <Text tone="secondary" variant="footnote">
            Volver a iniciar sesión
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
  });
}
