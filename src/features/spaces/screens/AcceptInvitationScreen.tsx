import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { StepProgressBar } from '@/components/ui/StepProgressBar/StepProgressBar';
import { Text } from '@/components/ui/Text/Text';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import {
  SignUpScreen,
  signUpTotalSteps,
} from '@/features/auth/screens/SignUpScreen';
import { VerifyCodeScreen } from '@/features/auth/screens/VerifyCodeScreen';
import {
  AcceptInvitationError,
  createSupabaseInvitationGateway,
  type AcceptInvitationErrorCode,
  type InvitationPreview,
} from '@/features/spaces/gateways/supabaseInvitationGateway';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type AcceptInvitationScreenProps = {
  onFinished: () => void;
  refreshCoupleSpace: () => Promise<void>;
  token: string;
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; preview: InvitationPreview };

type AcceptState =
  | { status: 'idle' }
  | { status: 'accepting' }
  | { status: 'accepted'; spaceName: string }
  | { status: 'error'; message: string };

type AuthFlowStep =
  | { screen: 'login' }
  | { screen: 'signup'; step: number }
  | { screen: 'verify-signup'; email: string }
  | { screen: 'forgot' }
  | { screen: 'verify-recovery'; email: string }
  | { screen: 'reset' };

const terminalCopy: Record<
  'not_found' | 'expired' | 'accepted' | 'revoked',
  { title: string; body: string }
> = {
  not_found: {
    title: 'Invitación no encontrada',
    body: 'Este enlace no corresponde a ninguna invitación válida.',
  },
  expired: {
    title: 'Invitación caducada',
    body: 'Esta invitación ya no está disponible. Pide a quien te invitó que genere una nueva.',
  },
  accepted: {
    title: 'Invitación ya utilizada',
    body: 'Esta invitación ya fue aceptada anteriormente.',
  },
  revoked: {
    title: 'Invitación revocada',
    body: 'Quien te invitó canceló esta invitación.',
  },
};

function describeAcceptError(
  code: AcceptInvitationErrorCode,
  fallback: string,
): string {
  switch (code) {
    case 'already_in_couple_space':
      return 'Ya perteneces a otro espacio juntos. Solo puedes tener uno activo a la vez: elimina ese espacio antes de aceptar esta invitación.';
    case 'invitation_wrong_email':
      return 'Esta invitación se envió a otro correo. Inicia sesión con la cuenta que recibió el correo, o pide a quien te invitó que genere un enlace nuevo.';
    default:
      return fallback;
  }
}

/**
 * Pantalla completa (no modal): debe poder abrirse desde un enlace profundo
 * en frío, antes de que exista ningún host de modales. Cubre las tres ramas
 * de `docs`/plan: con sesión, sin sesión con cuenta, sin cuenta.
 */
export function AcceptInvitationScreen({
  onFinished,
  refreshCoupleSpace,
  token,
}: AcceptInvitationScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { isReady: isAuthReady, session } = useAuthSession();
  const [previewState, setPreviewState] = useState<PreviewState>({
    status: 'loading',
  });
  const [acceptState, setAcceptState] = useState<AcceptState>({
    status: 'idle',
  });
  const [authStep, setAuthStep] = useState<AuthFlowStep>({ screen: 'login' });
  const hasAutoAcceptedRef = useRef(false);
  const initialSessionCheckedRef = useRef(false);
  const hadSessionOnLoadRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const gateway = createSupabaseInvitationGateway();
    void gateway
      .getInvitationPreview(token)
      .then((preview) => {
        if (isMounted) setPreviewState({ status: 'loaded', preview });
      })
      .catch(() => {
        if (isMounted) setPreviewState({ status: 'error' });
      });
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!isAuthReady || initialSessionCheckedRef.current) return;
    initialSessionCheckedRef.current = true;
    hadSessionOnLoadRef.current = Boolean(session);
  }, [isAuthReady, session]);

  const handleAccept = useCallback(async () => {
    setAcceptState({ status: 'accepting' });
    const gateway = createSupabaseInvitationGateway();
    try {
      const result = await gateway.acceptInvitation(token);
      await refreshCoupleSpace();
      setAcceptState({ status: 'accepted', spaceName: result.spaceName });
    } catch (caught) {
      const message =
        caught instanceof AcceptInvitationError
          ? describeAcceptError(caught.code, caught.message)
          : caught instanceof Error
            ? caught.message
            : 'No pudimos aceptar la invitación.';
      setAcceptState({ status: 'error', message });
    }
  }, [refreshCoupleSpace, token]);

  useEffect(() => {
    if (!initialSessionCheckedRef.current || hadSessionOnLoadRef.current)
      return;
    if (!session) return;
    if (
      previewState.status !== 'loaded' ||
      previewState.preview.status !== 'pending'
    ) {
      return;
    }
    if (acceptState.status !== 'idle' || hasAutoAcceptedRef.current) return;

    hasAutoAcceptedRef.current = true;
    void handleAccept();
  }, [acceptState.status, handleAccept, previewState, session]);

  if (previewState.status === 'loading') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (previewState.status === 'error') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.centeredBody}>
          <Text accessibilityRole="header" variant="heading">
            No pudimos abrir esta invitación
          </Text>
          <Text tone="secondary" variant="body">
            Comprueba tu conexión e inténtalo de nuevo desde el enlace original.
          </Text>
          <ModalPrimaryAction
            accessibilityLabel="Ir a Inicio"
            label="Ir a Inicio"
            onPress={onFinished}
            variant="cta"
          />
        </View>
      </SafeAreaView>
    );
  }

  const { preview } = previewState;

  if (preview.status !== 'pending') {
    const copy = terminalCopy[preview.status];
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.centeredBody}>
          <Text accessibilityRole="header" variant="heading">
            {copy.title}
          </Text>
          <Text tone="secondary" variant="body">
            {copy.body}
          </Text>
          <ModalPrimaryAction
            accessibilityLabel="Ir a Inicio"
            label="Ir a Inicio"
            onPress={onFinished}
            variant="cta"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (acceptState.status === 'accepted') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.centeredBody}>
          <Text accessibilityRole="header" variant="heading">
            ¡Listo!
          </Text>
          <Text tone="secondary" variant="body">
            Ahora compartes &quot;{acceptState.spaceName}&quot; con{' '}
            {preview.inviterDisplayName}.
          </Text>
          <ModalPrimaryAction
            accessibilityLabel="Ir a Inicio"
            label="Ir a Inicio"
            onPress={onFinished}
            testID="accept-invitation-done"
            variant="cta"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (session) {
    const isAccepting = acceptState.status === 'accepting';
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.body}>
            <Text accessibilityRole="header" variant="heading">
              Invitación a espacio de pareja
            </Text>
            <Text tone="secondary" variant="body">
              {preview.inviterDisplayName} te invitó a compartir &quot;
              {preview.spaceName}&quot; en Juntoss.
            </Text>

            {acceptState.status === 'error' ? (
              <Text tone="expense" variant="footnote">
                {acceptState.message}
              </Text>
            ) : null}

            <View style={styles.actionsRow}>
              <ModalPrimaryAction
                accessibilityLabel="Cancelar"
                disabled={isAccepting}
                label="Cancelar"
                onPress={onFinished}
                style={styles.actionButton}
                variant="surface"
              />
              <ModalPrimaryAction
                accessibilityLabel="Aceptar invitación"
                disabled={isAccepting}
                label={isAccepting ? 'Aceptando…' : 'Aceptar'}
                onPress={() => void handleAccept()}
                style={styles.actionButton}
                testID="accept-invitation-confirm"
                variant="cta"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          <Text accessibilityRole="header" variant="heading">
            Invitación a espacio de pareja
          </Text>
          <Text tone="secondary" variant="body">
            {preview.inviterDisplayName} te invitó a compartir &quot;
            {preview.spaceName}&quot; en Juntoss.
            {preview.invitedEmailMasked
              ? ` Invitado como ${preview.invitedEmailMasked}.`
              : ''}
          </Text>
          <Text tone="secondary" variant="footnote">
            Inicia sesión o crea una cuenta para aceptarla.
          </Text>

          {authStep.screen === 'login' ? (
            <LoginScreen
              onCancel={onFinished}
              onNavigateToForgotPassword={() =>
                setAuthStep({ screen: 'forgot' })
              }
              onNavigateToSignUp={() =>
                setAuthStep({ screen: 'signup', step: 1 })
              }
              onSuccess={() => undefined}
            />
          ) : null}

          {authStep.screen === 'signup' ||
          authStep.screen === 'verify-signup' ? (
            <StepProgressBar
              currentStep={
                authStep.screen === 'verify-signup'
                  ? signUpTotalSteps + 1
                  : authStep.step
              }
              testID="accept-invitation-signup-progress"
              totalSteps={signUpTotalSteps + 1}
            />
          ) : null}

          {authStep.screen === 'signup' ? (
            <SignUpScreen
              onNavigateToLogin={() => setAuthStep({ screen: 'login' })}
              onStepChange={(nextStep) =>
                setAuthStep({ screen: 'signup', step: nextStep })
              }
              onSuccess={({ email }) =>
                setAuthStep({ screen: 'verify-signup', email })
              }
              step={authStep.step}
            />
          ) : null}

          {authStep.screen === 'verify-signup' ? (
            <VerifyCodeScreen
              email={authStep.email}
              onCancel={() => setAuthStep({ screen: 'signup', step: 1 })}
              onGoToLogin={() => setAuthStep({ screen: 'login' })}
              onGoToRecovery={() => setAuthStep({ screen: 'forgot' })}
              onSuccess={() => undefined}
              purpose="signup"
            />
          ) : null}

          {authStep.screen === 'forgot' ? (
            <ForgotPasswordScreen
              onCancel={() => setAuthStep({ screen: 'login' })}
              onNavigateToLogin={() => setAuthStep({ screen: 'login' })}
              onSuccess={({ email }) =>
                setAuthStep({ screen: 'verify-recovery', email })
              }
            />
          ) : null}

          {authStep.screen === 'verify-recovery' ? (
            <VerifyCodeScreen
              email={authStep.email}
              onCancel={() => setAuthStep({ screen: 'forgot' })}
              onSuccess={() => setAuthStep({ screen: 'reset' })}
              purpose="recovery"
            />
          ) : null}

          {authStep.screen === 'reset' ? (
            <ResetPasswordScreen
              onCancel={() => setAuthStep({ screen: 'login' })}
              onSuccess={() => setAuthStep({ screen: 'login' })}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    centeredBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
    body: { gap: spacing.lg, paddingVertical: spacing.xl },
    actionsRow: { flexDirection: 'row', gap: spacing.md },
    actionButton: { flex: 1 },
  });
}
