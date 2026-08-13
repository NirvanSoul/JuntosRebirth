import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import {
  SettingsSection,
  SettingsToggleRow,
} from '@/components/layout/SettingsList/SettingsList';
import { Text } from '@/components/ui/Text/Text';
import {
  getShowAmountsInNotifications,
  setShowAmountsInNotifications,
} from '@/features/transactions/repositories/notificationPrivacyPreferenceRepository';
import { categoryColors } from '@/theme/categoryColors';
import { spacing } from '@/theme/spacing';
import { useThemedStyles } from '@/theme/useThemedStyles';

type PrivacyChoicesScreenProps = {
  onClose: () => void;
  visible: boolean;
};

export function PrivacyChoicesScreen({
  onClose,
  visible,
}: PrivacyChoicesScreenProps) {
  const styles = useThemedStyles(() =>
    StyleSheet.create({
      container: { flex: 1, gap: spacing.lg },
      header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
      },
      headerText: { flex: 1, gap: spacing.xs },
      body: { gap: spacing.md },
    }),
  );
  const [showAmounts, setShowAmounts] = useState(true);

  useEffect(() => {
    if (!visible) return;
    void getShowAmountsInNotifications().then(setShowAmounts);
  }, [visible]);

  const handleToggle = (next: boolean) => {
    setShowAmounts(next);
    void setShowAmountsInNotifications(next);
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="privacy-choices-screen"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              Preferencias de privacidad
            </Text>
            <Text tone="secondary" variant="label">
              Revisa o cambia tus decisiones de privacidad.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View style={styles.body}>
          <SettingsSection icon="notifications-outline" title="Notificaciones">
            <SettingsToggleRow
              description="Si lo desactivas, verás un aviso genérico en la pantalla bloqueada"
              enabled={showAmounts}
              icon="cash-outline"
              iconBackgroundColor={categoryColors.green}
              label="Mostrar importes en notificaciones"
              onToggle={handleToggle}
              testID="show-amounts-in-notifications-toggle"
            />
          </SettingsSection>
          <Text tone="secondary" variant="footnote">
            Juntos no muestra anuncios todavía. Cuando incorporemos publicidad,
            las preferencias de anuncios personalizados aparecerán aquí.
          </Text>
        </View>
      </View>
    </AppModal>
  );
}
