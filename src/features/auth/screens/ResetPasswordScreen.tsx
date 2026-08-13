import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { setNewPassword } from '@/features/auth/services/resetPasswordService';
import {
  isValidPassword,
  minPasswordLength,
} from '@/features/auth/utils/authValidation';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type ResetPasswordScreenProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

type ResetPasswordFieldErrors = {
  password?: string;
  confirmation?: string;
};

type ResetPasswordState =
  | { step: 'idle' }
  | { step: 'submitting' }
  | { step: 'error'; message: string };

export function ResetPasswordScreen({
  onCancel,
  onSuccess,
}: ResetPasswordScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [state, setState] = useState<ResetPasswordState>({ step: 'idle' });
  const isSubmitting = state.step === 'submitting';

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const errors: ResetPasswordFieldErrors = {};
    if (!isValidPassword(password)) {
      errors.password = `La contraseña debe tener al menos ${minPasswordLength} caracteres.`;
    } else if (password !== confirmation) {
      errors.confirmation = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setState({ step: 'submitting' });
    try {
      await setNewPassword(password);
      onSuccess();
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos actualizar tu contraseña.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text tone="secondary" variant="label">
        Elige una nueva contraseña para tu cuenta.
      </Text>

      <AuthTextField
        autoComplete="password-new"
        editable={!isSubmitting}
        error={fieldErrors.password}
        label="Nueva contraseña"
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        testID="reset-password-new"
        textContentType="newPassword"
        value={password}
      />
      <AuthTextField
        autoComplete="password-new"
        editable={!isSubmitting}
        error={fieldErrors.confirmation}
        label="Confirmar contraseña"
        onChangeText={setConfirmation}
        onSubmitEditing={() => void handleSubmit()}
        placeholder="Repite la contraseña"
        returnKeyType="done"
        secureTextEntry
        testID="reset-password-confirm"
        textContentType="newPassword"
        value={confirmation}
      />

      {state.step === 'error' ? (
        <Text tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel="Guardar nueva contraseña"
        disabled={isSubmitting}
        label={isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        onPress={() => void handleSubmit()}
        testID="reset-password-submit"
        variant="cta"
      />

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
