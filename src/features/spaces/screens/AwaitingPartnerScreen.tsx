import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen/Screen';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { HomeEntrance } from '@/features/dashboard/components/HomeEntrance';
import {
  createJuntossInvitationGateway,
  type OutgoingInvitation,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import type { Space } from '@/features/spaces/types';
import { useAppForeground } from '@/hooks/useAppForeground';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

const ellipsisDotCounts = [1, 2, 3, 0] as const;
const ellipsisFrameDuration = 400;
const waitingTitle = 'Invitación enviada, falta que acepten';

export function getAnimatedWaitingTitle(frame: number) {
  const dotCount = ellipsisDotCounts[frame % ellipsisDotCounts.length] ?? 1;
  return `${waitingTitle}${'.'.repeat(dotCount)}`;
}

type AwaitingPartnerScreenProps = {
  onCancelInvitation: () => Promise<void>;
  onChangeInvitation: () => void;
  onRefresh: () => Promise<void>;
  space: Space;
};

/**
 * Inicio de un espacio juntos cuya invitación sigue pendiente. Un espacio de
 * una sola persona no admite movimientos (`spaces.activated_at is null` en el
 * servidor), así que en lugar del balance y las listas se explica el único
 * paso que falta: que la otra persona abra su app y acepte.
 */
export function AwaitingPartnerScreen({
  onCancelInvitation,
  onChangeInvitation,
  onRefresh,
  space,
}: AwaitingPartnerScreenProps) {
  const styles = useThemedStyles(createStyles);
  const [invitation, setInvitation] = useState<OutgoingInvitation | null>(null);
  const [ellipsisFrame, setEllipsisFrame] = useState(0);
  const [isRefreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setEllipsisFrame((current) => (current + 1) % ellipsisDotCounts.length);
    }, ellipsisFrameDuration);
    return () => clearInterval(intervalId);
  }, []);

  const loadInvitation = useCallback(() => {
    let isMounted = true;
    void createJuntossInvitationGateway()
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

  const confirmInvitationCancellation = async () => {
    try {
      await onCancelInvitation();
    } catch {
      // El contenedor ya muestra el error de la operación remota.
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar invitación',
      `La invitación a “${space.name}” dejará de ser válida. Podrás enviar otra cuando quieras.`,
      [
        { style: 'cancel', text: 'Volver' },
        {
          style: 'destructive',
          text: 'Cancelar invitación',
          onPress: () => void confirmInvitationCancellation(),
        },
      ],
    );
  };

  const animatedTitle = getAnimatedWaitingTitle(ellipsisFrame);

  return (
    <Screen testID="awaiting-partner-screen">
      <View style={styles.panel}>
        <View style={styles.waitingMessage}>
          <HomeEntrance>
            <Image
              accessible={false}
              resizeMode="contain"
              source={require('../../../../assets/Onboarding/Waiting.png')}
              style={styles.waitingIllustration}
              testID="awaiting-partner-illustration"
            />

            <View style={styles.copy}>
              <Text
                align="center"
                accessibilityLabel={`${waitingTitle}...`}
                accessibilityRole="header"
                testID="awaiting-partner-title"
                variant="heading"
              >
                {animatedTitle}
              </Text>
              <Text align="center" tone="secondary" variant="body">
                {invitation?.inviteeEmail
                  ? `Pídele a ${invitation.inviteeEmail} que abra su app de Juntos: en Inicio le espera un aviso para unirse a “${space.name}”.`
                  : `Pídele a la persona que invitaste que abra su app de Juntos: en Inicio le espera un aviso para unirse a “${space.name}”.`}
              </Text>
            </View>
          </HomeEntrance>
        </View>

        <View style={styles.actions}>
          <HomeEntrance startIndex={2}>
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
              accessibilityLabel="Cancelar invitación"
              accessibilityRole="button"
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed ? styles.cancelButtonPressed : null,
              ]}
              testID="awaiting-partner-cancel"
            >
              <Text tone="secondary" variant="footnote" weight="semibold">
                Cancelar invitación
              </Text>
            </Pressable>
          </HomeEntrance>
        </View>
      </View>
    </Screen>
  );
}

function createStyles() {
  return StyleSheet.create({
    panel: {
      flex: 1,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    waitingMessage: { gap: spacing.sm },
    waitingIllustration: {
      alignSelf: 'center',
      borderRadius: radii.lg,
      height: 216,
      width: 144,
    },
    copy: { gap: spacing.sm },
    actions: { gap: spacing.md },
    cancelButton: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonPressed: { opacity: 0.64 },
  });
}
