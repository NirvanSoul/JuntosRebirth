import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import type { ColumnMapping, ColumnRole } from '@/features/import/types';
import { spacing } from '@/theme/spacing';

type ColumnMappingSheetProps = {
  canConfirm: boolean;
  headers: readonly string[];
  mapping: ColumnMapping;
  onChangeRole: (columnIndex: number, role: ColumnRole) => void;
  onClose: () => void;
  onConfirm: () => void;
  visible: boolean;
};

const roleOptions: readonly { role: ColumnRole; label: string }[] = [
  { role: 'date', label: 'Fecha' },
  { role: 'description', label: 'Descripción' },
  { role: 'amount', label: 'Importe' },
  { role: 'debit', label: 'Gasto' },
  { role: 'credit', label: 'Ingreso' },
  { role: 'transactionType', label: 'Tipo (cargo/abono)' },
  { role: 'currency', label: 'Moneda' },
  { role: 'balance', label: 'Saldo' },
  { role: 'ignore', label: 'Ignorar' },
];

/**
 * Mapeo manual de columnas cuando la detección automática no tiene
 * suficiente confianza (Bible §13). El usuario asigna un rol a cada
 * encabezado; "Continuar" solo se habilita con fecha + una señal de importe
 * (importe firmado, o gasto y ganancia por separado).
 */
export function ColumnMappingSheet({
  canConfirm,
  headers,
  mapping,
  onChangeRole,
  onClose,
  onConfirm,
  visible,
}: ColumnMappingSheetProps) {
  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="column-mapping-sheet"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              ¿Dónde está cada dato?
            </Text>
            <Text tone="secondary" variant="label">
              Indica qué contiene cada columna de tu archivo.
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.columns}>
            {headers.map((header, columnIndex) => (
              <View key={`${header}-${columnIndex}`} style={styles.column}>
                <Text numberOfLines={1} variant="bodyStrong" weight="semibold">
                  {header || `Columna ${columnIndex + 1}`}
                </Text>
                <View style={styles.roles}>
                  {roleOptions.map(({ role, label }) => (
                    <SelectableOption
                      accessibilityLabel={`${header || `Columna ${columnIndex + 1}`}: ${label}`}
                      compact
                      key={role}
                      label={label}
                      onPress={() => onChangeRole(columnIndex, role)}
                      selected={mapping.get(columnIndex) === role}
                      style={styles.roleOption}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </BottomSheetScrollView>

        <ModalPrimaryAction
          accessibilityLabel="Continuar con este mapeo de columnas"
          disabled={!canConfirm}
          label="Continuar"
          mutedWhenDisabled
          onPress={onConfirm}
          testID="column-mapping-confirm"
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  columns: { gap: spacing.lg, paddingBottom: spacing.lg },
  column: { gap: spacing.sm },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleOption: { minWidth: 0 },
});
