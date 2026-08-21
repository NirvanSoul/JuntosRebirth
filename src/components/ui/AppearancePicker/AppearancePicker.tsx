import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

const colorColumns = 6;

export type AppearanceColorOption<TColor extends string> = {
  color: string;
  value: TColor;
};

export type AppearanceIconSection<TIcon extends string> = {
  icons: readonly TIcon[];
  title: string;
};

type AppearancePickerProps<TColor extends string, TIcon extends string> = {
  colorOptions: readonly AppearanceColorOption<TColor>[];
  iconSections: readonly AppearanceIconSection<TIcon>[];
  selectedColor: TColor;
  selectedIcon: TIcon;
  testID?: string;
  onSelectColor: (color: TColor) => void;
  onSelectIcon: (icon: TIcon) => void;
  renderIcon: (icon: TIcon, color: string) => ReactNode;
};

/** Selector reutilizable de color y de iconos clasificados para estilos. */
export function AppearancePicker<TColor extends string, TIcon extends string>({
  colorOptions,
  iconSections,
  selectedColor,
  selectedIcon,
  testID,
  onSelectColor,
  onSelectIcon,
  renderIcon,
}: AppearancePickerProps<TColor, TIcon>) {
  const density = useLayoutDensity();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const gutter = layout.screenGutter[density];
  const colorColumnGap = Math.max(
    spacing.sm,
    (width - gutter * 2 - layout.minTouchTarget * colorColumns) /
      (colorColumns - 1),
  );
  const selectedColorOption = colorOptions.find(
    (option) => option.value === selectedColor,
  );

  return (
    <View style={styles.container}>
      <View testID={testID && `${testID}-color-picker`}>
        <View
          accessibilityRole="radiogroup"
          style={[styles.colorGrid, { columnGap: colorColumnGap }]}
        >
          {colorOptions.map((option) => {
            const selected = selectedColor === option.value;

            return (
              <Pressable
                accessibilityLabel={`Color ${option.value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.value}
                onPress={() => onSelectColor(option.value)}
                style={[
                  styles.colorOption,
                  { backgroundColor: option.color },
                  selected && styles.selectedColorOption,
                ]}
              >
                {selected && (
                  <Ionicons
                    color={colors.onBrand}
                    name="checkmark"
                    size={iconSize.lg}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={[
          styles.iconSections,
          { paddingLeft: gutter, paddingRight: gutter + spacing.xl },
        ]}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.iconScroll, { width, marginLeft: -gutter }]}
        testID={testID && `${testID}-icons-scroll`}
      >
        {iconSections.map((section) => (
          <View key={section.title} style={styles.iconSection}>
            <Text tone="secondary" variant="footnote" weight="semibold">
              {section.title}
            </Text>
            <View style={styles.iconColumns}>
              {toIconColumns(section.icons).map((icons, columnIndex) => (
                <View key={columnIndex} style={styles.iconColumn}>
                  {icons.map((icon) => {
                    const selected = selectedIcon === icon;
                    const iconColor = selected
                      ? colors.onBrand
                      : colors.textSecondary;

                    return (
                      <Pressable
                        accessibilityLabel={`Icono ${icon}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={icon}
                        onPress={() => onSelectIcon(icon)}
                        style={[
                          styles.iconOption,
                          selected && {
                            backgroundColor: selectedColorOption?.color,
                            borderWidth: 0,
                          },
                        ]}
                      >
                        {renderIcon(icon, iconColor)}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { marginTop: spacing.xl },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
    colorOption: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    selectedColorOption: { borderColor: colors.onBrand, borderWidth: 3 },
    iconScroll: { marginTop: spacing.xl, overflow: 'visible' },
    iconSections: { gap: spacing.xl },
    iconSection: { gap: spacing.sm },
    iconColumns: { flexDirection: 'row', gap: spacing.sm },
    iconColumn: { gap: spacing.sm },
    iconOption: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
  });
}

function toIconColumns<TIcon>(icons: readonly TIcon[]): readonly TIcon[][] {
  return icons.reduce<TIcon[][]>((columns, icon, index) => {
    if (index % 3 === 0) columns.push([icon]);
    else columns[columns.length - 1]?.push(icon);
    return columns;
  }, []);
}
