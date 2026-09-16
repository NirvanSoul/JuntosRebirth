import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { isValidEmail } from '@/features/auth/utils/authValidation';
import { HomeEntrance } from '@/features/dashboard/components/HomeEntrance';
import {
  CreateInvitationError,
  createJuntossInvitationGateway,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import type { Space } from '@/features/spaces/types';
import { PendingInvitationBanner } from '@/features/spaces/components/PendingInvitationBanner';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type InvitePartnerScreenProps = {
  coupleSpace: Space | null;
  onAcceptPendingInvitation?: (spaceId?: string) => Promise<void>;
  onCancel?: () => void;
  onFinished: () => void;
  onCreateCoupleSpaceInvitation: (
    inviteeEmail: string,
    name?: string,
  ) => Promise<Space>;
  onOpenCountrySettings?: () => void;
};

type Phase = 'email' | 'sending' | 'sent' | 'invitee-not-registered' | 'error';

/**
 * Flujo a pantalla completa para crear el espacio de pareja y enviar la
 * invitación. La creación remota no empieza hasta confirmar el correo.
 */
export function InvitePartnerScreen({
  coupleSpace,
  onAcceptPendingInvitation,
  onCancel,
  onFinished,
  onCreateCoupleSpaceInvitation,
  onOpenCountrySettings,
}: InvitePartnerScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('email');
  const isBusy = phase === 'sending';
  const isEmailStep =
    phase === 'email' || phase === 'sending' || phase === 'error';

  const sendInvitation = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Ingresa un correo válido.');
      return;
    }

    setEmailError(null);
    setError(null);
    setPhase('sending');
    try {
      if (coupleSpace) {
        await createJuntossInvitationGateway().createInvitation(
          coupleSpace.id,
          trimmedEmail,
        );
      } else {
        await onCreateCoupleSpaceInvitation(trimmedEmail);
      }
      setPhase('sent');
    } catch (caught) {
      if (
        caught instanceof CreateInvitationError &&
        caught.code === 'invitee_not_registered'
      ) {
        setPhase('invitee-not-registered');
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos crear la invitación.',
      );
      setPhase('error');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      {isEmailStep ? (
        <View style={styles.stage}>
          <HomeEntrance key="email-stage">
            {onAcceptPendingInvitation && onOpenCountrySettings ? (
              <PendingInvitationBanner
                onAccepted={onAcceptPendingInvitation}
                onOpenCountrySettings={onOpenCountrySettings}
              />
            ) : null}
            <Image
              accessible={false}
              resizeMode="contain"
              source={require('../../../../assets/Onboarding/Happy_Couple.png')}
              style={styles.coupleIllustration}
              testID="invite-partner-couple-illustration"
            />
            <View style={styles.copy}>
              <Text variant="title">¿A quién quieres invitar?</Text>
              <Text tone="secondary" variant="body">
                Escribe el correo asociado a su cuenta de Juntoss.
              </Text>
            </View>
            <AuthTextField
              autoComplete="email"
              accessibilityLabel="Correo de tu pareja"
              editable={!isBusy}
              error={emailError}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              testID="invite-partner-email"
              value={email}
            />
            {error ? (
              <Text tone="expense" variant="footnote">
                {error}
              </Text>
            ) : null}
            {onCancel ? (
              <View style={styles.actionsRow}>
                <ModalPrimaryAction
                  accessibilityLabel="Cancelar"
                  disabled={isBusy}
                  label="Cancelar"
                  onPress={onCancel}
                  style={styles.actionButton}
                  variant="surface"
                />
                <ModalPrimaryAction
                  accessibilityLabel="Enviar invitación por correo"
                  disabled={isBusy}
                  label={isBusy ? 'Enviando…' : 'Enviar invitación'}
                  onPress={() => void sendInvitation()}
                  style={styles.actionButton}
                  testID="invite-partner-send-email"
                  variant="cta"
                />
              </View>
            ) : (
              <ModalPrimaryAction
                accessibilityLabel="Enviar invitación por correo"
                disabled={isBusy}
                label={isBusy ? 'Enviando…' : 'Enviar invitación'}
                onPress={() => void sendInvitation()}
                testID="invite-partner-send-email"
                variant="cta"
              />
            )}
          </HomeEntrance>
        </View>
      ) : null}

      {phase === 'sent' ? (
        <View style={styles.stage}>
          <HomeEntrance key="sent-stage">
            <Image
              accessible={false}
              resizeMode="contain"
              source={require('../../../../assets/Approve icon.png')}
              style={styles.successIcon}
              testID="invite-partner-success-icon"
            />
            <View style={styles.copy}>
              <Text align="center" variant="title">
                ¡Invitación enviada!
              </Text>
              <Text align="center" tone="secondary" variant="body">
                La invitación ya está dentro de Juntoss. También recibirá un
                aviso si tiene las notificaciones activadas.
              </Text>
            </View>
            <ModalPrimaryAction
              accessibilityLabel="Ver espacio Juntos"
              label="Ver espacio Juntos"
              onPress={onFinished}
              variant="cta"
            />
          </HomeEntrance>
        </View>
      ) : null}

      {phase === 'invitee-not-registered' ? (
        <View style={styles.stage}>
          <HomeEntrance key="not-registered-stage">
            <Ionicons
              color={colors.expense}
              name="alert-circle"
              size={64}
              style={styles.feedbackIcon}
            />
            <View style={styles.copy}>
              <Text align="center" variant="title">
                No encontramos esa cuenta
              </Text>
              <Text align="center" tone="secondary" variant="body">
                Revisa el correo. Si esa persona todavía no usa Juntoss, pídele
                que descargue la app y cree una cuenta antes de volver a
                intentarlo.
              </Text>
            </View>
            {onCancel ? (
              <View style={styles.actionsRow}>
                <ModalPrimaryAction
                  accessibilityLabel="Cancelar"
                  label="Cancelar"
                  onPress={onCancel}
                  style={styles.actionButton}
                  variant="surface"
                />
                <ModalPrimaryAction
                  accessibilityLabel="Corregir correo"
                  label="Corregir correo"
                  onPress={() => setPhase('email')}
                  style={styles.actionButton}
                  variant="cta"
                />
              </View>
            ) : (
              <ModalPrimaryAction
                accessibilityLabel="Corregir correo"
                label="Corregir correo"
                onPress={() => setPhase('email')}
                variant="cta"
              />
            )}
          </HomeEntrance>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.xl,
      paddingTop: 112,
    },
    stage: {
      alignSelf: 'center',
      gap: spacing.lg,
      maxWidth: 520,
      width: '100%',
    },
    coupleIllustration: {
      alignSelf: 'center',
      height: 192,
      width: 224,
    },
    copy: { gap: spacing.md },
    feedbackIcon: { alignSelf: 'center' },
    successIcon: {
      alignSelf: 'center',
      height: 64,
      width: 64,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
}
