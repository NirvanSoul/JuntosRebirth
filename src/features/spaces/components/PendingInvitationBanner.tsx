import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { SpaceCountryMismatchModal } from '@/features/spaces/components/SpaceCountryMismatchModal';
import {
  AcceptInvitationError,
  createJuntossInvitationGateway,
  type CurrentUserInvitation,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { useAppForeground } from '@/hooks/useAppForeground';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PendingInvitationBannerProps = {
  onAccepted: (acceptedSpaceId?: string) => Promise<void>;
  onOpenCountrySettings: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Popup modal centrado con fondo difuminado para invitaciones pendientes
 * dirigidas a la sesión activa en cualquier espacio.
 */
export function PendingInvitationBanner({
  onAccepted,
  onOpenCountrySettings,
  style,
}: PendingInvitationBannerProps) {
  const { isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { session } = useAuthSession();
  const [invitation, setInvitation] = useState<CurrentUserInvitation | null>(
    null,
  );
  const [isAccepting, setAccepting] = useState(false);
  const [isCancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCountryMismatchVisible, setCountryMismatchVisible] = useState(false);

  const isBusy = isAccepting || isCancelling;

  const refreshInvitation = useCallback(() => {
    if (!session) {
      setInvitation(null);
      return;
    }
    const gateway = createJuntossInvitationGateway();
    if (typeof gateway?.getCurrentUserPendingInvitation !== 'function') {
      setInvitation(null);
      return;
    }
    let isMounted = true;
    void gateway
      .getCurrentUserPendingInvitation()
      .then((next) => {
        if (isMounted) setInvitation(next);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [session]);

  // `refreshInvitation` se ejecuta al montar y en cada vuelta al primer plano.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => refreshInvitation(), [refreshInvitation]);
  useAppForeground(() => {
    refreshInvitation();
  });

  const handleAccept = async () => {
    if (!invitation || isBusy) return;
    setAccepting(true);
    setError(null);
    try {
      const result =
        await createJuntossInvitationGateway().acceptCurrentUserInvitation(
          invitation.invitationId,
        );
      await onAccepted(result.spaceId);
      setInvitation(null);
    } catch (caught) {
      if (
        caught instanceof AcceptInvitationError &&
        caught.code === 'space_country_mismatch'
      ) {
        setCountryMismatchVisible(true);
        return;
      }
      setError(
        caught instanceof AcceptInvitationError
          ? caught.message
          : 'No pudimos aceptar la invitación. Inténtalo de nuevo.',
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleCancel = async () => {
    if (!invitation || isBusy) return;
    setCancelling(true);
    setError(null);
    try {
      const gateway = createJuntossInvitationGateway();
      if (typeof gateway?.rejectCurrentUserInvitation === 'function') {
        await gateway.rejectCurrentUserInvitation(invitation.invitationId);
      }
      setInvitation(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos cancelar la invitación. Inténtalo de nuevo.',
      );
    } finally {
      setCancelling(false);
    }
  };

  if (!invitation) return null;

  const inviterName = invitation.inviterDisplayName.trim() || 'Alguien';

  return (
    <>
      <Modal
        animationType="fade"
        hardwareAccelerated
        onRequestClose={() => void handleCancel()}
        statusBarTranslucent
        testID="pending-invitation-modal"
        transparent
        visible={Boolean(invitation) && !isCountryMismatchVisible}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            blurReductionFactor={2}
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
            intensity={25}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint={isDark ? 'dark' : 'light'}
          />
          <View pointerEvents="none" style={styles.backdropShade} />

          <View
            accessible
            accessibilityRole="alert"
            style={[styles.card, style]}
            testID="pending-space-invitation"
          >
            <View style={styles.header}>
              <Ionicons
                color={styles.iconColor.color}
                name="people"
                size={28}
              />
              <Text
                accessibilityRole="header"
                style={styles.title}
                variant="heading"
                weight="bold"
              >
                {`${inviterName} te invitó a un espacio juntos`}
              </Text>
            </View>

            <View style={styles.checklist}>
              <View style={styles.checkItem}>
                <Ionicons
                  color={styles.checkIconColor.color}
                  name="checkmark-circle"
                  size={20}
                />
                <Text style={styles.checkText} variant="body">
                  Compartir gastos e ingresos en tiempo real
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.checkItem}>
                <Ionicons
                  color={styles.checkIconColor.color}
                  name="checkmark-circle"
                  size={20}
                />
                <Text style={styles.checkText} variant="body">
                  Ver balances y presupuestos conjuntos
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.checkItem}>
                <Ionicons
                  color={styles.checkIconColor.color}
                  name="checkmark-circle"
                  size={20}
                />
                <Text style={styles.checkText} variant="body">
                  Organizar categorías y finanzas en pareja
                </Text>
              </View>
            </View>

            {error ? (
              <Text tone="expense" variant="footnote">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <ModalPrimaryAction
                accessibilityLabel="Cancelar invitación"
                disabled={isBusy}
                label={isCancelling ? 'Cancelando…' : 'Cancelar'}
                onPress={() => void handleCancel()}
                style={styles.cancelAction}
                variant="surface"
              />
              <ModalPrimaryAction
                accessibilityLabel="Aceptar invitación"
                disabled={isBusy}
                label={isAccepting ? 'Aceptando…' : 'Aceptar'}
                onPress={() => void handleAccept()}
                style={styles.acceptAction}
                variant="cta"
              />
            </View>
          </View>
        </View>
      </Modal>

      <SpaceCountryMismatchModal
        onClose={() => setCountryMismatchVisible(false)}
        onOpenCountrySettings={onOpenCountrySettings}
        visible={isCountryMismatchVisible}
      />
    </>
  );
}

// Alias para claridad de componente
export const PendingInvitationModal = PendingInvitationBanner;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    backdropShade: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      gap: spacing.lg,
      padding: spacing.xl,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      ...shadows.subtle,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconColor: {
      color: colors.cta,
    },
    checkIconColor: {
      color: colors.cta,
    },
    title: {
      flex: 1,
      textAlign: 'left',
    },
    checklist: {
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    checkText: {
      flex: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    cancelAction: {
      flex: 1,
    },
    acceptAction: {
      flex: 1,
    },
  });
}
