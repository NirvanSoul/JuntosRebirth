import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Pressable, View } from 'react-native';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { SelectableOption } from '@/components/ui/SelectableOption/SelectableOption';
import { Text } from '@/components/ui/Text/Text';
import type { MoneyAccountModalStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import { moneyAccountKindDefinitions } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type { MoneyAccountKind } from '@/features/accounts/types';
import type { MoneyAccountNameValidation } from '@/features/accounts/utils/moneyAccountCatalog';
import { useLayoutDensity } from '@/hooks/useLayoutDensity';
import { formatAmountInputForDisplay } from '@/lib/currency/amountInput';
import {
  getCurrencyFlag,
  getCurrencyName,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { layout } from '@/theme/layout';
import { maxFontScale } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

type MoneyAccountDetailsStepProps = {
  availableCurrencies: readonly CurrencyCode[];
  balanceInput: string;
  currency: CurrencyCode;
  hasAttemptedSubmit: boolean;
  isCurrencyLocked: boolean;
  isNegativeBalance: boolean;
  kind: MoneyAccountKind;
  name: string;
  styles: MoneyAccountModalStyles;
  validation: MoneyAccountNameValidation;
  onChangeBalance: (value: string) => void;
  onChangeName: (value: string) => void;
  onContinue: () => void;
  onSelectCurrency: (currency: CurrencyCode) => void;
  onSelectKind: (kind: MoneyAccountKind) => void;
  onToggleBalanceSign: () => void;
};

export function MoneyAccountDetailsStep({
  availableCurrencies,
  balanceInput,
  currency,
  hasAttemptedSubmit,
  isCurrencyLocked,
  isNegativeBalance,
  kind,
  name,
  styles,
  validation,
  onChangeBalance,
  onChangeName,
  onContinue,
  onSelectCurrency,
  onSelectKind,
  onToggleBalanceSign,
}: MoneyAccountDetailsStepProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();

  return (
    <View style={styles.step}>
      <BottomSheetScrollView
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        style={styles.stepScroll}
        testID="money-account-details-step"
      >
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
        {hasAttemptedSubmit && !validation.valid && (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.error}
            tone="expense"
            variant="footnote"
          >
            {validation.error}
          </Text>
        )}

        <Text style={styles.sectionTitle} variant="label" weight="semibold">
          Tipo
        </Text>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {moneyAccountKindDefinitions.map((definition) => (
            <SelectableOption
              accessibilityLabel={definition.label}
              indicatorTestID={`money-account-kind-${definition.kind}-check`}
              key={definition.kind}
              label={definition.label}
              onPress={() => onSelectKind(definition.kind)}
              selected={kind === definition.kind}
            />
          ))}
        </View>

        {availableCurrencies.length > 1 ? (
          <>
            <Text style={styles.sectionTitle} variant="label" weight="semibold">
              Moneda
            </Text>
            {isCurrencyLocked ? (
              <Text style={styles.hint} tone="secondary" variant="footnote">
                No se puede cambiar: la cuenta ya tiene movimientos.
              </Text>
            ) : null}
            <View accessibilityRole="radiogroup" style={styles.list}>
              {availableCurrencies.map((code) => (
                <SelectableOption
                  accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
                  disabled={isCurrencyLocked}
                  indicatorTestID={`money-account-currency-${code}-check`}
                  key={code}
                  label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
                  // `SelectableOption` atenúa la opción pero sigue siendo
                  // pulsable, así que la condición se comprueba aquí y no se
                  // delega en el componente.
                  onPress={() => {
                    if (!isCurrencyLocked) onSelectCurrency(code);
                  }}
                  selected={currency === code}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle} variant="label" weight="semibold">
          Saldo inicial
        </Text>
        <View style={styles.balanceRow}>
          <Pressable
            accessibilityLabel={
              isNegativeBalance
                ? 'Saldo inicial negativo'
                : 'Saldo inicial positivo'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: isNegativeBalance }}
            onPress={onToggleBalanceSign}
            style={styles.signButton}
            testID="money-account-balance-sign"
          >
            <Text variant="label" weight="semibold">
              {isNegativeBalance ? '−' : '+'}
            </Text>
          </Pressable>
          <BottomSheetTextInput
            accessibilityLabel="Saldo inicial"
            keyboardType="numeric"
            maxFontSizeMultiplier={maxFontScale.body}
            onChangeText={onChangeBalance}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              styles.balanceInput,
              { minHeight: layout.controlHeight[density] },
            ]}
            value={formatAmountInputForDisplay(balanceInput)}
          />
        </View>
        <Text style={styles.hint} tone="secondary" variant="footnote">
          Es el dinero que ya hay en la cuenta antes de registrar movimientos.
          Puede ser negativo si arrastras una deuda.
        </Text>
      </BottomSheetScrollView>

      <ModalPrimaryAction
        accessibilityLabel="Continuar personalización"
        disabled={!validation.valid}
        label="Continuar"
        onPress={onContinue}
        style={styles.primaryButtonLayout}
      />
    </View>
  );
}
