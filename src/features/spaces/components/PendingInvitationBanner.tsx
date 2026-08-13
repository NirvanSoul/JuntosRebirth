import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import {
  AcceptInvitationError,
  createSupabaseInvitationGateway,
  type CurrentUserInvitation,
} from '@/features/spaces/gateways/supabaseInvitationGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { useAppForeground } from '@/hooks/useAppForeground';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PendingInvitationBannerProps = {
  onAccepted: () => Promise<void>;
};

/** Aviso no bloqueante para una invitación dirigida al correo de la sesión. */
export function PendingInvitationBanner({
  onAccepted,
}: PendingInvitationBannerProps) {
  const { session } = useAuthSession();
  const styles = useThemedStyles(createStyles);
  const [invitation, setInvitation] = useState<CurrentUserInvitation | null>(
    null,
  );
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshInvitation = useCallback(() => {
    if (!session) {
      setInvitation(null);
      return;
    }
    let isMounted = true;
    void createSupabaseInvitationGateway()
      .getCurrentUserPendingInvitation()
      .then((next) => {
        if (isMounted) setInvitation(next);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => refreshInvitation(), [refreshInvitation]);
  useAppForeground(() => {
    refreshInvitation();
  });

  const handleAccept = async () => {
    if (!invitation || isBusy) return;
    setBusy(true);
    setError(null);
    try {
      await createSupabaseInvitationGateway().acceptCurrentUserInvitation(
        invitation.invitationId,
      );
      await onAccepted();
      setInvitation(null);
    } catch (caught) {
      setError(
        caught instanceof AcceptInvitationError
          ? caught.message
          : 'No pudimos aceptar la invitación. Inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!invitation) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      style={styles.card}
      testID="pending-space-invitation"
    >
      <Text accessibilityRole="header" variant="label">
        Invitación a espacio Juntos
      </Text>
      <Text tone="secondary" variant="footnote">
        {invitation.inviterDisplayName} te ha invitado a compartir “
        {invitation.spaceName}”.
      </Text>
      {error ? (
        <Text tone="expense" variant="footnote">
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <ModalPrimaryAction
          accessibilityLabel="Luego"
          disabled={isBusy}
          label="Luego"
          onPress={() => setInvitation(null)}
          style={styles.laterAction}
          variant="surface"
        />
        <ModalPrimaryAction
          accessibilityLabel="Aceptar invitación"
          disabled={isBusy}
          label={isBusy ? 'Aceptando…' : 'Aceptar'}
          onPress={() => void handleAccept()}
          style={styles.acceptAction}
          variant="cta"
        />
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    actions: { flexDirection: 'row', gap: spacing.sm },
    laterAction: { flex: 1 },
    acceptAction: { flex: 1 },
  });
}
