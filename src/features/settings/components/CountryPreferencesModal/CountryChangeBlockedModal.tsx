import { StyleSheet, View } from 'react-native';

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
  return (
    <AppModal
      onClose={onClose}
      testID="country-change-blocked-modal"
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="heading">
          No puedes cambiar tu país todavía
        </Text>
        <Text tone="secondary" variant="body">
          Tu país debe coincidir con las personas de tus espacios compartidos.
          Sal del espacio compartido o coordina el cambio con la otra persona
          antes de intentarlo de nuevo.
        </Text>
        <ModalPrimaryAction
          accessibilityLabel="Entendido"
          label="Entendido"
          onPress={onClose}
          variant="cta"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.lg } });
