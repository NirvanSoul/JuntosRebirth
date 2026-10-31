import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import type { RecurrenceFilter } from '@/features/activity/components/TransactionFiltersModal';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

const recurrenceOptions: readonly {
  label: string;
  value: RecurrenceFilter;
}[] = [
  { value: 'all', label: 'Todas' },
  { value: 'once', label: 'Único' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizada' },
];

type TransactionRecurrenceFilterOptionsProps = {
  onSelect: (value: RecurrenceFilter) => void;
  selected: RecurrenceFilter;
};

/** Opciones del filtro «Recurrencia» en una fila que desborda el margen. */
export function TransactionRecurrenceFilterOptions({
  onSelect,
  selected,
}: TransactionRecurrenceFilterOptionsProps) {
  const { width } = useWindowDimensions();
  const gutter = layout.screenGutter[useLayoutDensity()];

  return (
    <ScrollView
      accessibilityRole="radiogroup"
      contentContainerStyle={[styles.singleRow, { paddingHorizontal: gutter }]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ width, marginLeft: -gutter, overflow: 'visible' }}
      testID="recurrence-filter-scroll"
    >
      {recurrenceOptions.map((option) => (
        <SelectableOption
          accessibilityLabel={`Recurrencia: ${option.label}`}
          indicatorTestID={`recurrence-filter-${option.value}-indicator`}
          indicator={false}
          key={option.value}
          label={option.label}
          onPress={() => onSelect(option.value)}
          selected={selected === option.value}
          testID={`recurrence-filter-${option.value}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
  },
});
