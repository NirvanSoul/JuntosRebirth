import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, Pressable, Share, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { isValidEmail } from '@/features/auth/utils/authValidation';
import { createSupabaseInvitationGateway } from '@/features/spaces/gateways/supabaseInvitationGateway';
import type { Space } from '@/features/spaces/types';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
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
  | { kind: 'generating-link' }
  | { kind: 'link-ready'; link: string }
  | { kind: 'invitation-created' }
  | { kind: 'invitee-not-registered' }
  | { kind: 'error'; message: string };

function buildInvitationLink(token: string): string {
  return `juntoss://invitacion/${token}`;
}

/**
 * Anfitrión de "crear espacio de pareja e invitar", siguiendo el mismo
 * patrón de `AppModal` a pantalla completa que `DataRightsScreen`. Cubre dos
 * casos según si `coupleSpace` ya existe: crear el espacio, o invitar (por
 * correo, con reenvío recuperable al enlace si el correo falla, o
 * directamente generando un enlace para compartir).
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
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setEmail('');
      setEmailError(null);
      setPhase({ kind: 'idle' });
      setCopyNotice(null);
    }
  }, [visible]);

  const isBusy =
    phase.kind === 'creating-space' || phase.kind === 'generating-link';

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
    setCopyNotice(null);
    setPhase({ kind: 'creating-space' });
    const gateway = createSupabaseInvitationGateway();
    try {
      await gateway.createInvitation(coupleSpace.id, trimmedEmail);
      setPhase({ kind: 'invitation-created' });
    } catch (caught) {
      if (caught instanceof Error && caught.message.includes('aún no tiene')) {
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

  const handleGenerateLink = async () => {
    if (!coupleSpace) return;
    setCopyNotice(null);
    setPhase({ kind: 'generating-link' });
    const gateway = createSupabaseInvitationGateway();
    try {
      const invitation = await gateway.createInvitation(coupleSpace.id);
      const link = buildInvitationLink(invitation.plaintextToken);
      setPhase({ kind: 'link-ready', link });
      await Share.share({ message: link, url: link }).catch(() => undefined);
    } catch (caught) {
      setPhase({
        kind: 'error',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos generar el enlace.',
      });
    }
  };

  const handleCopyLink = (link: string) => {
    void Clipboard.setStringAsync(link);
    setCopyNotice('Enlace copiado.');
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
                ? `Invita a alguien a compartir "${coupleSpace.name}".`
                : 'Crea un espacio para compartir movimientos con tu pareja.'}
            </Text>
          </View>
          <ModalCloseButton onPress={handleClose} />
        </View>

        {!coupleSpace ? (
          <Image
            accessible={false}
            resizeMode="contain"
            source={require('../../../../assets/Onboarding/Happy Couple.png')}
            style={styles.coupleIllustration}
            testID="invite-partner-couple-illustration"
          />
        ) : null}

        {!coupleSpace ? (
          <View style={styles.body}>
            <Text tone="secondary" variant="body">
              Solo puedes tener un espacio de pareja activo a la vez. El espacio
              se abrirá cuando la otra persona acepte tu invitación, que podrás
              enviar por correo o con un enlace.
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
                  phase.kind === 'creating-space'
                    ? 'Enviando…'
                    : 'Enviar invitación'
                }
                onPress={() => void handleCreateInAppInvitation()}
                testID="invite-partner-send-email"
                variant="cta"
              />
            </View>

            <View style={styles.divider} />

            <Text tone="secondary" variant="footnote">
              O comparte un enlace de invitación directamente.
            </Text>
            <ModalPrimaryAction
              accessibilityLabel="Generar enlace para compartir"
              disabled={isBusy}
              label={
                phase.kind === 'generating-link'
                  ? 'Generando…'
                  : 'Generar enlace para compartir'
              }
              onPress={() => void handleGenerateLink()}
              testID="invite-partner-generate-link"
              variant="surface"
            />

            {phase.kind === 'link-ready' ? (
              <View style={styles.linkFallback}>
                <Text numberOfLines={1} tone="secondary" variant="footnote">
                  {phase.link}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleCopyLink(phase.link)}
                  style={styles.copyButton}
                >
                  <Text tone="brand" variant="footnote">
                    Copiar enlace
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {copyNotice ? (
              <Text tone="secondary" variant="footnote">
                {copyNotice}
              </Text>
            ) : null}
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
              La persona invitada verá este aviso al entrar a Inicio en su app
              de Juntos.
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
              Parece que el correo al que quieres enviar la invitación aún no
              tiene una cuenta en Juntos, revisa el correo y vuélvelo a
              intentar.
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

function createStyles(colors: ColorTokens) {
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
      aspectRatio: 1,
      maxWidth: 260,
      width: '72%',
    },
    body: { gap: spacing.md },
    field: { gap: spacing.md },
    divider: {
      height: 1,
      marginVertical: spacing.sm,
      backgroundColor: colors.border,
    },
    linkFallback: { gap: spacing.xs },
    copyButton: {
      minHeight: layout.minTouchTarget,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    feedbackPanel: { gap: spacing.lg, paddingVertical: spacing.xxl },
    feedbackIcon: { alignSelf: 'center' },
  });
}
