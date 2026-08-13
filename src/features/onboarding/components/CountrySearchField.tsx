import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View } from 'react-native';

import { fontFamily } from '@/theme/fonts';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CountrySearchFieldProps = {
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  value: string;
};

/** Campo nativo de pantalla completa; no depende de un host de bottom sheet. */
export function CountrySearchField({
  onBlur,
  onChangeText,
  onFocus,
  value,
}: CountrySearchFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Ionicons color={colors.textMuted} name="search" size={iconSize.md} />
      <TextInput
        accessibilityLabel="Escribe tu país"
        autoCapitalize="words"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="Escribe tu país"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={styles.input}
        testID="onboarding-country-search"
        value={value}
      />
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
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: fontFamily.light,
      fontSize: typography.body.fontSize,
      paddingVertical: spacing.sm,
    },
  });
}
