import type { Icon } from 'phosphor-react-native';
import { Bank } from 'phosphor-react-native/src/icons/Bank';
import { Barcode } from 'phosphor-react-native/src/icons/Barcode';
import { Buildings } from 'phosphor-react-native/src/icons/Buildings';
import { Calculator } from 'phosphor-react-native/src/icons/Calculator';
import { Cardholder } from 'phosphor-react-native/src/icons/Cardholder';
import { CashRegister } from 'phosphor-react-native/src/icons/CashRegister';
import { Coins } from 'phosphor-react-native/src/icons/Coins';
import { CreditCard } from 'phosphor-react-native/src/icons/CreditCard';
import { DeviceMobile } from 'phosphor-react-native/src/icons/DeviceMobile';
import { HandCoins } from 'phosphor-react-native/src/icons/HandCoins';
import { LockKey } from 'phosphor-react-native/src/icons/LockKey';
import { Money } from 'phosphor-react-native/src/icons/Money';
import { PiggyBank } from 'phosphor-react-native/src/icons/PiggyBank';
import { Phone } from 'phosphor-react-native/src/icons/Phone';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { ChartLineUp } from 'phosphor-react-native/src/icons/ChartLineUp';
import { TrendUp } from 'phosphor-react-native/src/icons/TrendUp';
import { Vault } from 'phosphor-react-native/src/icons/Vault';
import { Wallet } from 'phosphor-react-native/src/icons/Wallet';

import type { MoneyAccountIconName } from '@/features/accounts/types';

type MoneyAccountIconProps = {
  color: string;
  name: MoneyAccountIconName;
  size?: number;
};

const icons: Record<MoneyAccountIconName, Icon> = {
  money: Money,
  coins: Coins,
  'hand-coins': HandCoins,
  'cash-register': CashRegister,
  calculator: Calculator,
  receipt: Receipt,
  'credit-card': CreditCard,
  cardholder: Cardholder,
  wallet: Wallet,
  'device-mobile': DeviceMobile,
  phone: Phone,
  barcode: Barcode,
  bank: Bank,
  buildings: Buildings,
  vault: Vault,
  'piggy-bank': PiggyBank,
  'lock-key': LockKey,
  'shield-check': ShieldCheck,
  'chart-line-up': ChartLineUp,
  'trend-up': TrendUp,
};

export function MoneyAccountIcon({
  color,
  name,
  size = 24,
}: MoneyAccountIconProps) {
  const IconComponent = icons[name];

  return <IconComponent color={color} size={size} weight="fill" />;
}
