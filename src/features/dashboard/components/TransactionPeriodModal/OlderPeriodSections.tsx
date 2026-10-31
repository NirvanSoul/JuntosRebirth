import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  StyleSheet,
  View,
} from 'react-native';

import {
  getDateFilterEndKey,
  getPreviousDateFilter,
  listTransactionsByDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import type { Category } from '@/features/categories/types';
import { TransactionPreviewList } from '@/features/transactions/components/TransactionPreviewList/TransactionPreviewList';
import type { SessionTransaction } from '@/features/transactions/types';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { spacing } from '@/theme/spacing';

type OlderPeriodSection = {
  filter: Exclude<TransactionDateFilter, 'all'>;
  key: string;
  transactions: SessionTransaction[];
};

/** Un periodo pasa a ser el visible cuando su inicio cruza este tramo superior. */
const visibleSectionRatio = 1 / 3;

/**
 * Periodos anteriores al elegido, para seguir bajando por el historial sin
 * volver al selector. Salta los periodos vacíos y se detiene antes del primer
 * movimiento. `currency` en `null` no filtra por moneda (modo Venezuela).
 *
 * `scrollProps` va en el scroll de la hoja: al acercarse al final, o si el
 * contenido no la llena, añade el periodo anterior una vez por cada altura, y
 * `visibleFilter` dice qué periodo se está viendo para que el selector fijo de
 * arriba lo muestre. Al elegir otro periodo, el scroll vuelve arriba.
 */
export function useOlderPeriodSections({
  currency,
  dateFilter,
  transactions,
}: {
  currency: CurrencyCode | null;
  dateFilter: TransactionDateFilter;
  transactions: readonly SessionTransaction[];
}) {
  const [count, setCount] = useState(1);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const viewportHeight = useRef(0);
  const endReachedContentHeight = useRef<number | null>(null);
  const sectionOffsets = useRef(new Map<string, number>());
  if (useDepsChanged([dateFilter, currency])) {
    setCount(1);
    setVisibleKey(null);
  }
  useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, [dateFilter]);

  const scopedTransactions = useMemo(
    () =>
      currency === null
        ? transactions
        : transactions.filter(
            (transaction) => transaction.currency === currency,
          ),
    [currency, transactions],
  );
  const { hasMore, sections } = useMemo(() => {
    const earliest = scopedTransactions.reduce<string | null>(
      (min, transaction) =>
        min === null || transaction.occurredOn < min
          ? transaction.occurredOn
          : min,
      null,
    );
    const found: OlderPeriodSection[] = [];
    let cursor = getPreviousDateFilter(dateFilter);
    const reachesHistory = (filter: TransactionDateFilter | null) => {
      const end = filter ? getDateFilterEndKey(filter) : null;
      return earliest !== null && end !== null && end >= earliest;
    };

    while (found.length < count && cursor && reachesHistory(cursor)) {
      const periodTransactions = listTransactionsByDateFilter(
        scopedTransactions,
        cursor,
      );
      if (periodTransactions.length > 0 && cursor !== 'all') {
        found.push({
          filter: cursor,
          key: getDateFilterEndKey(cursor) ?? String(found.length),
          transactions: periodTransactions,
        });
      }
      cursor = getPreviousDateFilter(cursor);
    }

    return { hasMore: reachesHistory(cursor), sections: found };
  }, [count, dateFilter, scopedTransactions]);

  const loadNearEnd = (contentHeight: number, offset = 0) => {
    const viewport = viewportHeight.current;
    if (
      viewport > 0 &&
      hasMore &&
      contentHeight - offset - viewport < viewport &&
      endReachedContentHeight.current !== contentHeight
    ) {
      endReachedContentHeight.current = contentHeight;
      setCount((current) => current + 1);
    }
  };
  const updateVisibleSection = (offset: number) => {
    const threshold = offset + viewportHeight.current * visibleSectionRatio;
    let key: string | null = null;
    for (const section of sections) {
      const top = sectionOffsets.current.get(section.key);
      if (top !== undefined && top <= threshold) key = section.key;
    }
    if (key !== visibleKey) setVisibleKey(key);
  };
  const scrollProps = {
    onContentSizeChange: (_: number, height: number) => loadNearEnd(height),
    onLayout: ({ nativeEvent }: LayoutChangeEvent) => {
      viewportHeight.current = nativeEvent.layout.height;
    },
    onScroll: ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
      updateVisibleSection(nativeEvent.contentOffset.y);
      loadNearEnd(nativeEvent.contentSize.height, nativeEvent.contentOffset.y);
    },
    ref: scrollRef,
  };
  const onSectionLayout = (key: string, top: number) => {
    sectionOffsets.current.set(key, top);
  };

  return {
    onSectionLayout,
    scrollProps,
    sections,
    visibleFilter:
      sections.find((section) => section.key === visibleKey)?.filter ?? null,
  };
}

type OlderPeriodSectionsProps = {
  categories: readonly Category[];
  groupingTransactions: readonly SessionTransaction[];
  onOpenTransactionDetail: (transactionId: string) => void;
  onSectionLayout: (key: string, top: number) => void;
  sections: readonly OlderPeriodSection[];
  testID: string;
};

/**
 * Los movimientos de cada periodo anterior, seguidos bajo los del elegido. No
 * llevan título: el selector fijo de arriba cambia al periodo que se ve.
 */
export function OlderPeriodSections({
  categories,
  groupingTransactions,
  onOpenTransactionDetail,
  onSectionLayout,
  sections,
  testID,
}: OlderPeriodSectionsProps) {
  return sections.map((section) => (
    <View
      key={section.key}
      onLayout={({ nativeEvent }) =>
        onSectionLayout(section.key, nativeEvent.layout.y)
      }
      style={styles.section}
      testID={testID}
    >
      <TransactionPreviewList
        categories={categories}
        groupingTransactions={groupingTransactions}
        onOpenTransactionDetail={onOpenTransactionDetail}
        progressive
        transactions={section.transactions}
      />
    </View>
  ));
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
});
