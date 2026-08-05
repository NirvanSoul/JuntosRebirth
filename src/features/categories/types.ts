import type { CategoryColorToken } from '@/theme/categoryColors';

export const categoryIconNames = [
  'money',
  'shopping-cart',
  'house',
  'car',
  'lightning',
  'fork-knife',
  'shopping-bag',
  'heartbeat',
  'wine',
  'briefcase',
  'users-three',
  'game-controller',
  'graduation-cap',
  'credit-card',
  'airplane-tilt',
  'paw-print',
  'receipt',
  'dots-three-circle',
] as const;

export type CategoryIconName = (typeof categoryIconNames)[number];

export type Category = {
  id: string;
  spaceId: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  budgetMinor?: number;
  isDefault: boolean;
  templateKey?: string;
  isArchived: boolean;
};

export type CreateCategoryInput = {
  spaceId: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
};

export type CategoryShareTarget = {
  id: string;
  name: string;
};
