import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';

type SpaceCountryMismatchModalProps = {
  onClose: () => void;
  onOpenCountrySettings: () => void;
  visible: boolean;
};

/** Explica un rechazo remoto de país sin revelar datos de la otra persona. */
export function SpaceCountryMismatchModal({
  onClose,
  onOpenCountrySettings,
  visible,
}: SpaceCountryMismatchModalProps) {
  return (
    <AppModal
      onClose={onClose}
      testID="space-country-mismatch-modal"
      variant="compact"
      visible={visible}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" variant="heading">
          No pueden compartir este espacio todavía
        </Text>
        <Text tone="secondary" variant="body">
          Para compartir un espacio, ambos deben tener el mismo país
          configurado. Puedes revisar tu país en Ajustes &gt; País y moneda. La
          otra persona también debe comprobar el suyo antes de volver a
          intentarlo.
        </Text>
        <View style={styles.actions}>
          <ModalPrimaryAction
            accessibilityLabel="Entendido"
            label="Entendido"
            onPress={onClose}
            style={styles.action}
            variant="surface"
          />
          <ModalPrimaryAction
            accessibilityLabel="Ir a ajustes"
            label="Ir a ajustes"
            onPress={onOpenCountrySettings}
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
