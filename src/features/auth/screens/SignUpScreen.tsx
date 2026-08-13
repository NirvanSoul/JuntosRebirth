import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { signUp } from '@/features/auth/services/signUpService';
import {
  isValidEmail,
  isValidPassword,
  minPasswordLength,
} from '@/features/auth/utils/authValidation';
import { spacing } from '@/theme/spacing';
import { getDisclosureEntering } from '@/theme/transitions';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export const signUpTotalSteps = 4;

type SignUpScreenProps = {
  onNavigateToLogin?: () => void;
  onStepChange: (step: number) => void;
  onSuccess: (result: { email: string }) => void;
  step: number;
};

type SignUpFieldErrors = {
  confirmPassword?: string;
  displayName?: string;
  email?: string;
  password?: string;
};

type SignUpState =
  | { step: 'idle' }
  | { step: 'submitting' }
  | { step: 'error'; message: string };

const stepFields = [
  'displayName',
  'email',
  'password',
  'confirmPassword',
] as const;
type StepField = (typeof stepFields)[number];

export function SignUpScreen({
  onNavigateToLogin,
  onStepChange,
  onSuccess,
  step,
}: SignUpScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [state, setState] = useState<SignUpState>({ step: 'idle' });
  const isSubmitting = state.step === 'submitting';
  const currentField: StepField = stepFields[step - 1] ?? stepFields[0];
  const isLastStep = step === signUpTotalSteps;
  const isFirstStep = step === 1;

  const validateCurrentField = (): string | undefined => {
    switch (currentField) {
      case 'displayName':
        return displayName.trim().length === 0
          ? 'Ingresa tu nombre.'
          : undefined;
      case 'email':
        return isValidEmail(email.trim())
          ? undefined
          : 'Ingresa un correo válido.';
      case 'password':
        return isValidPassword(password)
          ? undefined
          : `La contraseña debe tener al menos ${minPasswordLength} caracteres.`;
      case 'confirmPassword':
        return password === confirmPassword
          ? undefined
          : 'Las contraseñas no coinciden.';
    }
  };

  const handleSubmit = async () => {
    setState({ step: 'submitting' });
    try {
      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      onSuccess({ email: email.trim() });
    } catch (caught) {
      setState({
        step: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos crear tu cuenta.',
      });
    }
  };

  const handleContinue = () => {
    if (isSubmitting) return;

    const error = validateCurrentField();
    setFieldErrors((previous) => ({ ...previous, [currentField]: error }));
    if (error) return;

    if (isLastStep) {
      void handleSubmit();
      return;
    }
    onStepChange(step + 1);
  };

  const handleBack = () => {
    if (isSubmitting || isFirstStep) return;
    onStepChange(step - 1);
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={getDisclosureEntering()} key={step}>
        {currentField === 'displayName' ? (
          <AuthTextField
            autoCapitalize="words"
            autoComplete="name"
            editable={!isSubmitting}
            error={fieldErrors.displayName}
            label="Nombre"
            onChangeText={setDisplayName}
            onSubmitEditing={handleContinue}
            placeholder="Tu nombre"
            testID="signup-display-name"
            value={displayName}
          />
        ) : null}

        {currentField === 'email' ? (
          <AuthTextField
            autoComplete="email"
            editable={!isSubmitting}
            error={fieldErrors.email}
            keyboardType="email-address"
            label="Correo"
            onChangeText={setEmail}
            onSubmitEditing={handleContinue}
            placeholder="tucorreo@ejemplo.com"
            testID="signup-email"
            textContentType="emailAddress"
            value={email}
          />
        ) : null}

        {currentField === 'password' ? (
          <AuthTextField
            autoComplete="password-new"
            editable={!isSubmitting}
            error={fieldErrors.password}
            label="Contraseña"
            onChangeText={setPassword}
            onSubmitEditing={handleContinue}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            testID="signup-password"
            textContentType="newPassword"
            value={password}
          />
        ) : null}

        {currentField === 'confirmPassword' ? (
          <AuthTextField
            autoComplete="password-new"
            editable={!isSubmitting}
            error={fieldErrors.confirmPassword}
            label="Confirmar contraseña"
            onChangeText={setConfirmPassword}
            onSubmitEditing={handleContinue}
            placeholder="Repite la contraseña"
            returnKeyType="done"
            secureTextEntry
            testID="signup-confirm-password"
            textContentType="newPassword"
            value={confirmPassword}
          />
        ) : null}
      </Animated.View>

      {state.step === 'error' ? (
        <Text tone="expense" variant="footnote">
          {state.message}
        </Text>
      ) : null}

      <ModalPrimaryAction
        accessibilityLabel={isLastStep ? 'Crear cuenta' : 'Continuar'}
        disabled={isSubmitting}
        label={
          isSubmitting
            ? 'Creando cuenta…'
            : isLastStep
              ? 'Crear cuenta'
              : 'Continuar'
        }
        onPress={handleContinue}
        testID="signup-submit"
        variant="cta"
      />

      {isFirstStep ? (
        onNavigateToLogin ? (
          <ModalPrimaryAction
            accessibilityLabel="Ya tengo una cuenta, iniciar sesión"
            disabled={isSubmitting}
            label="¿Ya tienes cuenta? Inicia sesión"
            onPress={onNavigateToLogin}
            style={[styles.secondaryAction, { backgroundColor: colors.keypad }]}
            testID="signup-navigate-login"
            variant="surface"
          />
        ) : null
      ) : (
        <ModalPrimaryAction
          accessibilityLabel="Volver al paso anterior"
          disabled={isSubmitting}
          label="Atrás"
          onPress={handleBack}
          style={[styles.secondaryAction, { backgroundColor: colors.keypad }]}
          testID="signup-back"
          variant="surface"
        />
      )}

      <Text align="center" tone="secondary" variant="footnote">
        {
          'Crea una cuenta para proteger y sincronizar\ntus datos entre dispositivos.'
        }
      </Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { gap: spacing.lg },
    secondaryAction: { borderWidth: 0 },
  });
}
