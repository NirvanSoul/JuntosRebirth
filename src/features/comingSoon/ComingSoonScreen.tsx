import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen/Screen';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { CategoryIconName } from '@/features/categories/types';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import {
  categoryColors,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

const upcomingFeatures = [
  { name: 'Ahorros', icon: 'piggy-bank', color: 'forest' },
  { name: 'Metas', icon: 'plant', color: 'violet' },
  { name: 'Lista de deseos', icon: 'heart', color: 'pink' },
  { name: 'Espacios familiares', icon: 'users-three', color: 'blue' },
  { name: 'Planes', icon: 'compass', color: 'orange' },
  { name: 'Préstamos', icon: 'hand-coins', color: 'teal' },
] as const satisfies readonly {
  name: string;
  icon: CategoryIconName;
  color: CategoryColorToken;
}[];

export function ComingSoonScreen() {
  const { colors, shadows } = useTheme();
  const density = useLayoutDensity();

  return (
    <Screen contentContainerStyle={styles.content} testID="coming-soon-screen">
      <Text
        accessibilityRole="header"
        align="center"
        variant="title"
        weight="bold"
      >
        Lo que viene lo construiremos juntos.
      </Text>
      <View style={[styles.grid, { gap: layout.stackGap[density] }]}>
        {upcomingFeatures.map(({ name, icon, color }) => (
          <View
            accessible
            accessibilityLabel={`${name}. Próximamente`}
            key={name}
            style={[
              styles.card,
              shadows.subtle,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.icon, { backgroundColor: categoryColors[color] }]}
            >
              <CategoryIcon
                color={colors.onBrand}
                name={icon}
                size={previewCardLayout.glyphSize}
              />
            </View>
            <Text align="center" variant="label" weight="semibold">
              {name}
            </Text>
            <Text align="center" tone="secondary" variant="caption">
              Próximamente
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    flexBasis: '44%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: previewCardLayout.borderRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: previewCardLayout.iconSize,
    height: previewCardLayout.iconSize,
    borderRadius: previewCardLayout.iconRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
