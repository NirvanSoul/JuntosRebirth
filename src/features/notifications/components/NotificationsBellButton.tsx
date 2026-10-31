import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { NotificationsModal } from '@/features/notifications/components/NotificationsModal';
import { useUpcomingNotices } from '@/features/notifications/hooks/useUpcomingNotices';
import type { Category } from '@/features/categories/types';
import type { Space } from '@/features/spaces/types';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  getSpaceLabel,
  sortSpacesForMenu,
} from '@/features/spaces/utils/spaceMenuLabels';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type NotificationsBellButtonProps = {
  activeSpaceId: string;
  /** Categorías de todos los espacios, para pintar los avisos. */
  categories: readonly Category[];
  /** Abre el detalle de un movimiento del espacio activo. */
  onOpenTransaction: (transactionId: string) => void;
  onSelectSpace: (spaceId: string) => Promise<void>;
  spaces: readonly Space[];
  /** Movimientos de todos los espacios: los avisos no dependen del activo. */
  transactions: readonly SessionTransaction[];
};

const notificationDotSize = 10;

/**
 * Campana flotante de la esquina superior derecha: abre los avisos de
 * movimientos próximos y lleva un punto mientras haya avisos sin ver.
 */
export function NotificationsBellButton({
  activeSpaceId,
  categories,
  onOpenTransaction,
  onSelectSpace,
  spaces,
  transactions,
}: NotificationsBellButtonProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const upcomingNotices = useUpcomingNotices(transactions, categories);
  const [isVisible, setVisible] = useState(false);
  const spaceLabels = useMemo(
    () =>
      new Map(
        sortSpacesForMenu(spaces).map((space) => [
          space.id,
          getSpaceLabel(space),
        ]),
      ),
    [spaces],
  );

  return (
    <>
      <Pressable
        accessibilityHint="Abre tus avisos de gastos e ingresos próximos"
        accessibilityLabel="Notificaciones"
        accessibilityRole="button"
        onPress={() => {
          upcomingNotices.markAllSeen();
          setVisible(true);
        }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID="notifications-bell-button"
      >
        <Ionicons
          color={upcomingNotices.hasUnseen ? colors.cta : colors.textPrimary}
          name="notifications"
          testID="notifications-bell-icon"
          size={iconSize.sm}
        />
        {upcomingNotices.hasUnseen ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.notificationDot}
            testID="notifications-bell-dot"
          />
        ) : null}
      </Pressable>
      <NotificationsModal
        coupleSpace={spaces.find((space) => space.type === 'couple') ?? null}
        notices={upcomingNotices.notices}
        onClose={() => setVisible(false)}
        onOpenNotice={({ transaction }) => {
          // El detalle solo resuelve movimientos del espacio activo.
          Promise.resolve(
            transaction.spaceId === activeSpaceId
              ? undefined
              : onSelectSpace(transaction.spaceId),
          )
            .then(() => onOpenTransaction(transaction.id))
            .catch(() =>
              Alert.alert(
                'No pudimos abrir el movimiento. Inténtalo de nuevo.',
              ),
            );
        }}
        spaceLabels={spaceLabels}
        visible={isVisible}
      />
    </>
  );
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    button: {
      ...shadows.raised,
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
    },
    pressed: {
      opacity: 0.72,
    },
    // Sobre el borde del círculo, a 45° desde el centro.
    notificationDot: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: notificationDotSize,
      height: notificationDotSize,
      borderRadius: radii.round,
      backgroundColor: colors.cta,
    },
  });
}
