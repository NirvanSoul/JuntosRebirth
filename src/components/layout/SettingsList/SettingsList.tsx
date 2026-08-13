import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { iconSize, layout } from '@/theme/layout';
import { previewCardLayout } from '@/theme/previewCard';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

export type SettingsIconName = ComponentProps<typeof Ionicons>['name'];

export type SettingsCustomIcon = ComponentType<{
  color: string;
  size: number;
  testID?: string;
}>;

type SettingsSectionProps = {
  children: ReactNode;
  emphasizeIcon?: boolean;
  icon: SettingsIconName;
  title: string;
};

type SettingsRowBaseProps = {
  destructive?: boolean;
  iconBackgroundColor: string;
  label: string;
  onPress?: () => void;
  pending?: boolean;
  value?: string;
};

export type SettingsRowProps = SettingsRowBaseProps &
  (
    | { icon: SettingsIconName; iconComponent?: never }
    | { icon?: never; iconComponent: SettingsCustomIcon }
  );

export type SettingsToggleRowProps = {
  description?: string;
  enabled: boolean;
  icon: SettingsIconName;
  iconBackgroundColor: string;
  label: string;
  onToggle: (enabled: boolean) => void;
  testID: string;
};

const rowIconSize = previewCardLayout.iconSize;
const rowGlyphSize = iconSize.sm;

export function SettingsSection({
  children,
  emphasizeIcon = true,
  icon,
  title,
}: SettingsSectionProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionTitleIcon} testID={`section-icon-${title}`}>
          <Ionicons
            color={colors.textMuted}
            name={icon}
            size={iconSize.md}
            style={emphasizeIcon ? styles.sectionGlyphEmphasized : undefined}
            testID={`section-glyph-${title}`}
          />
        </View>
        <Text accessibilityRole="header" variant="subheading">
          {title}
        </Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export function SettingsRow({
  destructive = false,
  icon,
  iconComponent: IconComponent,
  iconBackgroundColor,
  label,
  onPress,
  pending = false,
  value,
}: SettingsRowProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));
  const content = (
    <>
      <View
        style={[styles.rowIcon, { backgroundColor: iconBackgroundColor }]}
        testID={`row-icon-${label}`}
      >
        {IconComponent ? (
          <IconComponent
            color={colors.onBrand}
            size={rowGlyphSize}
            testID={`row-glyph-${label}`}
          />
        ) : icon ? (
          <Ionicons
            color={colors.onBrand}
            name={icon}
            size={rowGlyphSize}
            style={styles.rowGlyphEmphasized}
            testID={`row-glyph-${label}`}
          />
        ) : null}
      </View>
      <View style={styles.rowText}>
        <Text
          tone={destructive ? 'expense' : 'primary'}
          variant="label"
          weight="semibold"
        >
          {label}
        </Text>
        {value ? (
          <Text numberOfLines={1} tone="secondary" variant="footnote">
            {value}
          </Text>
        ) : null}
      </View>
      {pending ? (
        <View
          accessibilityLabel="Pendiente de implementar"
          accessibilityRole="text"
          style={styles.pendingDot}
          testID={`pending-${label}`}
        />
      ) : null}
      {onPress ? (
        <Ionicons
          color={colors.textMuted}
          name="chevron-forward"
          size={iconSize.xs}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={
        pending ? 'Función pendiente de implementar' : 'Abre esta configuración'
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsToggleRow({
  description,
  enabled,
  icon,
  iconBackgroundColor,
  label,
  onToggle,
  testID,
}: SettingsToggleRowProps) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return (
    <View style={styles.row}>
      <View
        style={[styles.rowIcon, { backgroundColor: iconBackgroundColor }]}
        testID={`row-icon-${label}`}
      >
        <Ionicons
          color={colors.onBrand}
          name={icon}
          size={rowGlyphSize}
          style={styles.rowGlyphEmphasized}
          testID={`row-glyph-${label}`}
        />
      </View>
      <View style={styles.rowText}>
        <Text tone="primary" variant="label" weight="semibold">
          {label}
        </Text>
        {description ? (
          <Text numberOfLines={1} tone="secondary" variant="footnote">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        onValueChange={onToggle}
        style={styles.toggleSwitch}
        testID={testID}
        thumbColor={colors.surface}
        trackColor={{ false: colors.border, true: colors.cta }}
        value={enabled}
      />
    </View>
  );
}

export function SettingsPendingDot() {
  const { shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return <View style={styles.pendingDot} />;
}

export function SettingsDivider() {
  const { shadows } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, shadows));

  return <View style={styles.divider} />;
}

function createStyles(colors: ColorTokens, shadows: ThemeShadows) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
      marginTop: spacing.xxl,
    },
    sectionTitle: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    sectionTitleIcon: {
      width: iconSize.md,
      height: iconSize.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionGlyphEmphasized: {
      textShadowColor: colors.textMuted,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0.45,
    },
    sectionCard: {
      ...shadows.subtle,
      overflow: 'hidden',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: previewCardLayout.borderRadius,
      backgroundColor: colors.surface,
    },
    row: {
      minHeight: previewCardLayout.minHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: previewCardLayout.paddingHorizontal,
      paddingVertical: previewCardLayout.paddingVertical,
    },
    rowPressed: {
      opacity: 0.68,
    },
    rowIcon: {
      width: rowIconSize,
      height: rowIconSize,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: previewCardLayout.iconRadius,
    },
    rowGlyphEmphasized: {
      textShadowColor: colors.onBrand,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0.45,
    },
    rowText: {
      minWidth: 0,
      flex: 1,
      gap: spacing.xxs,
    },
    toggleSwitch: {
      marginTop: spacing.sm,
    },
    pendingDot: {
      width: spacing.sm,
      height: spacing.sm,
      flexShrink: 0,
      borderRadius: radii.round,
      backgroundColor: colors.expense,
    },
    divider: {
      height: 1,
      marginLeft:
        previewCardLayout.paddingHorizontal + rowIconSize + spacing.md,
      backgroundColor: colors.categoryPreviewBorder,
    },
  });
}
