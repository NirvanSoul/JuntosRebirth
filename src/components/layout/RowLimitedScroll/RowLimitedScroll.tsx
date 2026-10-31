import {
  Children,
  isValidElement,
  type PropsWithChildren,
  useState,
} from 'react';
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';

type RowLimitedScrollProps = PropsWithChildren<{
  columnGap: number;
  maxRows: number;
  rowGap: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/** Margen para que el redondeo de layout no mande un elemento a otra fila. */
const rowWidthTolerance = 0.5;

function countRows(
  widths: readonly number[],
  gap: number,
  rowWidth: number,
): number {
  let rows = 1;
  let used = 0;

  for (const width of widths) {
    if (used === 0) {
      used = width;
    } else if (used + gap + width <= rowWidth + rowWidthTolerance) {
      used += gap + width;
    } else {
      rows += 1;
      used = width;
    }
  }

  return rows;
}

/**
 * Ancho mínimo en el que los elementos, repartidos de izquierda a derecha,
 * caben en `maxRows` filas. Nunca es menor que el ancho visible.
 */
export function getRowLimitedWidth(
  widths: readonly number[],
  gap: number,
  maxRows: number,
  viewportWidth: number,
): number {
  if (countRows(widths, gap, viewportWidth) <= maxRows) return viewportWidth;

  let low = viewportWidth;
  let high = Math.ceil(
    widths.reduce((total, width) => total + width, 0) +
      gap * (widths.length - 1),
  );
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (countRows(widths, gap, middle) <= maxRows) high = middle;
    else low = middle;
  }

  return high + 1;
}

/**
 * Reparte sus hijos en filas como un `flexWrap`, pero sin pasar de `maxRows`:
 * lo que no cabe se desplaza en horizontal. El desplazamiento ocupa todo el
 * ancho de la pantalla para que el contenido no se corte en los márgenes.
 */
export function RowLimitedScroll({
  children,
  columnGap,
  maxRows,
  rowGap,
  style,
  testID,
}: RowLimitedScrollProps) {
  const { width } = useWindowDimensions();
  const gutter = layout.screenGutter[useLayoutDensity()];
  const viewportWidth = width - gutter * 2;
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({});
  const items = Children.toArray(children).filter(isValidElement);
  const widths = items.map((item) => itemWidths[String(item.key)]);
  const isMeasured = widths.every((itemWidth) => itemWidth !== undefined);
  const contentWidth = isMeasured
    ? getRowLimitedWidth(widths as number[], columnGap, maxRows, viewportWidth)
    : viewportWidth;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        // Hasta medir cada elemento no se sabe cuántas filas caben: se oculta
        // un instante en vez de mostrarlo con más filas de las permitidas.
        !isMeasured && styles.measuring,
        {
          columnGap,
          paddingHorizontal: gutter,
          rowGap,
          width: contentWidth + gutter * 2,
        },
      ]}
      horizontal
      scrollEnabled={contentWidth > viewportWidth}
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, { marginLeft: -gutter, width }, style]}
      testID={testID}
    >
      {items.map((item) => {
        const key = String(item.key);

        return (
          <View
            key={key}
            onLayout={({ nativeEvent }) => {
              const itemWidth = nativeEvent.layout.width;
              setItemWidths((current) =>
                current[key] === itemWidth
                  ? current
                  : { ...current, [key]: itemWidth },
              );
            }}
            style={{ maxWidth: viewportWidth }}
          >
            {item}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  measuring: { opacity: 0 },
  scroll: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    overflow: 'visible',
  },
});
