import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen/Screen';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import {
  createSupabaseInvitationGateway,
  type OutgoingInvitation,
} from '@/features/spaces/gateways/supabaseInvitationGateway';
import type { Space } from '@/features/spaces/types';
import { useAppForeground } from '@/hooks/useAppForeground';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

type AwaitingPartnerScreenProps = {
  onCancelSpace: () => Promise<void>;
  onChangeInvitation: () => void;
  onRefresh: () => Promise<void>;
  space: Space;
};

/** "Caduca en 5 días" es más legible de un vistazo que una fecha completa. */
function describeExpiry(expiresAt: string): string | null {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return null;

  const days = Math.ceil(remainingMs / millisecondsPerDay);
  return days <= 1 ? 'Caduca hoy' : `Caduca en ${days} días`;
}

/**
 * Inicio de un espacio juntos cuya invitación sigue pendiente. Un espacio de
 * una sola persona no admite movimientos (`spaces.activated_at is null` en el
 * servidor), así que en lugar del balance y las listas se explica el único
 * paso que falta: que la otra persona abra su app y acepte.
 */
export function AwaitingPartnerScreen({
  onCancelSpace,
  onChangeInvitation,
  onRefresh,
  space,
}: AwaitingPartnerScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [invitation, setInvitation] = useState<OutgoingInvitation | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);

  const loadInvitation = useCallback(() => {
    let isMounted = true;
    void createSupabaseInvitationGateway()
      .getOutgoingInvitation(space.id)
      .then((next) => {
        if (isMounted) setInvitation(next);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [space.id]);

  useEffect(() => loadInvitation(), [loadInvitation]);

  // Quien invita suele volver a la app justo después de avisar a la otra
  // persona: al primer plano se comprueba si ya aceptó, sin tocar nada.
  useAppForeground(() => {
    loadInvitation();
    void onRefresh();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      loadInvitation();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar espacio juntos',
      `Se descartará "${space.name}" y la invitación dejará de ser válida. Podrás crear otro cuando quieras.`,
      [
        { style: 'cancel', text: 'Volver' },
        {
          style: 'destructive',
          text: 'Cancelar espacio',
          onPress: () => void onCancelSpace(),
        },
      ],
    );
  };

  const expiryNotice = invitation ? describeExpiry(invitation.expiresAt) : null;

  return (
    <Screen testID="awaiting-partner-screen">
      <View style={styles.panel}>
        <Image
          accessible={false}
          resizeMode="contain"
          source={require('../../../../assets/Onboarding/Waiting.png')}
          style={styles.waitingIllustration}
          testID="awaiting-partner-illustration"
        />

        <View style={styles.copy}>
          <Text align="center" accessibilityRole="header" variant="heading">
            Falta que acepten
          </Text>
          <Text align="center" tone="secondary" variant="body">
            {invitation?.inviteeEmail
              ? `Pídele a ${invitation.inviteeEmail} que abra su app de Juntos: en Inicio le espera un aviso para unirse a “${space.name}”.`
              : `Pídele a la persona que invitaste que abra su app de Juntos: en Inicio le espera un aviso para unirse a “${space.name}”.`}
          </Text>
        </View>

        <View style={styles.statusCard} testID="awaiting-partner-status">
          <View style={styles.statusIcon}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.textSecondary}
              importantForAccessibility="no-hide-descendants"
              name="time-outline"
              size={iconSize.sm}
            />
          </View>
          <View style={styles.statusText}>
            <Text variant="label" weight="semibold">
              Invitación enviada
            </Text>
            <Text tone="secondary" variant="footnote">
              {expiryNotice ??
                'Aquí verás tus movimientos compartidos en cuanto acepten.'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <ModalPrimaryAction
            accessibilityLabel="Comprobar si ya aceptaron la invitación"
            disabled={isRefreshing}
            label={isRefreshing ? 'Comprobando…' : 'Ya aceptó, comprobar'}
            onPress={() => void handleRefresh()}
            testID="awaiting-partner-refresh"
            variant="cta"
          />
          <ModalPrimaryAction
            accessibilityLabel="Cambiar o reenviar la invitación"
            label="Cambiar invitación"
            onPress={onChangeInvitation}
            testID="awaiting-partner-change"
            variant="surface"
          />
          <Pressable
            accessibilityLabel="Cancelar espacio juntos"
            accessibilityRole="button"
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed ? styles.cancelButtonPressed : null,
            ]}
            testID="awaiting-partner-cancel"
          >
            <Text tone="secondary" variant="footnote" weight="semibold">
              Cancelar espacio juntos
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    waitingIllustration: {
      alignSelf: 'center',
      borderRadius: radii.lg,
      height: 192,
      width: 128,
    },
    copy: { gap: spacing.sm },
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.lg,
    },
    statusIcon: {
      width: iconSize.xl,
      height: iconSize.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surfaceMuted,
    },
    statusText: { flex: 1, gap: spacing.xxs },
    actions: { gap: spacing.md },
    cancelButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonPressed: { opacity: 0.64 },
  });
}
