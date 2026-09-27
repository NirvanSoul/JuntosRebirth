import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

export const mapWeekdayLabels = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
];

export function MapWeekdayHeader() {
  const themedStyles = useThemedStyles(createThemedStyles);

  return (
    <View style={themedStyles.row}>
      {mapWeekdayLabels.map((label) => (
        <View key={label} style={styles.column}>
          <Text
            align="center"
            style={styles.label}
            tone="secondary"
            variant="footnote"
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, minWidth: 0, paddingHorizontal: spacing.xxs },
  label: { marginBottom: spacing.lg },
});

function createThemedStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
    },
  });
}
