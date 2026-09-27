import { StyleSheet, View } from 'react-native';

import { MonthNavigator } from '@/components/ui/MonthNavigator/MonthNavigator';
import { getMonthLabelParts } from '@/features/map/model/calendarPeriods';
import { minimumCalendarDate } from '@/lib/date/monthDistance';
import { spacing } from '@/theme/spacing';

type MapCalendarHeaderProps = {
  focusedMonth: string;
  gutter: number;
  onChangeMonth: (offset: -1 | 1) => void;
  rangeEndDate: string;
};

export function MapCalendarHeader({
  focusedMonth,
  gutter,
  onChangeMonth,
  rangeEndDate,
}: MapCalendarHeaderProps) {
  const monthLabel = getMonthLabelParts(focusedMonth);

  return (
    <View
      style={[styles.container, { paddingHorizontal: gutter }]}
      testID="map-header"
    >
      <MonthNavigator
        label={`${monthLabel.month} ${monthLabel.year}`}
        nextAccessibilityLabel="Ver mes siguiente"
        nextDisabled={focusedMonth === rangeEndDate.slice(0, 7)}
        onNext={() => onChangeMonth(1)}
        onPrevious={() => onChangeMonth(-1)}
        previousAccessibilityLabel="Ver mes anterior"
        previousDisabled={focusedMonth === minimumCalendarDate.slice(0, 7)}
        testID="map-month-navigator"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.xxxl, paddingBottom: spacing.lg },
});
