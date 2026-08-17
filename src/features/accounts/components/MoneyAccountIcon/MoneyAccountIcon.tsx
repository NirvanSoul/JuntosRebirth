import type { Icon } from 'phosphor-react-native';
import { Bank } from 'phosphor-react-native/src/icons/Bank';
import { Buildings } from 'phosphor-react-native/src/icons/Buildings';
import { Coins } from 'phosphor-react-native/src/icons/Coins';
import { CreditCard } from 'phosphor-react-native/src/icons/CreditCard';
import { CurrencyCircleDollar } from 'phosphor-react-native/src/icons/CurrencyCircleDollar';
import { HandCoins } from 'phosphor-react-native/src/icons/HandCoins';
import { Money } from 'phosphor-react-native/src/icons/Money';
import { PiggyBank } from 'phosphor-react-native/src/icons/PiggyBank';
import { Vault } from 'phosphor-react-native/src/icons/Vault';
import { Wallet } from 'phosphor-react-native/src/icons/Wallet';

import type { MoneyAccountIconName } from '@/features/accounts/types';

type MoneyAccountIconProps = {
  color: string;
  name: MoneyAccountIconName;
  size?: number;
};

const icons: Record<MoneyAccountIconName, Icon> = {
  wallet: Wallet,
  bank: Bank,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  money: Money,
  coins: Coins,
  vault: Vault,
  'hand-coins': HandCoins,
  'currency-circle-dollar': CurrencyCircleDollar,
  buildings: Buildings,
};

export function MoneyAccountIcon({
  color,
  name,
  size = 24,
}: MoneyAccountIconProps) {
  const IconComponent = icons[name];

  return <IconComponent color={color} size={size} weight="fill" />;
}
