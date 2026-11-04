import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import {
  CategoryBudgetScheduleFields,
  getBudgetScheduleFieldsHeight,
} from '@/features/categories/components/CategoryDetailModal/CategoryBudgetScheduleFields';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type {
  BudgetSchedule,
  CategoryIconName,
} from '@/features/categories/types';
import { isSameBudgetSchedule } from '@/features/categories/utils/categoryBudgetPeriod';
import { TransactionDatePickerModal } from '@/features/transactions/components/CreateTransactionModal/TransactionDatePickerModal';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getCurrencySymbol } from '@/lib/currency/currencyCatalog';
import {
  amountMinorToInput,
  appendAmountKey,
  formatAmountInputForDisplay,
  parseAmountMinor,
} from '@/lib/currency/amountInput';
import { toLocalDateKey } from '@/lib/date/localDate';
import { triggerHaptic } from '@/lib/haptics/haptics';
import { iconSize, layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { useCurrencySymbolPreference } from '@/state/appPreferences/CurrencySymbolPreferenceProvider';

type CategoryBudgetModalProps = {
  /** Periodo desde el que se aplica el cambio (p. ej. «Noviembre 2026»). */
  appliesFromLabel?: string;
  categoryColor: string;
  categoryIcon: CategoryIconName;
  categoryName: string;
  /** Avisa de que cambiar la periodicidad descarta los importes por periodo. */
  hasPeriodOverrides?: boolean;
  initialBudgetMinor?: number;
  initialSchedule?: BudgetSchedule;
  onClose: () => void;
  onRemove: () => void;
  onSave: (budgetMinor: number, schedule: BudgetSchedule) => void;
  /**
   * Edita un único periodo (p. ej. «Noviembre 2026»). Con la misma
   * periodicidad cambia solo ese importe; con otra, la nueva se aplica desde
   * ese periodo en adelante. «Quitar» devuelve el periodo al importe habitual.
   */
  periodLabel?: string;
  /** Inicio del periodo editado: fecha de inicio por defecto del personalizado. */
  periodStartOn?: string;
  /** Solo en modo periodo: el periodo ya tiene un importe propio. */
  removable?: boolean;
  currency: CurrencyCode;
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
  appliesFromLabel,
  categoryColor,
  categoryIcon,
  categoryName,
  hasPeriodOverrides,
  initialBudgetMinor,
  initialSchedule,
  onClose,
  onRemove,
  onSave,
  periodLabel,
  periodStartOn,
  removable,
  currency,
  visible,
}: CategoryBudgetModalProps) {
  const isPeriodMode = periodLabel !== undefined;
  const { showCurrencySymbols } = useCurrencySymbolPreference();
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [amountInput, setAmountInput] = useState('0');
  const [schedule, setSchedule] = useState<BudgetSchedule>({ period: 'month' });
  const [isAnchorPickerVisible, setAnchorPickerVisible] = useState(false);
  const budgetMinor = parseAmountMinor(amountInput);
  const displayAmount = formatAmountInputForDisplay(amountInput);
  const currencySymbol = getCurrencySymbol(currency);
  const contentHeight = useMemo(
    () =>
      layout.minTouchTarget +
      spacing.md +
      getBudgetScheduleFieldsHeight(schedule) +
      budgetAmountHeight +
      spacing.lg +
      layout.keypadKeyHeight[density] * budgetKeys.length +
      spacing.sm * (budgetKeys.length - 1) +
      spacing.lg +
      layout.actionHeight[density],
    [density, schedule],
  );

  if (
    useDepsChanged([visible, initialBudgetMinor, initialSchedule]) &&
    visible
  ) {
    setAmountInput(amountMinorToInput(initialBudgetMinor ?? 0));
    setSchedule(initialSchedule ?? { period: 'month' });
    setAnchorPickerVisible(false);
  }

  const todayKey = toLocalDateKey(new Date());
  const changesSchedule =
    initialSchedule !== undefined &&
    !isSameBudgetSchedule(initialSchedule, schedule);
  const resetsOverrides =
    !isPeriodMode && hasPeriodOverrides === true && changesSchedule;

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
    <>
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
            <View
              style={[styles.categoryIcon, { backgroundColor: categoryColor }]}
              testID="category-budget-category-icon"
            >
              <CategoryIcon
                color={colors.onBrand}
                name={categoryIcon}
                size={iconSize.md}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text
                accessibilityRole="header"
                variant="heading"
                weight="medium"
              >
                Presupuesto
              </Text>
              <Text
                numberOfLines={1}
                testID="category-budget-subtitle"
                tone={resetsOverrides ? 'expense' : 'secondary'}
                variant="footnote"
                weight="medium"
              >
                {isPeriodMode
                  ? changesSchedule
                    ? `Desde ${periodLabel} en adelante`
                    : periodLabel
                  : resetsOverrides
                    ? 'Se quitarán los importes editados por periodo'
                    : appliesFromLabel
                      ? `Desde ${appliesFromLabel} en adelante`
                      : categoryName}
              </Text>
            </View>
            <ModalCloseButton onPress={onClose} />
          </View>

          <CategoryBudgetScheduleFields
            defaultAnchorOn={periodStartOn}
            onChange={setSchedule}
            onPickAnchor={() => setAnchorPickerVisible(true)}
            schedule={schedule}
          />

          <View
            accessibilityLabel={`${displayAmount} ${currency} de presupuesto`}
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
              {displayAmount}
              {showCurrencySymbols ? ` ${currencySymbol}` : ''}
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
            {(isPeriodMode ? removable : initialBudgetMinor) ? (
              <Pressable
                accessibilityLabel={
                  isPeriodMode ? 'Usar importe habitual' : 'Quitar Presupuesto'
                }
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
                  {isPeriodMode ? 'Usar habitual' : 'Quitar Presupuesto'}
                </Text>
              </Pressable>
            ) : null}
            <ModalPrimaryAction
              accessibilityLabel={
                initialBudgetMinor
                  ? 'Guardar presupuesto'
                  : 'Agregar presupuesto'
              }
              disabled={budgetMinor <= 0}
              gradientColor={categoryColor}
              gradientTestID="category-budget-save-gradient"
              label={initialBudgetMinor ? 'Guardar' : 'Agregar'}
              mutedWhenDisabled
              onPress={() => onSave(budgetMinor, schedule)}
              style={styles.saveButton}
              testID="category-budget-save-button"
            />
          </View>
        </View>
      </AppModal>
      <TransactionDatePickerModal
        onClose={() => setAnchorPickerVisible(false)}
        onSelect={(anchorOn) => {
          if (schedule.period === 'custom') {
            setSchedule({ ...schedule, anchorOn });
          }
          setAnchorPickerVisible(false);
        }}
        selectedDate={
          schedule.period === 'custom' ? schedule.anchorOn : todayKey
        }
        visible={visible && isAnchorPickerVisible}
      />
    </>
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
    categoryIcon: {
      width: layout.minTouchTarget,
      height: layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
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
