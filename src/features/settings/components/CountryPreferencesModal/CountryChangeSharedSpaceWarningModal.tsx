import { StyleSheet, View } from 'react-native';

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
  return (
    <AppModal
      onClose={onCancel}
      testID="country-change-shared-space-warning-modal"
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="heading">
          Saldrás del espacio compartido
        </Text>
        <Text tone="secondary" variant="body">
          Al cambiar tu país a {countryName}, dejarás tu espacio compartido
          actual. Tus finanzas personales no se borrarán y la otra persona
          conservará el espacio.
        </Text>
        <View style={styles.actions}>
          <ModalPrimaryAction
            accessibilityLabel="Cancelar cambio de país"
            label="Cancelar"
            onPress={onCancel}
            style={styles.action}
            variant="surface"
          />
          <ModalPrimaryAction
            accessibilityLabel="Cambiar país"
            label="Cambiar país"
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
