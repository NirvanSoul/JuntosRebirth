import { useState } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import {
  formatTransactionDateRangeDate,
  TransactionDateRangePickerModal,
} from '@/features/activity/components/TransactionDateRangePickerModal';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import { shiftTransactionPeriod } from '@/features/dashboard/utils/transactionPeriod';
import { TransactionPeriodSelector } from '@/features/transactions/components/TransactionPeriodSelector/TransactionPeriodSelector';

type CategoryDetailPeriodFilterProps = {
  filter: TransactionDateFilter;
  onChange: (filter: TransactionDateFilter) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Periodo del detalle de categoría sobre los totales. Al pulsar el periodo se
 * despliegan las opciones: todo el historial, una semana, quincena, mes o año navegables, o un rango
 * personalizado. Reutiliza el selector y el calendario de rango de Actividad.
 */
export function CategoryDetailPeriodFilter({
  filter,
  onChange,
  style,
  testID = 'category-detail-period-selector',
}: CategoryDetailPeriodFilterProps) {
  const [isRangePickerVisible, setRangePickerVisible] = useState(false);
  const customRange =
    filter !== 'all' && filter.period === 'custom' ? filter : undefined;
  const periodFilter =
    filter !== 'all' && filter.period !== 'custom' ? filter : null;
  const anchor = periodFilter?.selectedDate ?? new Date();

  const shiftPeriod = (offset: -1 | 1) => {
    if (customRange) {
      setRangePickerVisible(true);
      return;
    }
    const period = periodFilter?.period ?? 'month';
    onChange({
      period,
      selectedDate: shiftTransactionPeriod(period, anchor, offset),
    });
  };

  return (
    <View style={style}>
      <TransactionPeriodSelector
        customLabel={
          customRange
            ? `${formatTransactionDateRangeDate(customRange.startDate)} — ${formatTransactionDateRangeDate(customRange.endDate)}`
            : undefined
        }
        collapsible
        customSelected={Boolean(customRange)}
        includeAllOption
        includeCustomOption
        onNext={() => shiftPeriod(1)}
        onPrevious={() => shiftPeriod(-1)}
        onSelectAll={() => onChange('all')}
        onSelectCustom={() => setRangePickerVisible(true)}
        onSelectPeriod={(period) => onChange({ period, selectedDate: anchor })}
        period={periodFilter?.period ?? null}
        selectedDate={anchor}
        testID={testID}
      />
      <TransactionDateRangePickerModal
        initialRange={customRange}
        onClose={() => setRangePickerVisible(false)}
        onSelect={(range) => {
          onChange({ ...range, period: 'custom' });
          setRangePickerVisible(false);
        }}
        visible={isRangePickerVisible}
      />
    </View>
  );
}
