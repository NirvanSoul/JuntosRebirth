import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { colors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

const emptyIconSize = 56;

export type EmptyStateProps = {
  accessibilityLabel?: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconBackgroundColor: string;
  onPress?: () => void;
  testID: string;
  title: string;
};

export function EmptyState({
  accessibilityLabel,
  description,
  icon,
  iconBackgroundColor,
  onPress,
  testID,
  title,
}: EmptyStateProps) {
  const content = (
    <>
      <View
        style={[styles.icon, { backgroundColor: iconBackgroundColor }]}
        testID={`${testID}-icon`}
      >
        <Ionicons
          color={colors.onBrand}
          name={icon}
          size={iconSize.lg}
          testID={`${testID}-glyph`}
        />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong" weight="semibold">
          {title}
        </Text>
        <Text style={styles.description} tone="secondary" variant="footnote">
          {description}
        </Text>
      </View>
      {onPress ? (
        <Ionicons
          color={colors.textSecondary}
          name="chevron-forward"
          size={iconSize.sm}
          testID={`${testID}-arrow`}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.card} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint="Abre el formulario correspondiente"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.72,
  },
  icon: {
    width: emptyIconSize,
    height: emptyIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  text: {
    flex: 1,
  },
  description: {
    marginTop: spacing.xxs,
  },
});
