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

export function MoneyAccountDetailsStep({
  availableCurrencies,
  balanceInputs,
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
              style={styles.kindOption}
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
                No se pueden cambiar: la cuenta ya tiene movimientos.
              </Text>
            ) : (
              <Text style={styles.hint} tone="secondary" variant="footnote">
                Marca todas las que guarde esta cuenta. Cada una lleva su propio
                saldo.
              </Text>
            )}
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
                    if (!isCurrencyLocked) onToggleCurrency(code);
                  }}
                  role="checkbox"
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
