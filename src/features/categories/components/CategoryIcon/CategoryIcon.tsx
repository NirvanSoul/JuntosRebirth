import type { Icon } from 'phosphor-react-native';
import { AirplaneTilt } from 'phosphor-react-native/src/icons/AirplaneTilt';
import { Briefcase } from 'phosphor-react-native/src/icons/Briefcase';
import { Car } from 'phosphor-react-native/src/icons/Car';
import { CreditCard } from 'phosphor-react-native/src/icons/CreditCard';
import { DotsThreeCircle } from 'phosphor-react-native/src/icons/DotsThreeCircle';
import { ForkKnife } from 'phosphor-react-native/src/icons/ForkKnife';
import { GameController } from 'phosphor-react-native/src/icons/GameController';
import { GraduationCap } from 'phosphor-react-native/src/icons/GraduationCap';
import { Heartbeat } from 'phosphor-react-native/src/icons/Heartbeat';
import { House } from 'phosphor-react-native/src/icons/House';
import { Lightning } from 'phosphor-react-native/src/icons/Lightning';
import { Money } from 'phosphor-react-native/src/icons/Money';
import { PawPrint } from 'phosphor-react-native/src/icons/PawPrint';
import { Receipt } from 'phosphor-react-native/src/icons/Receipt';
import { ShoppingBag } from 'phosphor-react-native/src/icons/ShoppingBag';
import { ShoppingCart } from 'phosphor-react-native/src/icons/ShoppingCart';
import { UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { Wine } from 'phosphor-react-native/src/icons/Wine';

import type { CategoryIconName } from '@/features/categories/types';

type CategoryIconProps = {
  color: string;
  name: CategoryIconName;
  size?: number;
};

const icons: Record<CategoryIconName, Icon> = {
  money: Money,
  'shopping-cart': ShoppingCart,
  house: House,
  car: Car,
  lightning: Lightning,
  'fork-knife': ForkKnife,
  'shopping-bag': ShoppingBag,
  heartbeat: Heartbeat,
  wine: Wine,
  briefcase: Briefcase,
  'users-three': UsersThree,
  'game-controller': GameController,
  'graduation-cap': GraduationCap,
  'credit-card': CreditCard,
  'airplane-tilt': AirplaneTilt,
  'paw-print': PawPrint,
  receipt: Receipt,
  'dots-three-circle': DotsThreeCircle,
};

export function CategoryIcon({ color, name, size = 24 }: CategoryIconProps) {
  const IconComponent = icons[name];

  return <IconComponent color={color} size={size} weight="fill" />;
}
