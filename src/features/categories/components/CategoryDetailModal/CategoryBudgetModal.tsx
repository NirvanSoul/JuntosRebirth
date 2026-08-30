import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getCurrencySymbol } from '@/lib/currency/currencyCatalog';
import {
  amountMinorToInput,
  appendAmountKey,
  formatAmountInputForDisplay,
  parseAmountMinor,
} from '@/lib/currency/amountInput';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CategoryBudgetModalProps = {
  categoryColor: string;
  categoryName: string;
  initialBudgetMinor?: number;
  onClose: () => void;
  onRemove: () => void;
  onSave: (budgetMinor: number) => void;
  spaceCurrency: CurrencyCode;
  visible: boolean;
};

const budgetKeys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
] as const;
const budgetAmountHeight = 64;

export function CategoryBudgetModal({
  categoryColor,
  categoryName,
  initialBudgetMinor,
  onClose,
  onRemove,
  onSave,
  spaceCurrency,
  visible,
}: CategoryBudgetModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [amountInput, setAmountInput] = useState('0');
  const budgetMinor = parseAmountMinor(amountInput);
  const displayAmount = formatAmountInputForDisplay(amountInput);
  const currencySymbol = getCurrencySymbol(spaceCurrency);
  const contentHeight = useMemo(
    () =>
      layout.minTouchTarget +
      spacing.md +
      budgetAmountHeight +
      spacing.lg +
      layout.keypadKeyHeight[density] * budgetKeys.length +
      spacing.sm * (budgetKeys.length - 1) +
      spacing.lg +
      layout.actionHeight[density],
    [density],
  );

  useEffect(() => {
    if (visible) setAmountInput(amountMinorToInput(initialBudgetMinor ?? 0));
  }, [initialBudgetMinor, visible]);

  const handleKey = (key: (typeof budgetKeys)[number][number]) => {
    triggerHaptic('keypadPress');

    if (key === 'backspace') {
      setAmountInput((current) =>
        current.length <= 1 ? '0' : current.slice(0, -1),
      );
      return;
    }

    setAmountInput((current) => appendAmountKey(current, key));
  };

  return (
    <AppModal
      contentHeight={contentHeight}
      onClose={onClose}
      stackBehavior="push"
      testID="category-budget-modal"
      variant="catalog"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" variant="heading" weight="medium">
              Presupuesto
            </Text>
            <Text
              numberOfLines={1}
              tone="secondary"
              variant="footnote"
              weight="medium"
            >
              {categoryName} ({spaceCurrency})
            </Text>
          </View>
          <ModalCloseButton onPress={onClose} />
        </View>

        <View
          accessibilityLabel={`${displayAmount} ${spaceCurrency} de presupuesto`}
          accessibilityLiveRegion="polite"
          style={styles.amountArea}
          testID="category-budget-amount"
        >
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            variant="amountHero"
            weight="medium"
          >
            {displayAmount} {currencySymbol}
          </Text>
        </View>

        <View style={styles.keypad} testID="category-budget-keypad">
          {budgetKeys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <Pressable
                  accessibilityLabel={key === 'backspace' ? 'Borrar' : key}
                  accessibilityRole="button"
                  key={key}
                  onPress={() => handleKey(key)}
                  style={({ pressed }) => [
                    styles.key,
                    { height: layout.keypadKeyHeight[density] },
                    pressed && styles.keyPressed,
                  ]}
                >
                  {key === 'backspace' ? (
                    <Ionicons
                      color={colors.textPrimary}
                      name="backspace-outline"
                      size={iconSize.lg}
                    />
                  ) : (
                    <Text variant="title" weight="medium">
                      {key}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {initialBudgetMinor ? (
            <Pressable
              accessibilityLabel="Quitar Presupuesto"
              accessibilityRole="button"
              onPress={onRemove}
              style={[
                styles.removeButton,
                { minHeight: layout.actionHeight[density] },
              ]}
              testID="category-budget-remove-button"
            >
              <Text
                testID="category-budget-remove-label"
                variant="bodyStrong"
                weight="medium"
              >
                Quitar Presupuesto
              </Text>
            </Pressable>
          ) : null}
          <ModalPrimaryAction
            accessibilityLabel="Agregar presupuesto"
            disabled={budgetMinor <= 0}
            gradientColor={categoryColor}
            gradientTestID="category-budget-save-gradient"
            label="Agregar"
            mutedWhenDisabled
            onPress={() => onSave(budgetMinor)}
            style={styles.saveButton}
            testID="category-budget-save-button"
          />
        </View>
      </View>
    </AppModal>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    container: { gap: spacing.lg },
    header: {
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerCopy: { flex: 1, gap: spacing.xxs },
    amountArea: {
      height: budgetAmountHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypad: { gap: spacing.sm },
    keypadRow: { flexDirection: 'row', gap: spacing.sm },
    key: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
    },
    keyPressed: { opacity: 0.56, transform: [{ scale: 0.97 }] },
    actions: { flexDirection: 'row', gap: spacing.sm },
    removeButton: {
      flexBasis: '40%',
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
    },
    saveButton: { flex: 1 },
  });
}
