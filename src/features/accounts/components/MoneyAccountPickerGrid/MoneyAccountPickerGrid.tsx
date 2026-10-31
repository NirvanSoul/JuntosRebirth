import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MoneyAccountCard } from '@/features/accounts/components/MoneyAccountCard/MoneyAccountCard';
import type { MoneyAccountSummary } from '@/features/accounts/utils/moneyAccountSummary';
import { spacing } from '@/theme/spacing';

type MoneyAccountPickerGridProps = {
  accounts: readonly MoneyAccountSummary[];
  onSelect: (moneyAccountId: string) => void;
  selectedId: string | undefined;
};

const cardGap = spacing.sm;
/** Lo que la rejilla invade del margen del modal para agrandar las tarjetas. */
const gridBleed = spacing.xs;
const visibleColumns = 2;
/** Fracción de la tercera columna que asoma para insinuar que hay más. */
const nextColumnPeek = 0.18;

/**
 * Las cuentas como tarjetas compactas en columnas de dos: la primera arriba,
 * la segunda debajo, y así sucesivamente. Caben cuatro a la vista; a partir de
 * cinco las columnas se recorren en horizontal y la siguiente asoma por el
 * borde para que se note que se puede deslizar.
 */
export function MoneyAccountPickerGrid({
  accounts,
  onSelect,
  selectedId,
}: MoneyAccountPickerGridProps) {
  const [gridWidth, setGridWidth] = useState<number>();
  const columns: MoneyAccountSummary[][] = [];
  for (let index = 0; index < accounts.length; index += 2) {
    columns.push(accounts.slice(index, index + 2));
  }
  const scrolls = columns.length > visibleColumns;
  const shownColumns = visibleColumns + (scrolls ? nextColumnPeek : 0);
  const cardWidth =
    gridWidth === undefined
      ? undefined
      : Math.floor(
          (gridWidth - cardGap * Math.ceil(shownColumns - 1)) / shownColumns,
        );

  if (accounts.length === 0) return null;

  return (
    <View
      style={styles.bleed}
      onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        contentContainerStyle={styles.columns}
        horizontal
        scrollEnabled={scrolls}
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        testID="money-account-picker-grid"
      >
        {columns.map((column, columnIndex) => (
          <View
            key={columnIndex}
            style={styles.column}
            testID={`money-account-picker-column-${columnIndex}`}
          >
            {column.map((account) => (
              <MoneyAccountCard
                account={account}
                bordered
                compact
                compactWidth={cardWidth}
                key={account.id}
                onPress={() => onSelect(account.id)}
                selected={selectedId === account.id}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -gridBleed },
  // Deja respirar la sombra de las tarjetas dentro del recorte del scroll.
  scroll: { overflow: 'visible' },
  columns: { gap: cardGap, paddingVertical: spacing.xs },
  column: { gap: cardGap },
});
