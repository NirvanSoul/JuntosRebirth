import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import type { TransactionTypeFilter } from '@/features/activity/components/TransactionFiltersModal';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';

type TypeOption = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: TransactionTypeFilter;
};

// Mismos iconos que las insignias de resumen: flechas blancas sobre el color
// de cada tipo, y el balance en color de acción para «Todos».
const typeOptions: readonly TypeOption[] = [
  { value: 'all', label: 'Todos', icon: 'swap-vertical-outline' },
  { value: 'expense', label: 'Gastos', icon: 'arrow-down' },
  { value: 'income', label: 'Ingresos', icon: 'arrow-up' },
];

function resolveIconBackground(
  value: TransactionTypeFilter,
  colors: ColorTokens,
): string {
  switch (value) {
    case 'all':
      return colors.cta;
    case 'expense':
      return colors.expenseSoft;
    case 'income':
      return colors.incomeSoft;
  }
}

type TransactionTypeFilterOptionsProps = {
  onSelect: (value: TransactionTypeFilter) => void;
  selected: TransactionTypeFilter;
};

/** Opciones del filtro «Tipo de movimiento», cada una con su icono. */
export function TransactionTypeFilterOptions({
  onSelect,
  selected,
}: TransactionTypeFilterOptionsProps) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={styles.options}>
      {typeOptions.map((option) => (
        <SelectableOption
          accessibilityLabel={`Tipo: ${option.label}`}
          indicatorTestID={`type-filter-${option.value}-indicator`}
          indicator={false}
          key={option.value}
          label={option.label}
          leading={
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: resolveIconBackground(option.value, colors),
                },
              ]}
              testID={`type-filter-${option.value}-icon`}
            >
              <Ionicons
                color={colors.onBrand}
                name={option.icon}
                size={iconSize.xs}
                style={styles.diagonalArrow}
              />
            </View>
          }
          onPress={() => onSelect(option.value)}
          selected={selected === option.value}
          selectedTone={option.value === 'all' ? 'cta' : option.value}
          style={styles.option}
          testID={`type-filter-${option.value}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    flexShrink: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  icon: {
    width: iconSize.md,
    height: iconSize.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  diagonalArrow: {
    transform: [{ rotate: '45deg' }],
  },
});
