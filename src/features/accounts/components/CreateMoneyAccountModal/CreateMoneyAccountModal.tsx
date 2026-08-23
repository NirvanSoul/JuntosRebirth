import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

import { AppModal } from '@/components/overlays/AppModal/AppModal';
import { Text } from '@/components/ui/Text/Text';
import { createStyles } from '@/features/accounts/components/CreateMoneyAccountModal/CreateMoneyAccountModal.styles';
import { MoneyAccountAppearanceStep } from '@/features/accounts/components/CreateMoneyAccountModal/MoneyAccountAppearanceStep';
import { MoneyAccountDetailsStep } from '@/features/accounts/components/CreateMoneyAccountModal/MoneyAccountDetailsStep';
import { MoneyAccountNameStep } from '@/features/accounts/components/CreateMoneyAccountModal/MoneyAccountNameStep';
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
  /** Moneda con la que siempre nace una cuenta nueva. */
  spaceCurrency: CurrencyCode;
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
  spaceCurrency,
  spaceName,
  visible,
  onClose,
  onSubmit,
}: CreateMoneyAccountModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState<'name' | 'details' | 'appearance'>('name');
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
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const validation = validateMoneyAccountName(
    name,
    accounts,
    spaceId,
    account?.id,
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
      return;
    }

    const kindDefinition = moneyAccountKindDefinitions.find(
      (definition) => definition.kind === (account?.kind ?? defaultKind),
    );

    setStep('name');
    setName(account?.name ?? '');
    setKind(account?.kind ?? defaultKind);
    const initialCurrencies = account
      ? account.balances.map((balance) => balance.currency)
      : [spaceCurrency];
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
  }, [account, spaceCurrency, visible]);

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

  const handleContinueName = () => {
    setHasAttemptedSubmit(true);
    if (validation.valid) setStep('details');
  };

  const handleContinueDetails = () => setStep('appearance');

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
            onPress={() => {
              if (step === 'name') onClose();
              else if (step === 'details') setStep('name');
              else setStep('details');
            }}
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
              {step === 'name'
                ? account
                  ? 'Edita la cuenta'
                  : 'Nombra tu cuenta'
                : step === 'details'
                  ? 'Elige el tipo de cuenta'
                  : account
                    ? 'Actualiza su estilo'
                    : 'Dale tu estilo'}
            </Text>
            <Text style={styles.subtitle} tone="secondary" variant="label">
              Solo existirá en el espacio {spaceName}.
            </Text>
          </View>
        </View>

        {step === 'name' ? (
          <MoneyAccountNameStep
            hasAttemptedSubmit={hasAttemptedSubmit}
            isKeyboardVisible={isKeyboardVisible}
            name={name}
            onChangeName={(value) => {
              setName(value);
              setHasAttemptedSubmit(false);
            }}
            onContinue={handleContinueName}
            styles={styles}
            validation={validation}
          />
        ) : step === 'details' ? (
          <MoneyAccountDetailsStep
            allowCurrencySelection={account !== null}
            availableCurrencies={availableCurrencies}
            balanceInputs={balanceInputs}
            existingCurrencies={
              account?.balances.map((balance) => balance.currency) ?? []
            }
            selectedCurrencies={selectedCurrencies}
            isCurrencyLocked={isCurrencyLocked}
            kind={kind}
            onChangeBalance={(code, value) =>
              setBalanceInputs((current) => ({
                ...current,
                [code]: sanitizeSignedAmountInput(value),
              }))
            }
            onContinue={handleContinueDetails}
            onToggleCurrency={handleToggleCurrency}
            onSelectKind={handleSelectKind}
            styles={styles}
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
