import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Linking, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  SettingsRow,
  SettingsSection,
} from '@/components/layout/SettingsList/SettingsList';
import { Text } from '@/components/ui/Text/Text';
import { categoryColors } from '@/theme/categoryColors';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PermissionsScreenProps = {
  onClose: () => void;
  visible: boolean;
};

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export function PermissionsScreen({
  onClose,
  visible,
}: PermissionsScreenProps) {
  const styles = useThemedStyles((colors) =>
    StyleSheet.create({
      container: { flex: 1, gap: spacing.lg },
      header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
      },
      headerText: { flex: 1, gap: spacing.xs },
      body: { gap: spacing.md },
      settingsButton: { marginTop: spacing.sm },
    }),
  );
  const [status, setStatus] = useState<NotificationPermissionStatus | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    void Notifications.getPermissionsAsync().then((result) => {
      if (cancelled) return;
      setStatus(
        result.granted
          ? 'granted'
          : result.canAskAgain
            ? 'undetermined'
            : 'denied',
      );
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const statusLabel =
    status === 'granted'
      ? 'Concedido'
      : status === 'denied'
        ? 'No concedido'
        : status === 'undetermined'
          ? 'No solicitado todavía'
          : undefined;

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="permissions-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Permisos de la aplicación
            </Text>
            <Text tone="secondary" variant="label">
              Juntos solo solicita los permisos que necesita para las funciones
              que activas.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View style={styles.body}>
          <SettingsSection icon="notifications-outline" title="Notificaciones">
            <SettingsRow
              icon="alarm-outline"
              iconBackgroundColor={categoryColors.pink}
              label="Recordatorios de movimientos"
              value={statusLabel}
            />
          </SettingsSection>
          <Text tone="secondary" variant="footnote">
            Las usamos únicamente para los recordatorios de gastos e ingresos
            que tú activas en Ajustes → Notificaciones. Juntos no solicita
            acceso a cámara, fotos, contactos ni ubicación porque no los
            necesita.
          </Text>

          {status === 'denied' ? (
            <ModalPrimaryAction
              accessibilityLabel="Abrir los ajustes del sistema"
              label="Abrir ajustes del sistema"
              onPress={() => {
                void Linking.openSettings();
              }}
              style={styles.settingsButton}
              variant="surface"
            />
          ) : null}
        </View>
      </View>
    </AppModal>
  );
}
