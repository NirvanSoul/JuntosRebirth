import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import {
  AppearancePicker,
  type AppearanceColorOption,
} from '@/components/ui/AppearancePicker/AppearancePicker';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccountModalStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import { MoneyAccountIcon } from '@/features/accounts/components/MoneyAccountIcon/MoneyAccountIcon';
import type { MoneyAccountIconName } from '@/features/accounts/types';
import { moneyAccountIconSections } from '@/features/accounts/types';
import {
  categoryColors,
  categoryColorTokens,
  type CategoryColorToken,
} from '@/theme/categoryColors';
import { lightColors } from '@/theme/colors';
import { iconSize } from '@/theme/layout';

const colorOptions: readonly AppearanceColorOption<CategoryColorToken>[] =
  categoryColorTokens.map((value) => ({
    color: categoryColors[value],
    value,
  }));

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
            testID="money-account-appearance-preview-icon"
          >
            <MoneyAccountIcon
              color={lightColors.onBrand}
              name={icon}
              size={iconSize.xl}
            />
          </View>
          <Text variant="subheading">{name.trim()}</Text>
        </View>

        <AppearancePicker
          colorOptions={colorOptions}
          iconSections={moneyAccountIconSections}
          onSelectColor={onSelectColor}
          onSelectIcon={onSelectIcon}
          renderIcon={(option, color) => (
            <MoneyAccountIcon color={color} name={option} size={iconSize.md} />
          )}
          selectedColor={colorToken}
          selectedIcon={icon}
          testID="money-account-appearance"
        />
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
