/**
 * Stubs interactivos de las pantallas de autenticación para pruebas de
 * integración de anfitriones (`AccessScreen`, `AuthModal`,
 * `AcceptInvitationScreen`). Cada stub expone sus callbacks de navegación como
 * botones con testID, de modo que la prueba pueda conducir el cableado del
 * anfitrión y demostrar a qué paso lleva cada uno, sin montar los formularios
 * reales (que exigirían mockear Supabase, AsyncStorage, etc.).
 */
import { Pressable, Text, View } from 'react-native';

type AnyProps = Record<string, unknown> & {
  onCancel?: () => void;
  onGoToLogin?: () => void;
  onGoToRecovery?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToSignUp?: () => void;
  onSuccess?: (payload: { email: string }) => void;
  purpose?: string;
};

export function LoginScreenStub(props: AnyProps) {
  return (
    <View testID="stub-login-screen">
      {props.onNavigateToForgotPassword ? (
        <Pressable
          onPress={props.onNavigateToForgotPassword}
          testID="stub-login-forgot"
        />
      ) : null}
      {props.onNavigateToSignUp ? (
        <Pressable
          onPress={props.onNavigateToSignUp}
          testID="stub-login-signup"
        />
      ) : null}
    </View>
  );
}

export function SignUpScreenStub(props: AnyProps) {
  return (
    <View testID="stub-signup-screen">
      <Pressable
        onPress={() => props.onSuccess?.({ email: 'persona@ejemplo.com' })}
        testID="stub-signup-complete"
      />
    </View>
  );
}

export function VerifyCodeScreenStub(props: AnyProps) {
  return (
    <View testID="stub-verify-screen">
      <Text testID="stub-verify-purpose">{props.purpose}</Text>
      {props.onGoToLogin ? (
        <Pressable onPress={props.onGoToLogin} testID="stub-verify-go-login" />
      ) : null}
      {props.onGoToRecovery ? (
        <Pressable
          onPress={props.onGoToRecovery}
          testID="stub-verify-go-recovery"
        />
      ) : null}
      {props.onCancel ? (
        <Pressable onPress={props.onCancel} testID="stub-verify-cancel" />
      ) : null}
      <Pressable
        onPress={() => props.onSuccess?.({ email: 'persona@ejemplo.com' })}
        testID="stub-verify-success"
      />
    </View>
  );
}

export function ForgotPasswordScreenStub(props: AnyProps) {
  return (
    <View testID="stub-forgot-screen">
      <Pressable
        onPress={() => props.onSuccess?.({ email: 'persona@ejemplo.com' })}
        testID="stub-forgot-send"
      />
    </View>
  );
}

export function ResetPasswordScreenStub(props: {
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  return (
    <View testID="stub-reset-screen">
      {props.onSuccess ? (
        <Pressable onPress={props.onSuccess} testID="stub-reset-success" />
      ) : null}
      {props.onCancel ? (
        <Pressable onPress={props.onCancel} testID="stub-reset-cancel" />
      ) : null}
    </View>
  );
}
