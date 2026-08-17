import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccountModalStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import type { MoneyAccountIconName } from '@/features/accounts/types';
import { moneyAccountIconNames } from '@/features/accounts/types';
import {
  categoryColors,
  getCategoryContentContrast,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';

const colorOptions = Object.keys(categoryColors) as CategoryColorToken[];

type MoneyAccountAppearanceStepProps = {
  colorToken: CategoryColorToken;
  icon: MoneyAccountIconName;
  isEditing: boolean;
  name: string;
  styles: MoneyAccountModalStyles;
  onSelectColor: (colorToken: CategoryColorToken) => void;
  onSelectIcon: (icon: MoneyAccountIconName) => void;
  onSubmit: () => void;
};

export function MoneyAccountAppearanceStep({
  colorToken,
  icon,
  isEditing,
  name,
  styles,
  onSelectColor,
  onSelectIcon,
  onSubmit,
}: MoneyAccountAppearanceStepProps) {
  return (
    <View style={styles.step}>
      <BottomSheetScrollView
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        style={styles.stepScroll}
        testID="money-account-appearance-step"
      >
        <View style={styles.preview}>
          <View
            style={[
              styles.previewIcon,
              { backgroundColor: categoryColors[colorToken] },
            ]}
          >
            <MoneyAccountIcon
              color={getCategoryContentContrast(colorToken).color}
              name={icon}
              size={iconSize.xl}
            />
          </View>
          <Text variant="subheading">{name.trim()}</Text>
        </View>

        <Text style={styles.sectionTitle} variant="label" weight="semibold">
          Color
        </Text>
        <View accessibilityRole="radiogroup" style={styles.optionsGrid}>
          {colorOptions.map((option) => (
            <Pressable
              accessibilityLabel={`Color ${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: colorToken === option }}
              key={option}
              onPress={() => onSelectColor(option)}
              style={[
                styles.colorOption,
                { backgroundColor: categoryColors[option] },
                colorToken === option && styles.selectedOption,
              ]}
            >
              {colorToken === option && (
                <Ionicons
                  color={getCategoryContentContrast(option).color}
                  name="checkmark"
                  size={iconSize.md}
                />
              )}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle} variant="label" weight="semibold">
          Icono
        </Text>
        <View accessibilityRole="radiogroup" style={styles.optionsGrid}>
          {moneyAccountIconNames.map((option) => {
            const selected = icon === option;

            return (
              <Pressable
                accessibilityLabel={`Icono ${option}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option}
                onPress={() => onSelectIcon(option)}
                style={[
                  styles.iconOption,
                  selected && styles.selectedIconOption,
                  selected && {
                    backgroundColor: categoryColors[colorToken],
                  },
                ]}
              >
                <MoneyAccountIcon
                  color={
                    selected
                      ? getCategoryContentContrast(colorToken).color
                      : categoryColors[colorToken]
                  }
                  name={option}
                  size={iconSize.md}
                />
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>

      <ModalPrimaryAction
        accessibilityLabel={
          isEditing ? 'Guardar cambios de cuenta' : 'Crear cuenta'
        }
        label={isEditing ? 'Guardar cambios' : 'Crear cuenta'}
        onPress={onSubmit}
        style={styles.primaryButtonLayout}
      />
    </View>
  );
}
