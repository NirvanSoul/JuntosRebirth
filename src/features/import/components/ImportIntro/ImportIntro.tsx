import { StyleSheet, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type ImportIntroProps = {
  hasSavedBatches: boolean;
  onPickFile: () => void;
  onViewSavedBatches: () => void;
};

/** Paso inicial del importador: qué ocurre con el archivo y qué formatos lee. */
export function ImportIntro({
  hasSavedBatches,
  onPickFile,
  onViewSavedBatches,
}: ImportIntroProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} testID="import-intro">
      <View style={styles.text}>
        <Text variant="body">
          Sube tu extracto bancario y revisa los movimientos antes de
          guardarlos.
        </Text>
        <Text tone="secondary" variant="label">
          Formatos: Excel (.xlsx, .xls) y CSV
        </Text>
      </View>
      <ModalPrimaryAction
        accessibilityLabel="Elegir un archivo bancario"
        icon="folder-open-outline"
        iconColor={colors.onBrand}
        label="Elegir archivo"
        onPress={onPickFile}
        testID="import-select-file"
      />
      {hasSavedBatches ? (
        <ModalPrimaryAction
          accessibilityLabel="Ver revisiones de importación guardadas"
          label="Ver revisiones guardadas"
          onPress={onViewSavedBatches}
          variant="surface"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, marginTop: spacing.md },
  text: { gap: spacing.sm },
});
