import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import {
  isValidPassword,
  minPasswordLength,
} from '@/features/auth/utils/authValidation';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

/**
 * ADR-084: la pantalla es CONTROLADA. Ya no llama a `setNewPassword` ni decide
 * cuándo terminó el restablecimiento: valida el formulario y entrega la
 * contraseña al controlador del episodio, que es el único dueño de la operación
 * y del destino. `isSubmitting` y `errorMessage` llegan de fuera.
 *
 * `canCancel` también viene del controlador: mientras el guardado está en vuelo
 * no se puede cancelar —ni desde aquí ni desde el «Atrás» del anfitrión—, que es
 * lo que elimina la carrera entre las dos operaciones asíncronas.
 */
type ResetPasswordScreenProps = {
  canCancel: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
};

type ResetPasswordFieldErrors = {
  password?: string;
  confirmation?: string;
};

export function ResetPasswordScreen({
  canCancel,
  errorMessage,
  isSubmitting,
  onCancel,
  onSubmit,
}: ResetPasswordScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});

  const handleSubmit = () => {
    if (isSubmitting) return;

    const errors: ResetPasswordFieldErrors = {};
    if (!isValidPassword(password)) {
      errors.password = `La contraseña debe tener al menos ${minPasswordLength} caracteres.`;
    } else if (password !== confirmation) {
      errors.confirmation = 'Las contraseñas no coinciden.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    onSubmit(password);
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
        onSubmitEditing={handleSubmit}
        placeholder="Repite la contraseña"
        returnKeyType="done"
        secureTextEntry
        testID="reset-password-confirm"
        textContentType="newPassword"
        value={confirmation}
      />

      {errorMessage !== null ? (
        <Text testID="reset-password-error" tone="expense" variant="footnote">
          {errorMessage}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel="Guardar nueva contraseña"
        disabled={isSubmitting}
        label={isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        onPress={handleSubmit}
        testID="reset-password-submit"
        variant="cta"
      />

      <Pressable
        accessibilityRole="button"
        // El controlador decide: mientras guarda, cancelar está cerrado aquí y
        // en el chrome del anfitrión, por la misma fuente de verdad.
        disabled={!canCancel}
        onPress={onCancel}
        style={styles.linkButton}
        testID="reset-password-cancel"
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
