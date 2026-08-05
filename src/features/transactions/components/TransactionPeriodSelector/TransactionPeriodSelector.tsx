import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { MonthNavigator } from '@/components/ui/MonthNavigator/MonthNavigator';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import {
  formatTransactionPeriod,
  type TransactionPeriod,
  transactionPeriodOptions,
} from '@/features/dashboard/utils/transactionPeriod';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

type TransactionPeriodSelectorProps = {
  includeAllOption?: boolean;
  includeCustomOption?: boolean;
  customLabel?: string;
  customSelected?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSelectAll?: () => void;
  onSelectCustom?: () => void;
  onSelectPeriod: (period: TransactionPeriod) => void;
  period: TransactionPeriod | null;
  selectedDate: Date;
  /** Ubica las opciones en una sola fila, reduciendo su tamaño para caber sin scroll. */
  singleRow?: boolean;
  testID?: string;
};

export function TransactionPeriodSelector({
  includeAllOption = false,
  includeCustomOption = false,
  customLabel,
  customSelected = false,
  onNext,
  onPrevious,
  onSelectAll,
  onSelectCustom,
  onSelectPeriod,
  period,
  selectedDate,
  singleRow = false,
  testID,
}: TransactionPeriodSelectorProps) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const gutter = layout.screenGutter[density];
  const displayedPeriod = period ?? 'month';

  return (
    <View testID={testID}>
      <MonthNavigator
        label={
          customSelected && customLabel
            ? customLabel
            : formatTransactionPeriod(displayedPeriod, selectedDate)
        }
        nextAccessibilityLabel="Ver periodo siguiente"
        onNext={onNext}
        onPrevious={onPrevious}
        previousAccessibilityLabel="Ver periodo anterior"
        style={styles.navigator}
      />

      {singleRow ? (
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={[
            styles.periodsSingleRow,
            { paddingHorizontal: gutter },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width, marginLeft: -gutter, overflow: 'visible' }}
          testID={testID ? `${testID}-options-scroll` : undefined}
        >
          {transactionPeriodOptions.map((option) => {
            const selected = option.value === period;

            return (
              <SelectableOption
                accessibilityLabel={`Periodo: ${option.label}`}
                compact
                indicatorTestID={
                  testID ? `${testID}-${option.value}-indicator` : undefined
                }
                key={option.value}
                label={option.label}
                onPress={() => onSelectPeriod(option.value)}
                selected={selected}
                style={[
                  styles.periodSingleRow,
                  option.value === 'year' && styles.periodSingleRowCompact,
                ]}
                testID={testID ? `${testID}-${option.value}` : undefined}
              />
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={[
            styles.periods,
            { paddingHorizontal: gutter },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width, marginLeft: -gutter }}
          testID={testID ? `${testID}-options-scroll` : undefined}
        >
          {includeAllOption ? (
            <SelectableOption
              accessibilityLabel="Periodo: Todos"
              indicatorTestID={testID ? `${testID}-all-indicator` : undefined}
              label="Todos"
              onPress={() => onSelectAll?.()}
              selected={period === null && !customSelected}
              style={styles.period}
              testID={testID ? `${testID}-all` : undefined}
            />
          ) : null}
          {transactionPeriodOptions.map((option) => {
            const selected = option.value === period;

            return (
              <SelectableOption
                accessibilityLabel={`Periodo: ${option.label}`}
                indicatorTestID={
                  testID ? `${testID}-${option.value}-indicator` : undefined
                }
                key={option.value}
                label={option.label}
                onPress={() => onSelectPeriod(option.value)}
                selected={selected}
                style={[
                  styles.period,
                  option.value === 'year' && styles.periodCompact,
                ]}
                testID={testID ? `${testID}-${option.value}` : undefined}
              />
            );
          })}
          {includeCustomOption ? (
            <SelectableOption
              accessibilityLabel="Periodo: Personalizada"
              indicatorTestID={
                testID ? `${testID}-custom-indicator` : undefined
              }
              label="Personalizada"
              onPress={() => onSelectCustom?.()}
              selected={customSelected}
              style={styles.period}
              testID={testID ? `${testID}-custom` : undefined}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: { marginBottom: spacing.md },
  periods: {
    height: 116,
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  period: {
    minWidth: 168,
  },
  periodCompact: {
    minWidth: 128,
  },
  periodsSingleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs,
    overflow: 'visible',
    paddingVertical: spacing.sm,
  },
  periodSingleRow: {
    minWidth: 108,
  },
  periodSingleRowCompact: {
    minWidth: 84,
  },
});
