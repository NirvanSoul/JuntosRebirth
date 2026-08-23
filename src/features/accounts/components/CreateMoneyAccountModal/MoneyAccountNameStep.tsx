import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccountModalStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import type { MoneyAccountNameValidation } from '@/features/accounts/utils/moneyAccountCatalog';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { layout } from '@/theme/layout';
import { maxFontScale } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

type MoneyAccountNameStepProps = {
  hasAttemptedSubmit: boolean;
  isKeyboardVisible: boolean;
  name: string;
  styles: MoneyAccountModalStyles;
  validation: MoneyAccountNameValidation;
  onChangeName: (value: string) => void;
  onContinue: () => void;
};

/** Primer paso aislado para que el CTA acompañe al teclado, como en categorías. */
export function MoneyAccountNameStep({
  hasAttemptedSubmit,
  isKeyboardVisible,
  name,
  styles,
  validation,
  onChangeName,
  onContinue,
}: MoneyAccountNameStepProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();

  return (
    <View style={styles.nameStep}>
      <BottomSheetTextInput
        accessibilityLabel="Nombre de la cuenta"
        autoFocus
        maxFontSizeMultiplier={maxFontScale.body}
        maxLength={40}
        onChangeText={onChangeName}
        onSubmitEditing={onContinue}
        placeholder="Por ejemplo, Cuenta nómina"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        style={[
          styles.input,
          { minHeight: layout.controlHeight[density] },
          hasAttemptedSubmit && !validation.valid && styles.inputError,
        ]}
        value={name}
      />
      {hasAttemptedSubmit && !validation.valid ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.error}
          tone="expense"
          variant="footnote"
        >
          {validation.error}
        </Text>
      ) : null}
      <View
        style={[
          styles.bottomAction,
          isKeyboardVisible && styles.keyboardAction,
        ]}
        testID="money-account-name-action"
      >
        <ModalPrimaryAction
          accessibilityLabel="Continuar tipo de cuenta"
          disabled={!validation.valid}
          label="Continuar"
          onPress={onContinue}
          style={[
            styles.primaryButtonLayout,
            isKeyboardVisible && styles.keyboardPrimaryButton,
          ]}
        />
      </View>
    </View>
  );
}
