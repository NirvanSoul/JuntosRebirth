import { type ComponentProps, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/Text/Text';
import {
  AnimatedChevron,
  AnimatedDisclosureContent,
  getActivityLayoutTransition,
} from '@/features/activity/components/ActivityCollapsibleSection';
import {
  type ActivityMonthSection,
  groupActivityMonths,
  summarizeActivityMonth,
} from '@/features/activity/utils/activityTimeline';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import {
  groupTransactionsForPreview,
  TransactionPreviewList,
} from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import { minTouchTarget } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

/**
 * Meses de «Desde el inicio» y cuál se está viendo. Un mes pasa a verse
 * cuando su subtítulo llega bajo el resumen fijo; hasta entonces, el primero.
 * Con otro filtro de fecha no hay meses y el resumen es el de toda la lista.
 */
export function useActivityMonthSections(
  transactions: readonly SessionTransaction[],
  dateFilter: TransactionDateFilter,
) {
  const enabled = dateFilter === 'all';
  const sections = useMemo(
    () => (enabled ? groupActivityMonths(transactions) : []),
    [enabled, transactions],
  );
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const listTop = useRef(0);
  const summaryHeight = useRef(0);
  const sectionTops = useRef(new Map<string, number>());
  const visible =
    sections.find((section) => section.key === visibleKey) ?? sections[0];
  const summary = useMemo(
    () =>
      visible
        ? summarizeActivityMonth(sections, visible.key)
        : summarizeTransactionTotals(transactions),
    [sections, transactions, visible],
  );

  return {
    sections,
    summary,
    onListLayout: (top: number) => {
      listTop.current = top;
    },
    onScroll: (offset: number) => {
      const threshold = offset + summaryHeight.current - listTop.current;
      let key: string | null = null;
      for (const section of sections) {
        const top = sectionTops.current.get(section.key);
        if (top !== undefined && top <= threshold) key = section.key;
      }
      if (key !== visibleKey) setVisibleKey(key);
    },
    onSectionLayout: (key: string, top: number) => {
      sectionTops.current.set(key, top);
    },
    onSummaryLayout: (height: number) => {
      summaryHeight.current = height;
    },
  };
}

type ActivityMovementListProps = Omit<
  ComponentProps<typeof TransactionPreviewList>,
  'limit'
> & {
  limit: number;
  months: ReturnType<typeof useActivityMonthSections>;
};

/**
 * Lista de movimientos de Actividad. Con «Desde el inicio» va por meses, cada
 * uno con su subtítulo, y el límite de filas se reparte entre ellos en orden.
 * Pulsar el subtítulo pliega o despliega el mes, como las secciones de
 * Actividad; un mes plegado no gasta filas del límite.
 */
export function ActivityMovementList({
  limit,
  months,
  testID,
  ...listProps
}: ActivityMovementListProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  if (months.sections.length === 0) {
    return (
      <TransactionPreviewList {...listProps} limit={limit} testID={testID} />
    );
  }

  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  let remaining = limit;
  const shown: { limit: number; section: ActivityMonthSection }[] = [];
  for (const section of months.sections) {
    if (remaining <= 0) break;
    shown.push({ limit: remaining, section });
    if (!collapsed.has(section.key)) {
      remaining -= groupTransactionsForPreview(section.transactions).length;
    }
  }

  return (
    <Animated.View layout={getActivityLayoutTransition()} testID={testID}>
      {shown.map(({ limit: sectionLimit, section }) => {
        const expanded = !collapsed.has(section.key);
        return (
          <Animated.View
            key={section.key}
            layout={getActivityLayoutTransition()}
            onLayout={({ nativeEvent }) =>
              months.onSectionLayout(section.key, nativeEvent.layout.y)
            }
            testID={`activity-month-${section.key}`}
          >
            <Pressable
              accessibilityHint={`${expanded ? 'Oculta' : 'Muestra'} los movimientos de ${section.label}`}
              accessibilityLabel={section.label}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => toggle(section.key)}
              style={({ pressed }) => [
                styles.header,
                pressed ? styles.headerPressed : null,
              ]}
              testID={`activity-month-toggle-${section.key}`}
            >
              <Text accessibilityRole="header" tone="secondary" variant="label">
                {section.label}
              </Text>
              <AnimatedChevron expanded={expanded} />
            </Pressable>
            <AnimatedDisclosureContent expanded={expanded}>
              <TransactionPreviewList
                {...listProps}
                limit={sectionLimit}
                transactions={section.transactions}
              />
            </AnimatedDisclosureContent>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerPressed: { opacity: 0.64 },
});
