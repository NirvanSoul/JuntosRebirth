import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';

type CountryChangeBlockedModalProps = {
  onClose: () => void;
  visible: boolean;
};

/** El país no puede divergir de los miembros de un espacio ya compartido. */
export function CountryChangeBlockedModal({
  onClose,
  visible,
}: CountryChangeBlockedModalProps) {
  const { t } = useTranslation();

  return (
    <AppModal
      onClose={onClose}
      testID="country-change-blocked-modal"
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="heading">
          {t('settings.countryBlocked.title')}
        </Text>
        <Text tone="secondary" variant="body">
          {t('settings.countryBlocked.message')}
        </Text>
        <ModalPrimaryAction
          accessibilityLabel={t('common.understood')}
          label={t('common.understood')}
          onPress={onClose}
          variant="cta"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.lg } });
