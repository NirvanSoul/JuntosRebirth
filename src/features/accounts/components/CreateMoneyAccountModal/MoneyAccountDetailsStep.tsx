import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Platform, View } from 'react-native';

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
  /** Saldo inicial escrito por moneda, indexado por código. */
  balanceInputs: Record<string, string>;
  /** Monedas ya guardadas antes de abrir la edición. */
  existingCurrencies: readonly CurrencyCode[];
  selectedCurrencies: readonly CurrencyCode[];
  hasAttemptedSubmit: boolean;
  isCurrencyLocked: boolean;
  kind: MoneyAccountKind;
  name: string;
  styles: MoneyAccountModalStyles;
  validation: MoneyAccountNameValidation;
  onChangeBalance: (currency: CurrencyCode, value: string) => void;
  onChangeName: (value: string) => void;
  onContinue: () => void;
  onToggleCurrency: (currency: CurrencyCode) => void;
  onSelectKind: (kind: MoneyAccountKind) => void;
};

type CurrencyOptionProps = {
  canAddSecondCurrency: boolean;
  code: CurrencyCode;
  existingCurrencies: readonly CurrencyCode[];
  isCurrencyLocked: boolean;
  onToggleCurrency: (currency: CurrencyCode) => void;
  selected: boolean;
};

function CurrencyOption({
  canAddSecondCurrency,
  code,
  existingCurrencies,
  isCurrencyLocked,
  onToggleCurrency,
  selected,
}: CurrencyOptionProps) {
  const isExistingCurrency = existingCurrencies.includes(code);
  const canToggle =
    !isCurrencyLocked ||
    (!isExistingCurrency && (selected || canAddSecondCurrency));

  return (
    <SelectableOption
      accessibilityLabel={`${getCurrencyFlag(code)} ${getCurrencyName(code)} (${code})`}
      disabled={!canToggle}
      indicatorTestID={`money-account-currency-${code}-check`}
      label={`${getCurrencyFlag(code)}  ${getCurrencyName(code)} · ${code}`}
      // `SelectableOption` atenúa la opción pero sigue siendo pulsable, así
      // que la condición se comprueba aquí y no se delega en el componente.
      onPress={() => {
        if (canToggle) onToggleCurrency(code);
      }}
      role="checkbox"
      selected={selected}
    />
  );
}

export function MoneyAccountDetailsStep({
  availableCurrencies,
  balanceInputs,
  existingCurrencies,
  selectedCurrencies,
  hasAttemptedSubmit,
  isCurrencyLocked,
  kind,
  name,
  styles,
  validation,
  onChangeBalance,
  onChangeName,
  onContinue,
  onToggleCurrency,
  onSelectKind,
}: MoneyAccountDetailsStepProps) {
  const density = useLayoutDensity();
  const { colors } = useTheme();
  const canAddSecondCurrency =
    isCurrencyLocked &&
    existingCurrencies.length === 1 &&
    selectedCurrencies.length < 2;

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
        <View accessibilityRole="radiogroup" style={styles.kindRow}>
          {moneyAccountKindDefinitions.map((definition) => (
            <SelectableOption
              accessibilityLabel={definition.label}
              compact
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
              Monedas
            </Text>
            {isCurrencyLocked ? (
              <Text style={styles.hint} tone="secondary" variant="footnote">
                {existingCurrencies.length === 1
                  ? 'La moneda original no se puede cambiar porque ya tiene movimientos. Puedes añadir una segunda moneda.'
                  : 'No se pueden cambiar: la cuenta ya tiene movimientos.'}
              </Text>
            ) : (
              <Text style={styles.hint} tone="secondary" variant="footnote">
                Marca todas las que guarde esta cuenta. Cada una lleva su propio
                saldo.
              </Text>
            )}
            <View accessibilityRole="radiogroup" style={styles.list}>
              {availableCurrencies.map((code) => (
                <CurrencyOption
                  canAddSecondCurrency={canAddSecondCurrency}
                  code={code}
                  existingCurrencies={existingCurrencies}
                  isCurrencyLocked={isCurrencyLocked}
                  key={code}
                  onToggleCurrency={onToggleCurrency}
                  selected={selectedCurrencies.includes(code)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle} variant="label" weight="semibold">
          Saldo inicial (opcional)
        </Text>
        {selectedCurrencies.map((code) => (
          <View key={code} style={styles.balanceField}>
            {selectedCurrencies.length > 1 ? (
              <Text tone="secondary" variant="caption">
                {getCurrencyName(code)} · {code}
              </Text>
            ) : null}
            <BottomSheetTextInput
              accessibilityLabel={
                selectedCurrencies.length > 1
                  ? `Saldo inicial en ${code}`
                  : 'Saldo inicial'
              }
              // El signo menos tiene que estar al alcance en las dos
              // plataformas. `numbers-and-punctuation` solo existe en iOS; el
              // teclado numérico de Android no ofrece el signo, así que allí
              // se usa el normal.
              keyboardType={
                Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'
              }
              maxFontSizeMultiplier={maxFontScale.body}
              editable={!isCurrencyLocked || !existingCurrencies.includes(code)}
              onChangeText={(value) => onChangeBalance(code, value)}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { minHeight: layout.controlHeight[density] },
              ]}
              value={formatAmountInputForDisplay(balanceInputs[code] ?? '0')}
            />
          </View>
        ))}
        <Text style={styles.hint} tone="secondary" variant="footnote">
          Es el dinero que ya hay en la cuenta antes de registrar movimientos.
          Escribe un signo menos delante si arrastras una deuda.
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
