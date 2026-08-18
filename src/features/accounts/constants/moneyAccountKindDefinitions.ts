import type {
  MoneyAccountIconName,
  MoneyAccountKind,
} from '@/features/accounts/types';
import type { CategoryColorToken } from '@/theme/categoryColors';

export type MoneyAccountKindDefinition = {
  kind: MoneyAccountKind;
  label: string;
  /** Se preselecciona al elegir el tipo; el usuario puede cambiarlo. */
  icon: MoneyAccountIconName;
  colorToken: CategoryColorToken;
};

export const moneyAccountKindDefinitions: readonly MoneyAccountKindDefinition[] =
  [
    { kind: 'cash', label: 'Efectivo', icon: 'money', colorToken: 'emerald' },
    {
      kind: 'bank',
      label: 'Cuenta bancaria',
      icon: 'bank',
      colorToken: 'blue',
    },
    {
      kind: 'card',
      label: 'Tarjeta',
      icon: 'credit-card',
      colorToken: 'violet',
    },
  ];

export function getMoneyAccountKindDefinition(
  kind: MoneyAccountKind,
): MoneyAccountKindDefinition {
  const definition = moneyAccountKindDefinitions.find(
    (candidate) => candidate.kind === kind,
  );

  if (!definition) {
    throw new Error('El tipo de cuenta no está reconocido');
  }

  return definition;
}

export function getMoneyAccountKindLabel(kind: MoneyAccountKind): string {
  return getMoneyAccountKindDefinition(kind).label;
}
