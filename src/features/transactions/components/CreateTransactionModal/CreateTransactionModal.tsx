import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { Category } from '@/features/categories/types';
import type {
  CreateTransactionDraft,
  TransactionRecurrence,
  TransactionType,
} from '@/features/transactions/types';
import {
  amountMinorToInput,
  appendAmountKey,
  type CalculatorOperator,
  evaluatePendingOperations,
  formatAmountInputForDisplay,
  type PendingOperationStep,
  parseAmountMinor,
  validateCurrencySwitch,
} from '@/features/transactions/utils/transactionAmount';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { getLocalTodayKey } from '@/lib/date/localDate';
import {
  defaultCurrencyCode,
  getCurrencyPluralName,
  getCurrencySymbol,
  getCurrencySymbolPosition,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { triggerHaptic } from '@/lib/haptics/haptics';
import {
  categoryColors,
  getCategoryContentContrast,
} from '@/theme/categoryColors';
import { iconSize, type LayoutDensity, layout } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { TransactionDatePickerModal } from './TransactionDatePickerModal';
import { TransactionCustomRecurrenceModal } from './TransactionCustomRecurrenceModal';
import { TransactionCurrencyPickerModal } from './TransactionCurrencyPickerModal';

type CreateTransactionModalProps = {
  activeSpaceId: string;
  availableCurrencies?: readonly CurrencyCode[];
  initialDate?: string;
  initialDraft?: CreateTransactionDraft;
  spaceCurrency: CurrencyCode;
  /**
   * Oculta el selector interactivo de tipo (muestra `type` como una
   * insignia fija) y tiñe el botón de guardar de verde o rojo según `type`
   * en vez del color de la categoría. Solo para el onboarding: en el resto
   * de la app siempre se puede alternar entre gasto e ingreso, y el botón
   * sigue reflejando el color de la categoría elegida.
   */
  hideTypeToggle?: boolean;
  type: TransactionType;
  selectedCategory: Category | null;
  visible: boolean;
  onClose: () => void;
  onOpenCategoryPicker: () => void;
  onSubmit: (draft: CreateTransactionDraft) => void;
  onTypeChange: (type: TransactionType) => void;
};

const defaultRecurrence: {
  value: TransactionRecurrence;
  label: string;
} = { value: 'once', label: 'Único' };

const recurrenceOptions: readonly (typeof defaultRecurrence)[] = [
  defaultRecurrence,
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'custom', label: 'Personalizada' },
];

const keypadRows = [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'subtract'],
  [',', '0', 'backspace', 'add'],
] as const;

const operatorPresentation: Record<
  CalculatorOperator,
  { label: string; symbol: string }
> = {
  divide: { label: 'Dividir', symbol: '÷' },
  multiply: { label: 'Multiplicar', symbol: '×' },
  subtract: { label: 'Restar', symbol: '−' },
  add: { label: 'Sumar', symbol: '+' },
};

/** Referencia estable: un array literal en el valor por defecto se recrearía en cada render. */
const defaultAvailableCurrencies: readonly CurrencyCode[] = [
  defaultCurrencyCode,
];
/** Altura del bloque del importe antes de repartir el espacio sobrante. */
const amountAreaMinHeight = { compact: 64, regular: 88 } as const;
/** Límites visuales que evitan el autoajuste defectuoso de texto en iOS. */
const amountHeroMaxLength = 9;
const amountMaxLength = 13;
/** Separación vertical de las filas del teclado numérico. */
const keypadRowGap = { compact: spacing.md, regular: spacing.lg } as const;
/** Lado del avatar de categoría. */
const categoryIconSize = 44;
/** Anchura compacta del selector; conserva dos objetivos táctiles holgados. */
const typeSelectorWidth = { compact: 216, regular: 240 } as const;
/** Anchura relativa de la columna de operadores; >48 pt en la pantalla más estrecha (320 pt). */
const operatorColumnRatio = 0.72;

export function CreateTransactionModal({
  activeSpaceId,
  availableCurrencies = defaultAvailableCurrencies,
  hideTypeToggle = false,
  initialDate,
  initialDraft,
  onClose,
  onOpenCategoryPicker,
  onSubmit,
  onTypeChange,
  selectedCategory,
  spaceCurrency,
  type,
  visible,
}: CreateTransactionModalProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const styles = useThemedStyles((palette) => createStyles(palette, density));
  const effectiveAvailableCurrencies = useMemo(() => {
    const list = availableCurrencies ?? defaultAvailableCurrencies;
    return list.includes(spaceCurrency) ? list : [spaceCurrency, ...list];
  }, [availableCurrencies, spaceCurrency]);
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('0');
  const [pendingOperations, setPendingOperations] = useState<
    readonly PendingOperationStep[]
  >([]);
  const [replaceAmount, setReplaceAmount] = useState(false);
  const [recurrenceIndex, setRecurrenceIndex] = useState(0);
  const [customOccurrenceDates, setCustomOccurrenceDates] = useState<
    readonly string[]
  >([]);
  const [occurredOn, setOccurredOn] = useState(getLocalTodayKey);
  const [currency, setCurrency] = useState<CurrencyCode>(spaceCurrency);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRecurrencePickerVisible, setRecurrencePickerVisible] =
    useState(false);
  const [isCurrencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [segmentedControlWidth, setSegmentedControlWidth] = useState(0);
  const wasVisible = useRef(false);
  const typeProgress = useSharedValue(type === 'income' ? 1 : 0);
  const amountScale = useSharedValue(1);
  const amountTranslateY = useSharedValue(0);
  const amountMinor = parseAmountMinor(amountInput, currency);
  const recurrence = recurrenceOptions[recurrenceIndex] ?? defaultRecurrence;
  const isCalculationPending = pendingOperations.length > 0;
  const lastPendingOperation =
    pendingOperations[pendingOperations.length - 1] ?? null;
  const activeOperatorPresentation = lastPendingOperation
    ? operatorPresentation[lastPendingOperation.operator]
    : null;
  /** El operando en curso se oculta justo tras elegir un operador, mientras se espera el siguiente número. */
  const showCurrentOperand = !isCalculationPending || !replaceAmount;
  const expressionPrefix = pendingOperations
    .map(
      (step) =>
        `${formatAmountInputForDisplay(amountMinorToInput(step.valueMinor, currency))} ${operatorPresentation[step.operator].symbol}`,
    )
    .join(' ');
  const displayAmount = [
    expressionPrefix,
    showCurrentOperand ? formatAmountInputForDisplay(amountInput) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const amountTextVariant =
    displayAmount.length > amountMaxLength
      ? 'heading'
      : displayAmount.length > amountHeroMaxLength
        ? 'amount'
        : 'amountHero';
  const transactionTone = type === 'income' ? 'income' : 'expense';
  const currencySymbol = getCurrencySymbol(currency);
  const currencySymbolPosition = getCurrencySymbolPosition(currency);
  const currencyPluralName = getCurrencyPluralName(currency);
  const selectedCategoryColor = selectedCategory
    ? categoryColors[selectedCategory.colorToken]
    : null;
  const selectedCategoryContentContrast = selectedCategory
    ? getCategoryContentContrast(selectedCategory.colorToken)
    : null;
  /**
   * Con el tipo fijo (`hideTypeToggle`, solo onboarding) el botón de guardar
   * se tiñe de verde/rojo según el tipo en vez del color de la categoría,
   * para reforzar visualmente si es un ingreso o un gasto.
   */
  const submitGradientColor = hideTypeToggle
    ? type === 'income'
      ? colors.income
      : colors.expense
    : (selectedCategoryColor ?? undefined);
  const submitGradientTextTone = hideTypeToggle
    ? 'onBrand'
    : selectedCategoryContentContrast?.tone;
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(`${occurredOn}T12:00:00`)),
    [occurredOn],
  );

  // Snapshot del borrador: se reinicia solo al abrir el modal o al cambiar de
  // espacio, nunca ante reconstrucciones del catálogo de monedas
  // (desencadenante en creación) ni recargas que cambien la identidad de
  // `initialDraft` (desencadenante en edición). `initialDate` es un primitivo
  // que se captura al abrir y no cambia legítimamente con el modal abierto.
  // El payload se lee de un ref para que su identidad no sea señal de reinicio:
  // mismo contrato que el snapshot de ImportScreen, sin supresión de
  // exhaustive-deps.
  const snapshotRef = useRef({ initialDate, initialDraft, spaceCurrency });

  useEffect(() => {
    snapshotRef.current = { initialDate, initialDraft, spaceCurrency };
  }, [initialDate, initialDraft, spaceCurrency]);

  useEffect(() => {
    if (!visible) return;
    const {
      initialDate: openingDate,
      initialDraft: openingDraft,
      spaceCurrency: openingCurrency,
    } = snapshotRef.current;
    setTitle(openingDraft?.title ?? '');
    setAmountInput(
      openingDraft
        ? amountMinorToInput(
            openingDraft.amountMinor,
            openingDraft.currency ?? openingCurrency,
          )
        : '0',
    );
    setPendingOperations([]);
    setReplaceAmount(false);
    setRecurrenceIndex(
      openingDraft
        ? Math.max(
            recurrenceOptions.findIndex(
              (option) => option.value === openingDraft.recurrence,
            ),
            0,
          )
        : 0,
    );
    setOccurredOn(
      openingDraft?.occurredOn ?? openingDate ?? getLocalTodayKey(),
    );
    setCustomOccurrenceDates(
      openingDraft?.recurrence === 'custom'
        ? (openingDraft.customOccurrenceDates ?? [openingDraft.occurredOn])
        : [],
    );
    setCurrency(openingDraft?.currency ?? openingCurrency);
    setDatePickerVisible(false);
    setRecurrencePickerVisible(false);
    setCurrencyPickerVisible(false);
    setCurrencyError(null);
  }, [visible, activeSpaceId]);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }

    const nextProgress = type === 'income' ? 1 : 0;
    if (!wasVisible.current) {
      wasVisible.current = true;
      typeProgress.value = nextProgress;
      return;
    }

    typeProgress.value = withSpring(nextProgress, {
      ...motion.transactionTypeSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [type, typeProgress, visible]);

  const typeIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: typeProgress.value * (segmentedControlWidth / 2) },
    ],
    width: segmentedControlWidth / 2,
  }));

  const amountAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: amountTranslateY.value },
      { scale: amountScale.value },
    ],
  }));

  const animateAmountInput = () => {
    amountScale.value = withSequence(
      withTiming(0.96, {
        duration: motion.inputPulseDuration,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(1, {
        ...motion.disclosureSpring,
        reduceMotion: ReduceMotion.System,
      }),
    );
    amountTranslateY.value = withSequence(
      withTiming(2, {
        duration: motion.inputPulseDuration,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(0, {
        ...motion.disclosureSpring,
        reduceMotion: ReduceMotion.System,
      }),
    );
  };

  const handleDigit = (key: string) => {
    setAmountInput((current) =>
      appendAmountKey(replaceAmount ? '0' : current, key, currency),
    );
    setReplaceAmount(false);
    animateAmountInput();
  };

  const handleOperator = (operator: CalculatorOperator) => {
    if (replaceAmount && pendingOperations.length > 0) {
      setPendingOperations((current) => {
        const next = [...current];
        next[next.length - 1] = { ...next[next.length - 1]!, operator };
        return next;
      });
      animateAmountInput();
      return;
    }

    setPendingOperations((current) => [
      ...current,
      { valueMinor: amountMinor, operator },
    ]);
    setReplaceAmount(true);
    animateAmountInput();
  };

  const handleBackspace = () => {
    if (
      pendingOperations.length > 0 &&
      (replaceAmount || amountInput === '0')
    ) {
      const lastOperation = pendingOperations[pendingOperations.length - 1]!;
      setAmountInput(amountMinorToInput(lastOperation.valueMinor, currency));
      setPendingOperations((current) => current.slice(0, -1));
      setReplaceAmount(false);
      animateAmountInput();
      return;
    }

    setAmountInput((current) =>
      current.length <= 1 ? '0' : current.slice(0, -1),
    );
    animateAmountInput();
  };

  const handleEquals = () => {
    const result = evaluatePendingOperations(
      pendingOperations,
      amountMinor,
      currency,
    );
    setAmountInput(amountMinorToInput(result, currency));
    setPendingOperations([]);
    setReplaceAmount(true);
    animateAmountInput();
  };

  const handleSubmit = () => {
    if (amountMinor <= 0 || !selectedCategory) {
      return;
    }

    triggerHaptic('transactionSave');

    onSubmit({
      spaceId: activeSpaceId,
      type,
      amountMinor: amountMinor,
      currency,
      title: title.trim(),
      categoryId: selectedCategory.id,
      occurredOn,
      recurrence: recurrence.value,
      customOccurrenceDates:
        recurrence.value === 'custom' ? customOccurrenceDates : undefined,
    });
  };

  const isSubmitDisabled = amountMinor <= 0 || !selectedCategory;
  const primaryActionLabel = isCalculationPending
    ? '='
    : initialDraft
      ? 'Guardar'
      : 'Agregar';
  const primaryActionAccessibilityLabel = isCalculationPending
    ? 'Calcular resultado'
    : initialDraft
      ? 'Guardar cambios'
      : 'Agregar movimiento';

  return (
    <>
      <AppModal
        onClose={onClose}
        testID="create-transaction-modal"
        variant="expanded"
        visible={visible}
      >
        <View
          onStartShouldSetResponderCapture={() => {
            Keyboard.dismiss();
            return false;
          }}
          style={styles.container}
          testID="create-transaction-form"
        >
          <View style={styles.header}>
            {hideTypeToggle ? (
              <View
                style={[
                  styles.lockedTypeBadge,
                  {
                    backgroundColor:
                      type === 'income' ? colors.income : colors.expense,
                  },
                ]}
                testID={`transaction-type-indicator-${type}`}
              >
                <Ionicons
                  color={colors.onBrand}
                  name={type === 'income' ? 'arrow-up' : 'arrow-down'}
                  size={iconSize.sm}
                  style={styles.diagonalArrow}
                />
                <Text tone="onBrand" variant="label" weight="semibold">
                  {type === 'income' ? 'Ingreso' : 'Gasto'}
                </Text>
              </View>
            ) : (
              <View
                accessibilityRole="tablist"
                onLayout={(event) =>
                  setSegmentedControlWidth(event.nativeEvent.layout.width)
                }
                style={styles.segmentedControl}
                testID="transaction-type-selector"
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.segmentIndicator,
                    {
                      backgroundColor:
                        type === 'income' ? colors.income : colors.expense,
                    },
                    typeIndicatorStyle,
                  ]}
                  testID={`transaction-type-indicator-${type}`}
                />
                {(['expense', 'income'] as const).map((option) => {
                  const selected = type === option;
                  const isIncome = option === 'income';
                  return (
                    <Pressable
                      accessibilityLabel={isIncome ? 'Ingreso' : 'Gasto'}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      key={option}
                      onPress={() => onTypeChange(option)}
                      style={({ pressed }) => [
                        styles.segment,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        color={selected ? colors.onBrand : colors.textMuted}
                        name={isIncome ? 'arrow-up' : 'arrow-down'}
                        size={iconSize.sm}
                        style={styles.diagonalArrow}
                      />
                      <Text
                        tone={selected ? 'onBrand' : 'muted'}
                        variant="label"
                        weight="semibold"
                      >
                        {isIncome ? 'Ingreso' : 'Gasto'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <ModalCloseButton onPress={onClose} />
          </View>

          <BottomSheetTextInput
            accessibilityLabel="Título del movimiento"
            maxFontSizeMultiplier={maxFontScale.body}
            maxLength={80}
            onChangeText={setTitle}
            placeholder="Agrega un título"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.titleInput}
            value={title}
          />

          <Animated.View
            accessibilityLabel={
              activeOperatorPresentation
                ? `${displayAmount} ${currencyPluralName}, operación ${activeOperatorPresentation.label} seleccionada`
                : `${displayAmount} ${currencyPluralName}`
            }
            accessibilityLiveRegion="polite"
            style={[styles.amountArea, amountAnimatedStyle]}
            testID="transaction-amount"
          >
            <View style={styles.amountRow}>
              <Text
                numberOfLines={1}
                style={styles.amount}
                testID="transaction-amount-value"
                variant={amountTextVariant}
              >
                {pendingOperations.map((step, index) => {
                  const isLastOperation =
                    index === pendingOperations.length - 1;

                  return (
                    <Text key={index} variant={amountTextVariant}>
                      {formatAmountInputForDisplay(
                        amountMinorToInput(step.valueMinor, currency),
                      )}{' '}
                      <Text
                        testID={
                          isLastOperation
                            ? 'transaction-active-operator'
                            : undefined
                        }
                        tone="primary"
                        variant={amountTextVariant}
                        weight="medium"
                      >
                        {operatorPresentation[step.operator].symbol}
                      </Text>{' '}
                    </Text>
                  );
                })}
                {showCurrentOperand ? (
                  <>
                    {currencySymbolPosition === 'before' ? (
                      <Text
                        testID="transaction-amount-currency"
                        tone={transactionTone}
                        variant={amountTextVariant}
                      >
                        {`${currencySymbol} `}
                      </Text>
                    ) : null}
                    {formatAmountInputForDisplay(amountInput)}
                    {currencySymbolPosition === 'after' ? (
                      <Text
                        testID="transaction-amount-currency"
                        tone={transactionTone}
                        variant={amountTextVariant}
                      >
                        {` ${currencySymbol}`}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.metadataRow} testID="transaction-metadata-row">
            <Pressable
              accessibilityHint="Abre las opciones de fecha"
              accessibilityLabel={`Fecha: ${dateLabel}`}
              accessibilityRole="button"
              onPress={() => setDatePickerVisible(true)}
              style={({ pressed }) => [
                styles.metadataButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textPrimary}
                name="calendar-outline"
                size={iconSize.md}
                testID="transaction-date-icon"
              />
              <Text
                numberOfLines={1}
                style={styles.metadataLabel}
                tone="secondary"
                variant="label"
                weight="semibold"
              >
                {dateLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityHint="Abre las opciones de recurrencia"
              accessibilityLabel={`Recurrencia: ${recurrence.label}`}
              accessibilityRole="button"
              onPress={() => setRecurrencePickerVisible(true)}
              style={({ pressed }) => [
                styles.metadataButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.textPrimary}
                name="sync-outline"
                size={iconSize.md}
                testID="transaction-recurrence-icon"
              />
              <Text
                numberOfLines={1}
                style={styles.metadataLabel}
                tone="secondary"
                variant="label"
                weight="semibold"
              >
                {recurrence.label}
              </Text>
            </Pressable>
            {effectiveAvailableCurrencies.length > 1 ? (
              <Pressable
                accessibilityHint="Abre las opciones de moneda"
                accessibilityLabel={`Moneda: ${currency}`}
                accessibilityRole="button"
                onPress={() => setCurrencyPickerVisible(true)}
                style={({ pressed }) => [
                  styles.metadataButton,
                  pressed && styles.pressed,
                ]}
                testID="transaction-currency-button"
              >
                <Ionicons
                  color={colors.textPrimary}
                  name="cash-outline"
                  size={iconSize.md}
                  testID="transaction-currency-icon"
                />
                <Text
                  numberOfLines={1}
                  style={styles.metadataLabel}
                  tone="secondary"
                  variant="label"
                  weight="semibold"
                >
                  {currency}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.keypad}>
            {keypadRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key) => {
                  const isOperator = key in operatorPresentation;
                  const presentation = isOperator
                    ? operatorPresentation[key as CalculatorOperator]
                    : null;
                  return (
                    <Pressable
                      accessibilityLabel={
                        presentation?.label ??
                        (key === 'backspace' ? 'Borrar' : key)
                      }
                      accessibilityRole="button"
                      key={key}
                      onPress={() => {
                        triggerHaptic('keypadPress');
                        if (presentation) {
                          handleOperator(key as CalculatorOperator);
                        } else if (key === 'backspace') {
                          handleBackspace();
                        } else {
                          handleDigit(key);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.key,
                        isOperator && styles.operatorKey,
                        pressed && styles.keyPressed,
                      ]}
                    >
                      {presentation ? (
                        <Text
                          tone={transactionTone}
                          variant="title"
                          weight="medium"
                        >
                          {presentation.symbol}
                        </Text>
                      ) : key === 'backspace' ? (
                        <Ionicons
                          color={colors.textPrimary}
                          name="backspace-outline"
                          size={iconSize.lg}
                        />
                      ) : (
                        <Text
                          variant={density === 'compact' ? 'heading' : 'title'}
                          weight="medium"
                        >
                          {key}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityLabel={
                selectedCategory
                  ? `Categoría ${selectedCategory.name}`
                  : 'Agregar categoría'
              }
              accessibilityRole="button"
              onPress={onOpenCategoryPicker}
              style={({ pressed }) => [
                styles.categoryButton,
                selectedCategoryColor && {
                  borderColor: selectedCategoryColor,
                },
                pressed && styles.pressed,
              ]}
              testID="transaction-category-button"
            >
              <View
                style={[
                  styles.categoryIcon,
                  selectedCategory && styles.selectedCategoryIcon,
                ]}
                testID="transaction-category-icon"
              >
                {selectedCategory ? (
                  <CategoryIcon
                    color={selectedCategoryColor ?? colors.textSecondary}
                    name={selectedCategory.icon}
                    size={iconSize.md}
                  />
                ) : (
                  <Ionicons
                    color={colors.textSecondary}
                    name="add"
                    size={iconSize.md}
                  />
                )}
              </View>
              <Text
                style={styles.categoryLabel}
                tone="secondary"
                variant="label"
                weight="semibold"
              >
                {selectedCategory?.name ?? 'Agregar categoría'}
              </Text>
              <Ionicons
                color={colors.textSecondary}
                name="chevron-forward"
                size={iconSize.sm}
                testID="transaction-category-chevron"
              />
            </Pressable>
            <ModalPrimaryAction
              accessibilityLabel={primaryActionAccessibilityLabel}
              disabled={isCalculationPending ? false : isSubmitDisabled}
              gradientColor={submitGradientColor}
              gradientTextTone={submitGradientTextTone}
              gradientTestID="transaction-submit-gradient"
              label={primaryActionLabel}
              mutedWhenDisabled
              onPress={isCalculationPending ? handleEquals : handleSubmit}
              style={styles.submitButton}
              testID="transaction-submit-button"
            />
          </View>
        </View>
      </AppModal>

      <TransactionDatePickerModal
        onClose={() => setDatePickerVisible(false)}
        onSelect={(value) => {
          setOccurredOn(value);
          setDatePickerVisible(false);
        }}
        selectedDate={occurredOn}
        visible={isDatePickerVisible}
      />

      <TransactionRecurrencePickerModal
        onClose={() => setRecurrencePickerVisible(false)}
        onSelectRecurrence={(index) => {
          setRecurrenceIndex(index);
          setRecurrencePickerVisible(false);
        }}
        customOccurrenceDates={customOccurrenceDates}
        initialDate={occurredOn}
        onSelectCustomDates={(dates) => {
          setCustomOccurrenceDates(dates);
          setOccurredOn(dates[0] ?? occurredOn);
        }}
        recurrenceIndex={recurrenceIndex}
        visible={isRecurrencePickerVisible}
      />

      <TransactionCurrencyPickerModal
        availableCurrencies={effectiveAvailableCurrencies}
        currency={currency}
        error={currencyError}
        onClose={() => setCurrencyPickerVisible(false)}
        onSelectCurrency={(code) => {
          const error = validateCurrencySwitch(
            currency,
            code,
            amountMinor,
            pendingOperations.map((op) => op.valueMinor),
          );
          if (error) {
            setCurrencyError(error);
            return;
          }
          setCurrencyError(null);
          setCurrency(code);
          setCurrencyPickerVisible(false);
        }}
        visible={isCurrencyPickerVisible}
      />
    </>
  );
}

type TransactionRecurrencePickerModalProps = {
  customOccurrenceDates: readonly string[];
  initialDate: string;
  recurrenceIndex: number;
  visible: boolean;
  onClose: () => void;
  onSelectRecurrence: (index: number) => void;
  onSelectCustomDates: (dates: readonly string[]) => void;
};

function TransactionRecurrencePickerModal({
  customOccurrenceDates,
  initialDate,
  recurrenceIndex,
  visible,
  onClose,
  onSelectRecurrence,
  onSelectCustomDates,
}: TransactionRecurrencePickerModalProps) {
  const [draftRecurrenceIndex, setDraftRecurrenceIndex] =
    useState(recurrenceIndex);
  const [isCustomPickerVisible, setCustomPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftRecurrenceIndex(recurrenceIndex);
      setCustomPickerVisible(false);
    }
  }, [recurrenceIndex, visible]);

  return (
    <>
      <AppModal
        onClose={onClose}
        stackBehavior="push"
        testID="transaction-recurrence-picker"
        visible={visible}
      >
        <View style={optionPickerStyles.container}>
          <View style={optionPickerStyles.header}>
            <ModalCloseButton onPress={onClose} variant="back" />
            <Text accessibilityRole="header" variant="heading">
              Elige la recurrencia
            </Text>
          </View>

          <View accessibilityRole="radiogroup" style={optionPickerStyles.list}>
            {recurrenceOptions.map((option, index) => {
              const selected = index === draftRecurrenceIndex;

              return (
                <SelectableOption
                  accessibilityLabel={option.label}
                  indicatorTestID={`transaction-recurrence-${option.value}-check`}
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setDraftRecurrenceIndex(index);
                    if (option.value === 'custom') {
                      setCustomPickerVisible(true);
                    }
                  }}
                  selected={selected}
                />
              );
            })}
          </View>

          <ModalPrimaryAction
            accessibilityLabel="Guardar recurrencia"
            disabled={
              recurrenceOptions[draftRecurrenceIndex]?.value === 'custom' &&
              customOccurrenceDates.length === 0
            }
            label="Guardar"
            onPress={() => onSelectRecurrence(draftRecurrenceIndex)}
            style={optionPickerStyles.saveButton}
          />
        </View>
      </AppModal>
      <TransactionCustomRecurrenceModal
        initialDate={initialDate}
        onClose={() => setCustomPickerVisible(false)}
        onSelect={(dates) => {
          onSelectCustomDates(dates);
          setDraftRecurrenceIndex(
            recurrenceOptions.findIndex((option) => option.value === 'custom'),
          );
          setCustomPickerVisible(false);
        }}
        selectedDates={customOccurrenceDates}
        visible={isCustomPickerVisible}
      />
    </>
  );
}

function createStyles(colors: ColorTokens, density: LayoutDensity) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      gap: layout.stackGap[density],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    segmentedControl: {
      width: typeSelectorWidth[density],
      height: layout.minTouchTarget,
      flexDirection: 'row',
      borderRadius: radii.lg,
      backgroundColor: colors.keypad,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      minHeight: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      zIndex: 1,
    },
    segmentIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      top: 0,
      borderRadius: radii.lg,
    },
    diagonalArrow: {
      transform: [{ rotate: '45deg' }],
    },
    lockedTypeBadge: {
      height: layout.minTouchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
    },
    titleInput: {
      minHeight: layout.controlHeight[density],
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
    },
    amountArea: {
      minHeight: amountAreaMinHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
    },
    amount: {
      flex: 1,
      textAlign: 'center',
    },
    amountRow: {
      width: '100%',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: layout.controlGap[density],
    },
    metadataButton: {
      minWidth: layout.controlHeight[density],
      height: layout.controlHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radii.round,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    metadataLabel: { flexShrink: 1 },
    keypad: {
      rowGap: keypadRowGap[density],
    },
    keypadRow: {
      flexDirection: 'row',
      columnGap: layout.controlGap[density],
    },
    key: {
      flex: 1,
      height: layout.keypadKeyHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.keypad,
    },
    operatorKey: {
      flex: operatorColumnRatio,
    },
    keyPressed: {
      backgroundColor: colors.surfaceMuted,
      transform: [{ scale: 0.97 }],
    },
    footer: {
      flexDirection: 'row',
      gap: layout.controlGap[density],
    },
    categoryButton: {
      flex: 1.6,
      minWidth: 0,
      minHeight: layout.actionHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radii.md,
      borderColor: colors.border,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    categoryIcon: {
      width: categoryIconSize,
      height: categoryIconSize,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.modalBackground,
    },
    selectedCategoryIcon: {
      backgroundColor: 'transparent',
    },
    categoryLabel: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}

const optionPickerStyles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  saveButton: { marginTop: spacing.md },
});
