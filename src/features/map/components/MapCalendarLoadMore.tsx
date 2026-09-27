import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

export function MapCalendarLoadMore({ onPress }: { onPress: () => void }) {
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <Pressable
      accessibilityHint="Carga los dos próximos años del calendario"
      accessibilityLabel="Ver más"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [themedStyles.button, pressed && styles.pressed]}
      testID="map-calendar-load-more"
    >
      <Text weight="semibold">Ver más</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.68 },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      minHeight: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.round,
      backgroundColor: colors.surface,
      marginTop: spacing.xxl,
      marginBottom: layout.floatingActionClearance,
      paddingHorizontal: spacing.xl,
    },
  });
}
