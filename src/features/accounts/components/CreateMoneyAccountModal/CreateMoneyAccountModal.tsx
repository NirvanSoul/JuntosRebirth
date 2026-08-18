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
   * Impide cambiar la moneda de una cuenta que ya tiene movimientos: hacerlo
   * reinterpretaría importes ya registrados.
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
  const [currency, setCurrency] = useState<CurrencyCode>(
    availableCurrencies[0] ?? 'EUR',
  );
  const [balanceInput, setBalanceInput] = useState('0');
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
    setCurrency(account?.currency ?? availableCurrencies[0] ?? 'EUR');
    setBalanceInput(
      signedAmountMinorToInput(account?.openingBalanceMinor ?? 0),
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

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    if (validation.valid) setStep('appearance');
  };

  const handleSubmit = () => {
    if (!validation.valid) return;

    onSubmit({
      spaceId,
      name: validation.name,
      kind,
      icon,
      colorToken,
      // La moneda bloqueada se respeta también aquí, no solo en la interfaz.
      currency: isCurrencyLocked ? (account?.currency ?? currency) : currency,
      openingBalanceMinor: parseSignedAmountMinor(balanceInput),
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
            balanceInput={balanceInput}
            currency={currency}
            hasAttemptedSubmit={hasAttemptedSubmit}
            isCurrencyLocked={isCurrencyLocked}
            kind={kind}
            name={name}
            onChangeBalance={(value) =>
              setBalanceInput(sanitizeSignedAmountInput(value))
            }
            onChangeName={(value) => {
              setName(value);
              setHasAttemptedSubmit(false);
            }}
            onContinue={handleContinue}
            onSelectCurrency={setCurrency}
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
