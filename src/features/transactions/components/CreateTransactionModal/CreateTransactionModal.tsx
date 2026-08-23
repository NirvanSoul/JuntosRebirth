import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ui/Text/Text';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type {
  CreateTransactionDraft,
  TransactionEditorTarget,
  TransactionType,
} from '@/features/transactions/types';
import {
  amountMinorToInput,
  appendAmountKey,
  applyCalculatorOperation,
  type CalculatorOperator,
  formatAmountInputForDisplay,
  parseAmountMinor,
} from '@/features/transactions/utils/transactionAmount';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { getLocalTodayKey } from '@/lib/date/localDate';
import {
  defaultCurrencyCode,
  getCurrencyFlag,
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
import type { ColorTokens, ThemeShadows } from '@/theme/types';
import { maxFontScale, typography } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import {
  defaultRecurrence,
  recurrenceOptions,
  TransactionCurrencyPickerModal,
  TransactionMoneyAccountPickerModal,
  TransactionRecurrencePickerModal,
} from './TransactionOptionPickers';
import { TransactionDatePickerModal } from './TransactionDatePickerModal';

type CreateTransactionModalProps = {
  activeSpaceId: string;
  availableCurrencies?: readonly CurrencyCode[];
  initialDate?: string;
  initialDraft?: CreateTransactionDraft;
  initialEditor?: TransactionEditorTarget;
  /** Cuentas activas del espacio; sin ninguna, el selector no aparece. */
  moneyAccounts?: readonly MoneyAccount[];
  /** Abre la creación de una cuenta desde el propio selector. */
  onCreateMoneyAccount?: () => void;
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

type PendingOperationStep = {
  valueMinor: number;
  operator: CalculatorOperator;
};

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
/** Referencia estable, por el mismo motivo que el array de monedas. */
const defaultMoneyAccounts: readonly MoneyAccount[] = [];
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
/**
 * Anchura relativa de la columna de operadores.
 *
 * Con márgenes de 16 pt en la pantalla más estrecha admitida (320 pt) la
 * columna sigue midiendo más de 48 pt, el objetivo táctil mínimo.
 */
const operatorColumnRatio = 0.72;

export function CreateTransactionModal({
  activeSpaceId,
  availableCurrencies = defaultAvailableCurrencies,
  hideTypeToggle = false,
  initialDate,
  initialDraft,
  initialEditor,
  moneyAccounts = defaultMoneyAccounts,
  onClose,
  onCreateMoneyAccount,
  onOpenCategoryPicker,
  onSubmit,
  onTypeChange,
  selectedCategory,
  spaceCurrency,
  type,
  visible,
}: CreateTransactionModalProps) {
  const density = useLayoutDensity();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) =>
    createStyles(palette, density, shadows),
  );
  const effectiveAvailableCurrencies = useMemo(() => {
    const list = availableCurrencies ?? defaultAvailableCurrencies;
    return list.includes(spaceCurrency) ? list : [spaceCurrency, ...list];
  }, [availableCurrencies, spaceCurrency]);
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('0');
  const [hasEnteredAmount, setHasEnteredAmount] = useState(false);
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
  const [moneyAccountId, setMoneyAccountId] = useState<string | undefined>(
    undefined,
  );
  const [isMoneyAccountPickerVisible, setMoneyAccountPickerVisible] =
    useState(false);
  const openedInitialEditor = useRef<TransactionEditorTarget | undefined>(
    undefined,
  );
  const amountScale = useSharedValue(1);
  const amountTranslateY = useSharedValue(0);
  const amountCursorOpacity = useSharedValue(1);
  const amountMinor = parseAmountMinor(amountInput);
  const recurrence = recurrenceOptions[recurrenceIndex] ?? defaultRecurrence;
  const isCalculationPending = pendingOperations.length > 0;
  const lastPendingOperation =
    pendingOperations[pendingOperations.length - 1] ?? null;
  const activeOperatorPresentation = lastPendingOperation
    ? operatorPresentation[lastPendingOperation.operator]
    : null;
  /** El operando en curso se oculta justo tras elegir un operador, mientras se espera el siguiente número. */
  const showCurrentOperand = !isCalculationPending || !replaceAmount;
  const isAmountEmpty = !hasEnteredAmount && pendingOperations.length === 0;
  const expressionPrefix = pendingOperations
    .map(
      (step) =>
        `${formatAmountInputForDisplay(amountMinorToInput(step.valueMinor))} ${operatorPresentation[step.operator].symbol}`,
    )
    .join(' ');
  const resolvedAmountMinor = amountMinor;
  const displayAmount = isAmountEmpty
    ? ''
    : [
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
  const selectableMoneyAccounts = useMemo(
    () =>
      moneyAccounts.filter(
        (account) => account.spaceId === activeSpaceId && !account.isArchived,
      ),
    [activeSpaceId, moneyAccounts],
  );
  /**
   * Puede ser una cuenta ya archivada si se está editando un movimiento
   * antiguo: el botón debe seguir nombrándola aunque no se pueda elegir.
   */
  const selectedMoneyAccount = useMemo(
    () => moneyAccounts.find((account) => account.id === moneyAccountId),
    [moneyAccountId, moneyAccounts],
  );
  /**
   * La moneda solo se elige cuando hay más de una y ninguna cuenta la fija:
   * con cuenta elegida es la suya, y cambiarla dejaría el importe fuera de
   * su saldo.
   */
  const isCurrencySelectable =
    effectiveAvailableCurrencies.length > 1 && !selectedMoneyAccount;
  const currencyFlag = getCurrencyFlag(currency);
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

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    setTitle(initialDraft?.title ?? '');
    setAmountInput(
      initialDraft ? amountMinorToInput(initialDraft.amountMinor) : '0',
    );
    setHasEnteredAmount(Boolean(initialDraft?.amountMinor));
    setPendingOperations([]);
    setReplaceAmount(false);
    setRecurrenceIndex(
      initialDraft
        ? Math.max(
            recurrenceOptions.findIndex(
              (option) => option.value === initialDraft.recurrence,
            ),
            0,
          )
        : 0,
    );
    setOccurredOn(
      initialDraft?.occurredOn ?? initialDate ?? getLocalTodayKey(),
    );
    setCustomOccurrenceDates(
      initialDraft?.recurrence === 'custom'
        ? (initialDraft.customOccurrenceDates ?? [initialDraft.occurredOn])
        : [],
    );
    setCurrency(initialDraft?.currency ?? spaceCurrency);
    setMoneyAccountId(initialDraft?.moneyAccountId);
    setDatePickerVisible(false);
    setRecurrencePickerVisible(false);
    setCurrencyPickerVisible(false);
    setMoneyAccountPickerVisible(false);
  }, [
    activeSpaceId,
    effectiveAvailableCurrencies,
    initialDate,
    initialDraft,
    spaceCurrency,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      openedInitialEditor.current = undefined;
      return;
    }
    if (!initialEditor || openedInitialEditor.current === initialEditor) {
      return;
    }

    openedInitialEditor.current = initialEditor;
    if (initialEditor === 'category') {
      onOpenCategoryPicker();
    } else if (initialEditor === 'date') {
      setDatePickerVisible(true);
    } else if (initialEditor === 'recurrence') {
      setRecurrencePickerVisible(true);
    } else if (initialEditor === 'currency') {
      setCurrencyPickerVisible(true);
    } else {
      setMoneyAccountPickerVisible(true);
    }
  }, [initialEditor, onOpenCategoryPicker, visible]);

  const amountAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: amountTranslateY.value },
      { scale: amountScale.value },
    ],
  }));

  const amountCursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: amountCursorOpacity.value,
  }));

  useEffect(() => {
    if (!visible || !isAmountEmpty) {
      amountCursorOpacity.value = 1;
      return;
    }

    amountCursorOpacity.value = withRepeat(
      withTiming(0.24, {
        duration: 680,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [amountCursorOpacity, isAmountEmpty, visible]);

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
    setHasEnteredAmount(true);
    setAmountInput((current) =>
      appendAmountKey(replaceAmount ? '0' : current, key),
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
      setAmountInput(amountMinorToInput(lastOperation.valueMinor));
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

  const evaluateExpression = (): number => {
    if (pendingOperations.length === 0) {
      return amountMinor;
    }

    let accumulator = pendingOperations[0]!.valueMinor;
    for (let index = 1; index < pendingOperations.length; index += 1) {
      accumulator = applyCalculatorOperation(
        accumulator,
        pendingOperations[index]!.valueMinor,
        pendingOperations[index - 1]!.operator,
      );
    }

    return applyCalculatorOperation(
      accumulator,
      amountMinor,
      pendingOperations[pendingOperations.length - 1]!.operator,
    );
  };

  const handleEquals = () => {
    const result = evaluateExpression();
    setHasEnteredAmount(true);
    setAmountInput(amountMinorToInput(result));
    setPendingOperations([]);
    setReplaceAmount(true);
    animateAmountInput();
  };

  const handleSubmit = () => {
    if (resolvedAmountMinor <= 0 || !selectedCategory) {
      return;
    }

    triggerHaptic('transactionSave');

    onSubmit({
      spaceId: activeSpaceId,
      type,
      amountMinor: resolvedAmountMinor,
      currency,
      title: title.trim(),
      categoryId: selectedCategory.id,
      moneyAccountId,
      occurredOn,
      recurrence: recurrence.value,
      customOccurrenceDates:
        recurrence.value === 'custom' ? customOccurrenceDates : undefined,
    });
  };

  const isSubmitDisabled = resolvedAmountMinor <= 0 || !selectedCategory;
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
                <View style={styles.diagonalArrow}>
                  <Ionicons
                    color={colors.onBrand}
                    name={type === 'income' ? 'arrow-up' : 'arrow-down'}
                    size={iconSize.sm}
                  />
                </View>
                <Text tone="onBrand" variant="label" weight="semibold">
                  {type === 'income' ? 'Ingreso' : 'Gasto'}
                </Text>
              </View>
            ) : (
              <SegmentedControl
                indicatorColor={
                  type === 'income' ? colors.income : colors.expense
                }
                indicatorTestID={`transaction-type-indicator-${type}`}
                onChange={onTypeChange}
                options={[
                  {
                    icon: 'arrow-down',
                    iconRotation: '45deg',
                    iconTestID: 'transaction-type-arrow-expense',
                    label: 'Gasto',
                    value: 'expense',
                  },
                  {
                    icon: 'arrow-up',
                    iconRotation: '45deg',
                    iconTestID: 'transaction-type-arrow-income',
                    label: 'Ingreso',
                    value: 'income',
                  },
                ]}
                selectedIconColor={colors.onBrand}
                selectedTextTone="onBrand"
                selectedValue={type}
                style={styles.segmentedControl}
                testID="transaction-type-selector"
                unselectedIconColor={colors.textMuted}
                unselectedTextTone="muted"
              />
            )}
            <ModalCloseButton onPress={onClose} />
          </View>

          <View style={styles.titleRow} testID="transaction-title-row">
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
            {isCurrencySelectable ? (
              <Pressable
                accessibilityHint="Abre las opciones de moneda"
                accessibilityLabel={`Moneda: ${currency}`}
                accessibilityRole="button"
                onPress={() => setCurrencyPickerVisible(true)}
                style={({ pressed }) => [
                  styles.currencyButton,
                  pressed && styles.pressed,
                ]}
                testID="transaction-currency-button"
              >
                <Text testID="transaction-currency-flag" variant="subheading">
                  {currencyFlag}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Animated.View
            accessibilityLabel={
              isAmountEmpty
                ? 'Introduce un importe'
                : activeOperatorPresentation
                  ? `${displayAmount} ${currencyPluralName}, operación ${activeOperatorPresentation.label} seleccionada`
                  : `${displayAmount} ${currencyPluralName}`
            }
            accessibilityLiveRegion="polite"
            style={[styles.amountArea, amountAnimatedStyle]}
            testID="transaction-amount"
          >
            {isAmountEmpty ? (
              <Animated.View
                style={[
                  styles.amountCursor,
                  { backgroundColor: colors[transactionTone] },
                  amountCursorAnimatedStyle,
                ]}
                testID="transaction-amount-cursor"
              />
            ) : (
              <View style={styles.amountRow}>
                <Text
                  numberOfLines={1}
                  style={styles.amount}
                  testID="transaction-amount-value"
                  variant={amountTextVariant}
                  weight="medium"
                >
                  {pendingOperations.map((step, index) => {
                    const isLastOperation =
                      index === pendingOperations.length - 1;

                    return (
                      <Text key={index} variant={amountTextVariant}>
                        {formatAmountInputForDisplay(
                          amountMinorToInput(step.valueMinor),
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
                          weight="medium"
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
                          weight="medium"
                        >
                          {` ${currencySymbol}`}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </Text>
              </View>
            )}
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
            <View
              style={styles.metadataDivider}
              testID="transaction-metadata-date-divider"
            />
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
            {selectableMoneyAccounts.length > 0 ? (
              <>
                <View
                  style={styles.metadataDivider}
                  testID="transaction-metadata-account-divider"
                />
                <Pressable
                  accessibilityHint="Elige la cuenta del movimiento"
                  accessibilityLabel={
                    selectedMoneyAccount
                      ? `Cuenta: ${selectedMoneyAccount.name}`
                      : 'Cuenta: ninguna'
                  }
                  accessibilityRole="button"
                  onPress={() => setMoneyAccountPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.metadataButton,
                    pressed && styles.pressed,
                  ]}
                  testID="transaction-money-account-button"
                >
                  <Ionicons
                    color={colors.textPrimary}
                    name="wallet-outline"
                    size={iconSize.md}
                    testID="transaction-money-account-icon"
                  />
                  <Text
                    numberOfLines={1}
                    style={styles.metadataLabel}
                    tone="secondary"
                    variant="label"
                    weight="semibold"
                  >
                    {selectedMoneyAccount?.name ?? 'Cuenta'}
                  </Text>
                </Pressable>
              </>
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
                        <Text tone="primary" variant="title" weight="medium">
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
                !selectedCategory && styles.categoryButtonCta,
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
                  !selectedCategory && styles.categoryIconCta,
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
                    color={colors.onBrand}
                    name="add"
                    size={iconSize.md}
                  />
                )}
              </View>
              <Text
                style={styles.categoryLabel}
                tone={selectedCategory ? 'secondary' : 'onBrand'}
                variant="label"
                weight="semibold"
              >
                {selectedCategory?.name ?? 'Agregar categoría'}
              </Text>
              <Ionicons
                color={selectedCategory ? colors.textSecondary : colors.onBrand}
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
        onClose={() => setCurrencyPickerVisible(false)}
        onSelectCurrency={(code) => {
          setCurrency(code);
          setCurrencyPickerVisible(false);
        }}
        visible={isCurrencyPickerVisible}
      />

      <TransactionMoneyAccountPickerModal
        accounts={selectableMoneyAccounts}
        moneyAccountId={moneyAccountId}
        onClose={() => setMoneyAccountPickerVisible(false)}
        onCreateMoneyAccount={onCreateMoneyAccount}
        onSelectMoneyAccount={(selectedId) => {
          setMoneyAccountId(selectedId);
          const account = selectedId
            ? selectableMoneyAccounts.find(
                (candidate) => candidate.id === selectedId,
              )
            : undefined;
          // Una cuenta adopta una moneda con saldo inicial cero al registrar
          // su primer movimiento en ella. Sin cuenta vuelve la del espacio.
          if (!account) {
            setCurrency(spaceCurrency);
          }
          setMoneyAccountPickerVisible(false);
        }}
        visible={isMoneyAccountPickerVisible}
      />
    </>
  );
}

function createStyles(
  colors: ColorTokens,
  density: LayoutDensity,
  shadows: ThemeShadows,
) {
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: layout.controlGap[density],
    },
    titleInput: {
      ...shadows.subtle,
      flex: 1,
      minHeight: layout.controlHeight[density],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      letterSpacing: typography.body.letterSpacing,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.none,
      textAlignVertical: 'center',
    },
    currencyButton: {
      ...shadows.subtle,
      width: layout.controlHeight[density],
      height: layout.controlHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.round,
      backgroundColor: colors.surface,
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
    amountCursor: {
      width: spacing.xxs,
      height: spacing.xxxl,
      borderRadius: radii.round,
    },
    metadataRow: {
      ...shadows.subtle,
      height: layout.controlHeight[density],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    metadataButton: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    metadataLabel: { flexShrink: 1 },
    metadataDivider: {
      width: StyleSheet.hairlineWidth,
      height: layout.controlHeight[density] - spacing.xl,
      backgroundColor: colors.border,
    },
    keypad: {
      rowGap: keypadRowGap[density],
    },
    keypadRow: {
      flexDirection: 'row',
      columnGap: layout.controlGap[density],
    },
    key: {
      ...shadows.subtle,
      flex: 1,
      height: layout.keypadKeyHeight[density],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.surface,
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
    categoryButtonCta: {
      borderColor: colors.cta,
      backgroundColor: colors.cta,
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
    categoryIconCta: {
      backgroundColor: 'transparent',
    },
    categoryLabel: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
    },
    pressed: { opacity: 0.72 },
  });
}
