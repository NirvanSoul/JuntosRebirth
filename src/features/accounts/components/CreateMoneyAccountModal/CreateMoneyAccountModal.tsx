import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { Text } from '@/components/ui/Text/Text';
import { createStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import { MoneyAccountAppearanceStep } from '@/features/accounts/components/CreateMoneyAccountModal/MoneyAccountAppearanceStep';
import { MoneyAccountDetailsStep } from '@/features/accounts/components/CreateMoneyAccountModal/MoneyAccountDetailsStep';
import { moneyAccountKindDefinitions } from '@/features/accounts/constants/moneyAccountKindDefinitions';
import type {
  CreateMoneyAccountInput,
  MoneyAccount,
  MoneyAccountIconName,
  MoneyAccountKind,
} from '@/features/accounts/types';
import { validateMoneyAccountName } from '@/features/accounts/utils/moneyAccountCatalog';
import {
  parseSignedAmountMinor,
  sanitizeSignedAmountInput,
  signedAmountMinorToInput,
} from '@/features/accounts/utils/signedAmountInput';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CategoryColorToken } from '@/theme/categoryColors';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';
import { useThemedStyles } from '@/theme/useThemedStyles';

type CreateMoneyAccountModalProps = {
  account?: MoneyAccount | null;
  accounts: readonly MoneyAccount[];
  availableCurrencies: readonly CurrencyCode[];
  /**
   * Impide alterar las monedas existentes de una cuenta con movimientos. Si
   * solo tiene una, aún puede añadir una segunda sin reinterpretar importes.
   */
  isCurrencyLocked?: boolean;
  spaceId: string;
  spaceName: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMoneyAccountInput) => void;
};

const defaultKind: MoneyAccountKind = 'bank';

export function CreateMoneyAccountModal({
  account = null,
  accounts,
  availableCurrencies,
  isCurrencyLocked = false,
  spaceId,
  spaceName,
  visible,
  onClose,
  onSubmit,
}: CreateMoneyAccountModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState<'details' | 'appearance'>('details');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<MoneyAccountKind>(defaultKind);
  /** Saldo inicial escrito por moneda, indexado por código. */
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>(
    {},
  );
  const [selectedCurrencies, setSelectedCurrencies] = useState<CurrencyCode[]>(
    [],
  );
  const [icon, setIcon] = useState<MoneyAccountIconName>('bank');
  const [colorToken, setColorToken] = useState<CategoryColorToken>('blue');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const validation = validateMoneyAccountName(
    name,
    accounts,
    spaceId,
    account?.id,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const kindDefinition = moneyAccountKindDefinitions.find(
      (definition) => definition.kind === (account?.kind ?? defaultKind),
    );

    setStep('details');
    setName(account?.name ?? '');
    setKind(account?.kind ?? defaultKind);
    const initialCurrencies = account
      ? account.balances.map((balance) => balance.currency)
      : [availableCurrencies[0] ?? 'EUR'];
    setSelectedCurrencies(initialCurrencies);
    setBalanceInputs(
      Object.fromEntries(
        (account?.balances ?? []).map((balance) => [
          balance.currency,
          signedAmountMinorToInput(balance.openingBalanceMinor),
        ]),
      ),
    );
    setIcon(account?.icon ?? kindDefinition?.icon ?? 'bank');
    setColorToken(account?.colorToken ?? kindDefinition?.colorToken ?? 'blue');
    setHasAttemptedSubmit(false);
  }, [account, availableCurrencies, visible]);

  const handleSelectKind = (nextKind: MoneyAccountKind) => {
    setKind(nextKind);

    // Al crear, el tipo propone aspecto; al editar no se pisa lo ya elegido.
    if (account) {
      return;
    }

    const definition = moneyAccountKindDefinitions.find(
      (candidate) => candidate.kind === nextKind,
    );
    if (definition) {
      setIcon(definition.icon);
      setColorToken(definition.colorToken);
    }
  };

  const handleToggleCurrency = (code: CurrencyCode) => {
    setSelectedCurrencies((current) => {
      const isExistingCurrency = account?.balances.some(
        (balance) => balance.currency === code,
      );

      if (!current.includes(code)) {
        if (
          isCurrencyLocked &&
          (!account || account.balances.length !== 1 || current.length >= 2)
        ) {
          return current;
        }
        return [...current, code];
      }

      if (isCurrencyLocked && isExistingCurrency) return current;
      // Nunca se queda sin ninguna: sin moneda no habría saldo que calcular.
      return current.length === 1
        ? current
        : current.filter((candidate) => candidate !== code);
    });
  };

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    if (validation.valid) setStep('appearance');
  };

  const handleSubmit = () => {
    if (!validation.valid) return;

    const balances =
      isCurrencyLocked && account
        ? [
            ...account.balances,
            ...selectedCurrencies
              .filter(
                (code) =>
                  !account.balances.some(
                    (balance) => balance.currency === code,
                  ),
              )
              .slice(0, account.balances.length === 1 ? 1 : 0)
              .map((currency) => ({
                currency,
                openingBalanceMinor: parseSignedAmountMinor(
                  balanceInputs[currency] ?? '0',
                ),
              })),
          ]
        : selectedCurrencies.map((currency) => ({
            currency,
            openingBalanceMinor: parseSignedAmountMinor(
              balanceInputs[currency] ?? '0',
            ),
          }));

    onSubmit({
      spaceId,
      name: validation.name,
      kind,
      icon,
      colorToken,
      // Las monedas existentes se respetan también aquí, no solo en la
      // interfaz. Una cuenta bloqueada con una sola moneda puede añadir una
      // segunda, cuyo saldo inicial sí procede del formulario.
      balances,
    });
  };

  return (
    <AppModal
      containsScrollable
      onClose={onClose}
      stackBehavior="push"
      testID="create-money-account-modal"
      variant="expanded"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            onPress={step === 'details' ? onClose : () => setStep('details')}
            style={styles.headerButton}
          >
            <Ionicons
              color={colors.textPrimary}
              name="arrow-back"
              size={iconSize.lg}
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" variant="heading">
              {step === 'details'
                ? account
                  ? 'Edita la cuenta'
                  : 'Crea una cuenta'
                : account
                  ? 'Actualiza su estilo'
                  : 'Dale tu estilo'}
            </Text>
            <Text style={styles.subtitle} tone="secondary" variant="label">
              Solo existirá en el espacio {spaceName}.
            </Text>
          </View>
        </View>

        {step === 'details' ? (
          <MoneyAccountDetailsStep
            availableCurrencies={availableCurrencies}
            balanceInputs={balanceInputs}
            existingCurrencies={
              account?.balances.map((balance) => balance.currency) ?? []
            }
            selectedCurrencies={selectedCurrencies}
            hasAttemptedSubmit={hasAttemptedSubmit}
            isCurrencyLocked={isCurrencyLocked}
            kind={kind}
            name={name}
            onChangeBalance={(code, value) =>
              setBalanceInputs((current) => ({
                ...current,
                [code]: sanitizeSignedAmountInput(value),
              }))
            }
            onChangeName={(value) => {
              setName(value);
              setHasAttemptedSubmit(false);
            }}
            onContinue={handleContinue}
            onToggleCurrency={handleToggleCurrency}
            onSelectKind={handleSelectKind}
            styles={styles}
            validation={validation}
          />
        ) : (
          <MoneyAccountAppearanceStep
            colorToken={colorToken}
            icon={icon}
            isEditing={account !== null}
            name={name}
            onSelectColor={setColorToken}
            onSelectIcon={setIcon}
            onSubmit={handleSubmit}
            styles={styles}
          />
        )}
      </View>
    </AppModal>
  );
}
