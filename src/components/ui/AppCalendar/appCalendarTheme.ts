import type { ComponentProps } from 'react';
import type { Calendar } from 'react-native-calendars';

import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { typography } from '@/theme/typography';

const calendarDaySize = 40;

type CalendarTheme = NonNullable<ComponentProps<typeof Calendar>['theme']> & {
  'stylesheet.calendar.header': Record<string, object>;
  'stylesheet.calendar-list.main': Record<string, object>;
  'stylesheet.calendar.main': Record<string, object>;
  'stylesheet.day.basic': Record<string, object>;
};

/** Tema de react-native-calendars con los tokens de la app. */
export function createCalendarTheme(colors: ColorTokens): CalendarTheme {
  return {
    arrowColor: colors.textPrimary,
    calendarBackground: colors.surface,
    dayTextColor: colors.textPrimary,
    monthTextColor: colors.textPrimary,
    selectedDayBackgroundColor: colors.cta,
    selectedDayTextColor: colors.onBrand,
    textDayFontFamily: typography.body.fontFamily,
    textDayFontSize: typography.body.fontSize,
    textDayHeaderFontFamily: typography.footnote.fontFamily,
    textDayHeaderFontSize: typography.footnote.fontSize,
    textDisabledColor: colors.textMuted,
    textMonthFontFamily: typography.bodyStrong.fontFamily,
    textMonthFontSize: typography.bodyStrong.fontSize,
    textSectionTitleColor: colors.textSecondary,
    todayTextColor: colors.cta,
    'stylesheet.calendar.header': {
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.none,
        paddingHorizontal: spacing.none,
      },
      // El mes ocupa todo el ancho entre las flechas, como en MonthNavigator.
      headerContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        marginHorizontal: spacing.xs,
      },
      monthText: {
        color: colors.textPrimary,
        fontFamily: typography.bodyStrong.fontFamily,
        fontSize: typography.bodyStrong.fontSize,
        marginVertical: spacing.xs,
      },
      week: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.xl,
      },
      dayHeader: {
        width: spacing.xxl,
        color: colors.textSecondary,
        fontFamily: typography.footnote.fontFamily,
        fontSize: typography.footnote.fontSize,
        includeFontPadding: false,
        letterSpacing: typography.footnote.letterSpacing,
        lineHeight: typography.footnote.lineHeight,
        marginBottom: spacing.lg,
        textAlign: 'center',
      },
    },
    'stylesheet.calendar.main': {
      container: {
        paddingLeft: spacing.none,
        paddingRight: spacing.none,
        backgroundColor: colors.surface,
      },
      week: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: spacing.sm,
      },
    },
    'stylesheet.calendar-list.main': {
      flatListContainer: { flex: 1 },
    },
    'stylesheet.day.basic': {
      base: {
        width: calendarDaySize,
        height: calendarDaySize,
        alignItems: 'center',
        justifyContent: 'center',
      },
      today: {
        borderColor: colors.cta,
        borderRadius: radii.sm,
        borderWidth: 1,
      },
      selected: {
        backgroundColor: colors.cta,
        borderRadius: radii.sm,
      },
      text: {
        color: colors.textPrimary,
        fontFamily: typography.body.fontFamily,
        fontSize: typography.body.fontSize,
        includeFontPadding: false,
        lineHeight: calendarDaySize,
        marginTop: spacing.none,
        textAlign: 'center',
        textAlignVertical: 'center',
      },
      todayText: { color: colors.cta },
      selectedText: { color: colors.onBrand },
      disabledText: { color: colors.textMuted },
    },
  };
}
