import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { getCountryFlag } from '@/lib/geography/countryCatalog';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type SelectedCountryFieldProps = {
  country: { currencyCode: string; iso2: string; name: string };
  onClear: () => void;
  testID?: string;
};

/**
 * Ocupa el mismo lugar y forma que `CountrySearchField` una vez elegido un
 * país: en vez de volver a mostrar el teclado, muestra la elección con una
 * `X` para deshacerla y volver a buscar.
 */
export function SelectedCountryField({
  country,
  onClear,
  testID,
}: SelectedCountryFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} testID={testID}>
      <Text numberOfLines={1} style={styles.label} variant="body">
        {getCountryFlag(country.iso2)} {country.name} · {country.currencyCode}
      </Text>
      <Pressable
        accessibilityLabel={`Cambiar país, actualmente ${country.name}`}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onClear}
        style={({ pressed }) => [styles.clear, pressed ? styles.pressed : null]}
        testID={testID ? `${testID}-clear` : undefined}
      >
        <Ionicons
          color={colors.textMuted}
          name="close-circle"
          size={iconSize.md}
        />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
    },
    label: { flex: 1 },
    clear: { padding: spacing.xxs },
    pressed: { opacity: 0.6 },
  });
}
