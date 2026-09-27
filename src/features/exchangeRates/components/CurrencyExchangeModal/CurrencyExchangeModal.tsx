import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { ModalCloseButton } from '@/components/overlays/ModalCloseButton/ModalCloseButton';
import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccount } from '@/features/accounts/types';
import { CurrencyExchangeAmountBlock } from '@/features/exchangeRates/components/CurrencyExchangeModal/CurrencyExchangeAmountBlock';
import { createStyles } from '@/features/exchangeRates/components/CurrencyExchangeModal/CurrencyExchangeModal.styles';
import { RateSourceSelector } from '@/features/exchangeRates/components/RateSourceSelector';
import { useCurrencyExchangeForm } from '@/features/exchangeRates/hooks/useCurrencyExchangeForm';
import type { VenezuelaCurrencyCode } from '@/features/exchangeRates/types';
import {
  sanitizeExchangeAmountInput,
  sanitizeExchangeRateInput,
  type CurrencyExchangeSubmission,
} from '@/features/exchangeRates/utils/currencyExchangeForm';
import { AmountKeypad } from '@/features/transactions/components/AmountKeypad/AmountKeypad';
import { TransactionMoneyAccountPickerModal } from '@/features/transactions/components/CreateTransactionModal/TransactionOptionPickers';
import { useAmountInputPulse } from '@/hooks/useAmountInputPulse';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { iconSize } from '@/theme/layout';
import { motion } from '@/theme/motion';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CurrencyExchangeModalProps = {
  /** Cuentas activas del espacio; sin ninguna no se ofrece elegir cuenta. */
  moneyAccounts: readonly MoneyAccount[];
  visible: boolean;
  onClose: () => void;
  /** Devuelve `true` cuando los dos movimientos quedaron guardados. */
  onSubmit: (submission: CurrencyExchangeSubmission) => Promise<boolean>;
};

/** Media vuelta de la flecha por cada cambio entre compra y venta. */
const halfTurnDegrees = 180;

/** Un solo recorrido para la flecha y para los dos bloques que se cruzan. */
const swapTiming = {
  duration: motion.currencySwapDuration,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
/** La flecha solo gira sobre sí misma, más corta que el cruce de bloques. */
const swapIconTiming = {
  duration: motion.currencySwapIconDuration,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
/** Los bloques se cruzan a mitad de camino: se atenúan para no solaparse. */
const swapCrossOpacity = 0.2;

/** Qué campo recibe las teclas: uno de los dos importes o la tasa. */
type KeypadTarget = VenezuelaCurrencyCode | 'RATE';

/**
 * «Comprar / vender dólares» (Venezuela): una sola interacción que termina en
 * un gasto y un ingreso normales. La persona ve una compra o venta; la app
 * sigue guardando dos movimientos como los de siempre.
 */
export function CurrencyExchangeModal({
  moneyAccounts,
  visible,
  onClose,
  onSubmit,
}: CurrencyExchangeModalProps) {
  const density = useLayoutDensity();
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles((palette) =>
    createStyles(palette, density, shadows),
  );
  const form = useCurrencyExchangeForm({ visible });
  const { dispatch, state } = form;
  const isBuying = state.operation === 'BUY_USD';
  const giveCurrency: VenezuelaCurrencyCode = isBuying ? 'VES' : 'USD';
  const receiveCurrency: VenezuelaCurrencyCode = isBuying ? 'USD' : 'VES';
  const operationColor = isBuying ? colors.income : colors.expense;

  const [target, setTarget] = useState<KeypadTarget>('VES');
  /** Al cambiar de campo, la primera tecla sustituye lo que había. */
  const [replaceOnNextKey, setReplaceOnNextKey] = useState(false);
  const [pickerLeg, setPickerLeg] = useState<VenezuelaCurrencyCode | null>(
    null,
  );
  const [isSubmitting, setSubmitting] = useState(false);
  const usdPulse = useAmountInputPulse();
  const vesPulse = useAmountInputPulse();
  const swapRotation = useSharedValue(0);
  /**
   * 1 justo tras invertir la operación, con cada bloque todavía dibujado en el
   * sitio del otro, y 0 cuando los dos han llegado al suyo.
   */
  const swapProgress = useSharedValue(0);
  /** Distancia real entre los dos bloques, medida en su colocación. */
  const giveOffsetY = useSharedValue(0);
  const receiveOffsetY = useSharedValue(0);
  const swapIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swapRotation.value}deg` }],
  }));
  const swapOpacity = (progress: number) => {
    'worklet';
    return interpolate(progress, [0, 0.5, 1], [1, swapCrossOpacity, 0]);
  };
  const giveSwapStyle = useAnimatedStyle(() => ({
    opacity: swapOpacity(swapProgress.value),
    transform: [
      {
        translateY:
          swapProgress.value * (receiveOffsetY.value - giveOffsetY.value),
      },
    ],
  }));
  const receiveSwapStyle = useAnimatedStyle(() => ({
    opacity: swapOpacity(swapProgress.value),
    transform: [
      {
        translateY:
          swapProgress.value * (giveOffsetY.value - receiveOffsetY.value),
      },
    ],
  }));

  const handleBlockLayout =
    (role: 'give' | 'receive') => (event: LayoutChangeEvent) => {
      // Los `SharedValue` de Reanimated son mutables por diseño.
      const offset = role === 'give' ? giveOffsetY : receiveOffsetY;
      offset.value = event.nativeEvent.layout.y;
    };

  if (useDepsChanged([visible]) && visible) {
    setTarget('VES');
    setReplaceOnNextKey(false);
    setPickerLeg(null);
    setSubmitting(false);
  }

  const inputFor = (currency: VenezuelaCurrencyCode) =>
    currency === 'USD' ? state.usdInput : state.vesInput;
  const accountIdFor = (currency: VenezuelaCurrencyCode) =>
    currency === 'USD' ? state.usdAccountId : state.vesAccountId;
  const accountNameFor = (currency: VenezuelaCurrencyCode) =>
    moneyAccounts.find((account) => account.id === accountIdFor(currency))
      ?.name ?? null;

  const selectTarget = (next: KeypadTarget) => {
    setTarget(next);
    setReplaceOnNextKey(true);
  };

  /**
   * Escribir sobre la tasa de una fuente oficial la convierte en
   * personalizada: parte del valor que se ve, no de un campo vacío.
   */
  const currentTargetValue = () =>
    target === 'RATE' ? form.rateInputValue : inputFor(target);

  const applyKeypadValue = (value: string) => {
    if (target === 'RATE') {
      dispatch({ type: 'editCustomRate', value });
    } else {
      dispatch({ type: 'editAmount', currency: target, value });
    }
  };

  /** El importe escrito acusa la tecla igual que en el modal de movimiento. */
  const pulseTargetAmount = () => {
    if (target === 'RATE') return;
    (target === 'USD' ? usdPulse : vesPulse).pulseAmount();
  };

  const handleDigit = (key: string) => {
    const base = replaceOnNextKey ? '' : currentTargetValue();
    applyKeypadValue(
      target === 'RATE'
        ? sanitizeExchangeRateInput(`${base}${key}`)
        : sanitizeExchangeAmountInput(`${base}${key}`),
    );
    setReplaceOnNextKey(false);
    pulseTargetAmount();
  };

  const handleBackspace = () => {
    applyKeypadValue(currentTargetValue().slice(0, -1));
    setReplaceOnNextKey(false);
    pulseTargetAmount();
  };

  /**
   * La operación cambia al instante y los bloques arrancan dibujados donde
   * estaba el otro, así que el recorrido los lleva a su sitio nuevo.
   */
  const handleSwapOperation = () => {
    dispatch({
      type: 'setOperation',
      operation: isBuying ? 'SELL_USD' : 'BUY_USD',
    });
    // Los `SharedValue` de Reanimated son mutables por diseño.
    swapRotation.value = withTiming(
      swapRotation.value + halfTurnDegrees,
      swapIconTiming,
    );
    // eslint-disable-next-line react-hooks/immutability -- salto previo al recorrido
    swapProgress.value = 1;
    swapProgress.value = withTiming(0, swapTiming);
  };

  const handleSubmit = async () => {
    if (!form.submission || !form.canSubmit || isSubmitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form.submission);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBlock = (
    role: 'give' | 'receive',
    currency: VenezuelaCurrencyCode,
  ) => (
    <CurrencyExchangeAmountBlock
      accountName={accountNameFor(currency)}
      active={target === currency}
      amountPulseStyle={
        (currency === 'USD' ? usdPulse : vesPulse).amountPulseStyle
      }
      currency={currency}
      onLayout={handleBlockLayout(role)}
      onPress={() => selectTarget(currency)}
      onPressAccount={() => setPickerLeg(currency)}
      role={role}
      showAccountButton={moneyAccounts.length > 0}
      styles={styles}
      swapStyle={role === 'give' ? giveSwapStyle : receiveSwapStyle}
      value={inputFor(currency)}
    />
  );

  return (
    <>
      <AppModal
        backgroundVariant="background"
        onClose={onClose}
        testID="currency-exchange-modal"
        variant="expanded"
        visible={visible}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <ModalCloseButton
              onPress={onClose}
              testID="currency-exchange-close-button"
            />
          </View>

          <View style={styles.blocks}>
            {renderBlock('give', giveCurrency)}
            <View style={styles.swapRow}>
              <View style={styles.swapDivider} />
              <Pressable
                accessibilityHint={
                  isBuying ? 'Pasa a vender dólares' : 'Pasa a comprar dólares'
                }
                accessibilityLabel="Intercambiar entregas y recibes"
                accessibilityRole="button"
                hitSlop={iconSize.xs}
                onPress={handleSwapOperation}
                style={({ pressed }) => [
                  styles.swapButton,
                  pressed && styles.pressed,
                ]}
                testID="currency-exchange-swap"
              >
                <Animated.View style={swapIconStyle}>
                  <Ionicons
                    color={colors.textPrimary}
                    name="swap-vertical"
                    size={iconSize.sm}
                  />
                </Animated.View>
              </Pressable>
            </View>
            {renderBlock('receive', receiveCurrency)}
          </View>

          <View style={styles.rateSection}>
            <RateSourceSelector
              availableSources={form.availableSources}
              hideLabel
              onChange={(source) =>
                dispatch({ type: 'selectRateSource', source })
              }
              selectedSource={state.rateSource}
              testID="currency-exchange-rate-source"
            />
            <View style={styles.rateRow}>
              <Text variant="label" weight="medium">
                1 USD =
              </Text>
              <Pressable
                accessibilityHint="Escribe la tasa con el teclado"
                accessibilityLabel={
                  form.rateInputValue
                    ? `Bolívares por dólar: ${form.rateInputValue}`
                    : 'Bolívares por dólar'
                }
                accessibilityRole="button"
                accessibilityState={{ selected: target === 'RATE' }}
                hitSlop={iconSize.xs}
                onPress={() => selectTarget('RATE')}
                style={[
                  styles.rateValue,
                  target === 'RATE' && styles.rateValueActive,
                ]}
                testID="currency-exchange-rate-value"
              >
                <Text
                  tone={form.rateInputValue ? 'primary' : 'muted'}
                  variant="label"
                  weight="semibold"
                >
                  {form.rateInputValue || '0'}
                </Text>
              </Pressable>
              <Text variant="label" weight="medium">
                Bs
              </Text>
            </View>
            {form.rateNotice ? (
              <Text
                accessibilityLiveRegion="polite"
                testID="currency-exchange-rate-notice"
                tone={form.ratesStatus === 'error' ? 'expense' : 'secondary'}
                variant="footnote"
              >
                {form.rateNotice}
              </Text>
            ) : null}
          </View>

          <AmountKeypad
            onBackspace={handleBackspace}
            onDigit={handleDigit}
            style={styles.keypad}
          />

          <ModalPrimaryAction
            accessibilityLabel={
              isBuying
                ? 'Registrar compra de dólares'
                : 'Registrar venta de dólares'
            }
            disabled={!form.canSubmit || isSubmitting}
            gradientColor={operationColor}
            gradientTextTone="onBrand"
            label={
              isSubmitting
                ? 'Guardando…'
                : isBuying
                  ? 'Registrar compra'
                  : 'Registrar venta'
            }
            mutedWhenDisabled
            onPress={() => void handleSubmit()}
            testID="currency-exchange-submit-button"
          />
        </View>
      </AppModal>

      <TransactionMoneyAccountPickerModal
        accounts={moneyAccounts}
        moneyAccountId={pickerLeg ? accountIdFor(pickerLeg) : undefined}
        onClose={() => setPickerLeg(null)}
        onSelectMoneyAccount={(moneyAccountId) => {
          if (pickerLeg) {
            dispatch({
              type: 'setAccount',
              currency: pickerLeg,
              moneyAccountId,
            });
          }
          setPickerLeg(null);
        }}
        visible={pickerLeg !== null}
      />
    </>
  );
}
