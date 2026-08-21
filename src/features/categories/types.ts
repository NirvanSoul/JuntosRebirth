import type { CategoryColorToken } from '@/theme/categoryColors';

export const categoryIconSections = [
  {
    title: 'Transporte',
    icons: [
      'car',
      'bus',
      'train',
      'tram',
      'bicycle',
      'scooter',
      'motorcycle',
      'taxi',
      'gas-pump',
    ],
  },
  {
    title: 'Comida',
    icons: [
      'fork-knife',
      'cooking-pot',
      'coffee',
      'pizza',
      'hamburger',
      'bowl-food',
      'cake',
      'beer-bottle',
      'wine',
      'carrot',
      'bread',
      'ice-cream',
    ],
  },
  {
    title: 'Compras',
    icons: [
      'shopping-cart',
      'shopping-bag',
      't-shirt',
      'gift',
      'package',
      'tag',
      'storefront',
      'handbag',
      'basket',
    ],
  },
  {
    title: 'Finanzas',
    icons: [
      'money',
      'coins',
      'hand-coins',
      'wallet',
      'bank',
      'piggy-bank',
      'credit-card',
      'cardholder',
      'cash-register',
      'calculator',
      'receipt',
      'invoice',
    ],
  },
  {
    title: 'Salud y hogar',
    icons: [
      'heartbeat',
      'heart',
      'first-aid-kit',
      'pill',
      'stethoscope',
      'barbell',
      'person-simple-walk',
      'house',
      'bed',
      'bathtub',
      'tooth',
      'plant',
      'lightning',
      'hammer',
      'wrench',
      'scissors',
      'syringe',
      'hospital',
    ],
  },
  {
    title: 'Ocio y educación',
    icons: [
      'game-controller',
      'music-note',
      'headphones',
      'film-slate',
      'ticket',
      'camera',
      'paint-brush',
      'palette',
      'books',
      'graduation-cap',
      'laptop',
      'phone',
      'television',
      'keyboard',
      'microphone-stage',
    ],
  },
  {
    title: 'Viajes y varios',
    icons: [
      'airplane-tilt',
      'map-pin',
      'compass',
      'planet',
      'globe',
      'briefcase',
      'users-three',
      'baby',
      'paw-print',
      'dog',
      'cat',
      'dots-three-circle',
    ],
  },
] as const;

export type CategoryIconName =
  (typeof categoryIconSections)[number]['icons'][number];

export const categoryIconNames: readonly CategoryIconName[] =
  categoryIconSections.flatMap(({ icons }) => icons);

/** Paso del formulario de categoría al que lleva el detalle. */
export type CategoryEditorTarget = 'appearance' | 'name';

export type Category = {
  id: string;
  spaceId: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  budgetMinor?: number;
  isDefault: boolean;
  templateKey?: string;
  note?: string;
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
