import type { Icon } from 'phosphor-react-native';
import { Barcode } from 'phosphor-react-native/src/icons/Barcode';
import { Buildings } from 'phosphor-react-native/src/icons/Buildings';
import { DeviceMobile } from 'phosphor-react-native/src/icons/DeviceMobile';
import { LockKey } from 'phosphor-react-native/src/icons/LockKey';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { Vault } from 'phosphor-react-native/src/icons/Vault';

import { CategoryIcon } from '@/features/categories/components/CategoryIcon/CategoryIcon';
import {
  categoryIconNames,
  type CategoryIconName,
} from '@/features/categories/types';
import type { MoneyAccountIconName } from '@/features/accounts/types';

type MoneyAccountIconProps = {
  color: string;
  name: MoneyAccountIconName;
  size?: number;
};

type AccountOnlyIconName = Exclude<MoneyAccountIconName, CategoryIconName>;

const icons: Record<AccountOnlyIconName, Icon> = {
  'device-mobile': DeviceMobile,
  barcode: Barcode,
  buildings: Buildings,
  vault: Vault,
  'lock-key': LockKey,
  'shield-check': ShieldCheck,
};

const categoryIconNameSet = new Set<string>(categoryIconNames);

function isCategoryIconName(
  name: MoneyAccountIconName,
): name is CategoryIconName {
  return categoryIconNameSet.has(name);
}

export function MoneyAccountIcon({
  color,
  name,
  size = 24,
}: MoneyAccountIconProps) {
  if (isCategoryIconName(name)) {
    return <CategoryIcon color={color} name={name} size={size} />;
  }

  const IconComponent = icons[name];

  return <IconComponent color={color} size={size} weight="fill" />;
}
