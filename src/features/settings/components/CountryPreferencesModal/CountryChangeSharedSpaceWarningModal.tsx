import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';

type CountryChangeSharedSpaceWarningModalProps = {
  countryName: string;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

/** Confirma la salida remota antes de cambiar el contexto financiero. */
export function CountryChangeSharedSpaceWarningModal({
  countryName,
  onCancel,
  onConfirm,
  visible,
}: CountryChangeSharedSpaceWarningModalProps) {
  const { t } = useTranslation();

  return (
    <AppModal
      onClose={onCancel}
      testID="country-change-shared-space-warning-modal"
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="heading">
          {t('settings.countryWarning.title')}
        </Text>
        <Text tone="secondary" variant="body">
          {t('settings.countryWarning.message', { country: countryName })}
        </Text>
        <View style={styles.actions}>
          <ModalPrimaryAction
            accessibilityLabel={t('settings.countryWarning.cancelLabel')}
            label={t('common.cancel')}
            onPress={onCancel}
            style={styles.action}
            variant="surface"
          />
          <ModalPrimaryAction
            accessibilityLabel={t('settings.countryWarning.confirm')}
            label={t('settings.countryWarning.confirm')}
            onPress={onConfirm}
            style={styles.action}
            variant="cta"
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
