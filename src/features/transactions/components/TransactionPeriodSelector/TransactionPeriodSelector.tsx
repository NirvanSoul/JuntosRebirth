import { type ReactNode, useState } from 'react';
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import Animated, { FadeOutUp, ReduceMotion } from 'react-native-reanimated';

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
import { getDisclosureEntering } from '@/theme/transitions';

type TransactionPeriodSelectorProps = {
  /**
   * Oculta las opciones hasta pulsar el periodo central; se despliegan de arriba
   * abajo y se pliegan al elegir una.
   */
  collapsible?: boolean;
  includeAllOption?: boolean;
  includeCustomOption?: boolean;
  customLabel?: string;
  customSelected?: boolean;
  /** Bloquea avanzar, p. ej. hacia periodos futuros. */
  nextDisabled?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSelectAll?: () => void;
  onSelectCustom?: () => void;
  onSelectPeriod: (period: TransactionPeriod) => void;
  /** Estilo de las opciones desplegadas, p. ej. para separarlas de lo que sigue. */
  optionsStyle?: StyleProp<ViewStyle>;
  period: TransactionPeriod | null;
  selectedDate: Date;
  /** Ubica las opciones en una única fila horizontal desplazable. */
  singleRow?: boolean;
  testID?: string;
};

export function TransactionPeriodSelector({
  collapsible = false,
  includeAllOption = false,
  includeCustomOption = false,
  customLabel,
  customSelected = false,
  nextDisabled,
  onNext,
  onPrevious,
  onSelectAll,
  onSelectCustom,
  onSelectPeriod,
  optionsStyle,
  period,
  selectedDate,
  singleRow = false,
  testID,
}: TransactionPeriodSelectorProps) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const gutter = layout.screenGutter[density];
  const displayedPeriod = period ?? 'month';
  const allSelected = includeAllOption && period === null && !customSelected;
  const [optionsVisible, setOptionsVisible] = useState(!collapsible);
  const select = (action: (() => void) | undefined) => () => {
    action?.();
    if (collapsible) setOptionsVisible(false);
  };
  const renderOptions = (options: ReactNode) =>
    collapsible ? (
      optionsVisible ? (
        <Animated.View
          entering={getDisclosureEntering()}
          exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
          style={optionsStyle}
        >
          {options}
        </Animated.View>
      ) : null
    ) : (
      options
    );

  return (
    <View testID={testID}>
      <MonthNavigator
        label={
          customSelected && customLabel
            ? customLabel
            : allSelected
              ? 'Desde el inicio'
              : formatTransactionPeriod(displayedPeriod, selectedDate)
        }
        labelAccessibilityHint={
          collapsible
            ? `${optionsVisible ? 'Oculta' : 'Muestra'} los periodos disponibles`
            : undefined
        }
        labelExpanded={collapsible ? optionsVisible : undefined}
        onLabelPress={
          collapsible
            ? () => setOptionsVisible((visible) => !visible)
            : undefined
        }
        nextAccessibilityLabel="Ver periodo siguiente"
        nextDisabled={nextDisabled}
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
          style={[styles.optionsScroll, { width, marginLeft: -gutter }]}
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
                indicator={false}
                key={option.value}
                label={option.label}
                onPress={() => onSelectPeriod(option.value)}
                selected={selected}
                testID={testID ? `${testID}-${option.value}` : undefined}
              />
            );
          })}
        </ScrollView>
      ) : (
        renderOptions(
          <ScrollView
            accessibilityRole="radiogroup"
            contentContainerStyle={[
              styles.periods,
              { paddingHorizontal: gutter },
            ]}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.optionsScroll, { width, marginLeft: -gutter }]}
            testID={testID ? `${testID}-options-scroll` : undefined}
          >
            {includeAllOption ? (
              <SelectableOption
                accessibilityLabel="Periodo: Todos"
                indicatorTestID={testID ? `${testID}-all-indicator` : undefined}
                indicator={false}
                label="Todos"
                onPress={select(onSelectAll)}
                selected={allSelected}
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
                  indicator={false}
                  key={option.value}
                  label={option.label}
                  onPress={select(() => onSelectPeriod(option.value))}
                  selected={selected}
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
                indicator={false}
                label="Personalizada"
                onPress={select(onSelectCustom)}
                selected={customSelected}
                testID={testID ? `${testID}-custom` : undefined}
              />
            ) : null}
          </ScrollView>,
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: { marginBottom: spacing.md },
  periods: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs + spacing.xxs,
    overflow: 'visible',
  },
  periodsSingleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.xs + spacing.xxs,
    overflow: 'visible',
    paddingVertical: spacing.sm,
  },
  optionsScroll: { overflow: 'visible' },
});
