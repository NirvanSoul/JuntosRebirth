import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { isValidEmail } from '@/features/auth/utils/authValidation';
import {
  CreateInvitationError,
  createSupabaseInvitationGateway,
} from '@/features/spaces/gateways/supabaseInvitationGateway';
import type { Space } from '@/features/spaces/types';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { useTheme } from '@/theme/useTheme';

type InvitePartnerScreenProps = {
  coupleSpace: Space | null;
  onClose: () => void;
  onCreateCoupleSpace: (name?: string) => Promise<Space>;
  visible: boolean;
};

type Phase =
  | { kind: 'idle' }
  | { kind: 'creating-space' }
  | { kind: 'sending-invitation' }
  | { kind: 'invitation-created' }
  | { kind: 'invitee-not-registered' }
  | { kind: 'error'; message: string };

/**
 * Anfitrión de "crear espacio de pareja e invitar", siguiendo el mismo
 * patrón de `AppModal` a pantalla completa que `DataRightsScreen`. Cubre dos
 * casos según si `coupleSpace` ya existe: crear el espacio o dirigir una
 * invitación al correo de una cuenta existente. No genera enlaces manuales.
 */
export function InvitePartnerScreen({
  coupleSpace,
  onClose,
  onCreateCoupleSpace,
  visible,
}: InvitePartnerScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  useEffect(() => {
    if (visible) {
      setEmail('');
      setEmailError(null);
      setPhase({ kind: 'idle' });
    }
  }, [visible]);

  const isBusy =
    phase.kind === 'creating-space' || phase.kind === 'sending-invitation';

  const handleClose = () => {
    setPhase({ kind: 'idle' });
    onClose();
  };

  const handleCreateSpace = async () => {
    setPhase({ kind: 'creating-space' });
    try {
      await onCreateCoupleSpace();
      setPhase({ kind: 'idle' });
    } catch (caught) {
      setPhase({
        kind: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos crear el espacio de pareja.',
      });
    }
  };

  const handleCreateInAppInvitation = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Ingresa un correo válido.');
      return;
    }
    if (!coupleSpace) return;

    setEmailError(null);
    setPhase({ kind: 'sending-invitation' });
    const gateway = createSupabaseInvitationGateway();
    try {
      await gateway.createInvitation(coupleSpace.id, trimmedEmail);
      setPhase({ kind: 'invitation-created' });
    } catch (caught) {
      if (
        caught instanceof CreateInvitationError &&
        caught.code === 'invitee_not_registered'
      ) {
        setPhase({ kind: 'invitee-not-registered' });
        return;
      }
      setPhase({
        kind: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos crear la invitación.',
      });
    }
  };

  return (
    <AppModal
      containsScrollable
      onClose={handleClose}
      stackBehavior="push"
      testID="invite-partner-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Espacio de pareja
            </Text>
            <Text tone="secondary" variant="label">
              {coupleSpace
                ? 'Escribe el correo asociado a la cuenta de tu pareja.'
                : 'Crea un espacio para compartir movimientos con tu pareja.'}
            </Text>
          </View>
          <ModalCloseButton onPress={handleClose} />
        </View>

        {!coupleSpace ? (
          <View style={styles.creationContent}>
            <Image
              accessible={false}
              resizeMode="contain"
              source={require('../../../../assets/Onboarding/Happy Couple.png')}
              style={styles.coupleIllustration}
              testID="invite-partner-couple-illustration"
            />
            <Text tone="secondary" variant="body">
              El espacio se activará cuando la otra persona acepte la invitación
              dentro de Juntoss.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Crear espacio de pareja"
              disabled={isBusy}
              label={
                phase.kind === 'creating-space'
                  ? 'Creando…'
                  : 'Crear espacio de pareja'
              }
              onPress={() => void handleCreateSpace()}
              testID="invite-partner-create-space"
              variant="cta"
            />
          </View>
        ) : phase.kind !== 'invitation-created' &&
          phase.kind !== 'invitee-not-registered' ? (
          <View style={styles.body}>
            <View style={styles.field}>
              <AuthTextField
                autoComplete="email"
                editable={!isBusy}
                error={emailError}
                keyboardType="email-address"
                label="Correo de tu pareja"
                onChangeText={setEmail}
                placeholder="tucorreo@ejemplo.com"
                testID="invite-partner-email"
                value={email}
              />
              <ModalPrimaryAction
                accessibilityLabel="Enviar invitación por correo"
                disabled={isBusy}
                label={
                  phase.kind === 'sending-invitation'
                    ? 'Enviando…'
                    : 'Enviar invitación'
                }
                onPress={() => void handleCreateInAppInvitation()}
                testID="invite-partner-send-email"
                variant="cta"
              />
            </View>
          </View>
        ) : null}

        {phase.kind === 'error' ? (
          <Text tone="expense" variant="footnote">
            {phase.message}
          </Text>
        ) : null}
        {phase.kind === 'invitation-created' ? (
          <View style={styles.feedbackPanel}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.income}
              importantForAccessibility="no-hide-descendants"
              name="checkmark-circle"
              size={48}
              style={styles.feedbackIcon}
            />
            <Text align="center" accessibilityRole="header" variant="heading">
              ¡Invitación enviada!
            </Text>
            <Text align="center" tone="secondary" variant="body">
              La invitación ya está dentro de Juntoss. También recibirá un aviso
              si tiene las notificaciones activadas.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Aceptar"
              label="Aceptar"
              onPress={handleClose}
              variant="cta"
            />
          </View>
        ) : null}
        {phase.kind === 'invitee-not-registered' ? (
          <View style={styles.feedbackPanel}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.expense}
              importantForAccessibility="no-hide-descendants"
              name="alert-circle"
              size={48}
              style={styles.feedbackIcon}
            />
            <Text align="center" accessibilityRole="header" variant="heading">
              No encontramos esa cuenta
            </Text>
            <Text align="center" tone="secondary" variant="body">
              Revisa que esté bien escrito. Si esa persona todavía no usa
              Juntoss, pídele que descargue la app y cree una cuenta con ese
              correo antes de volver a intentarlo.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Aceptar"
              label="Aceptar"
              onPress={() => setPhase({ kind: 'idle' })}
              variant="cta"
            />
          </View>
        ) : null}
      </View>
    </AppModal>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerText: { flex: 1, gap: spacing.xs },
    coupleIllustration: {
      alignSelf: 'center',
      height: 220,
      width: 220,
    },
    creationContent: { gap: spacing.md },
    body: { gap: spacing.md },
    field: { gap: spacing.md },
    feedbackPanel: { gap: spacing.lg, paddingVertical: spacing.xxl },
    feedbackIcon: { alignSelf: 'center' },
  });
}
