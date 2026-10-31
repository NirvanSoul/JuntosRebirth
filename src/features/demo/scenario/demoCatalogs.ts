import type {
  DemoAmounts,
  DemoSpacePlan,
} from '@/features/demo/scenario/demoScenarioTools';

type DemoCatalog = Pick<DemoSpacePlan, 'accounts' | 'categories'>;

/**
 * Cuentas y categorías propias: las predeterminadas que usa cualquiera y
 * algunas personalizadas, como haría alguien que adapta la app a su vida.
 */
export function buildPersonalCatalog(amounts: DemoAmounts): DemoCatalog {
  return {
    accounts: [
      {
        key: 'payroll',
        name: 'Cuenta nómina',
        kind: 'bank',
        icon: 'bank',
        colorToken: 'blue',
        openingBalanceMinor: amounts.round(600),
      },
      {
        key: 'savings',
        name: 'Ahorros',
        kind: 'bank',
        icon: 'piggy-bank',
        colorToken: 'pink',
        openingBalanceMinor: amounts.round(1500),
      },
      {
        key: 'card',
        name: 'Tarjeta de crédito',
        kind: 'card',
        icon: 'credit-card',
        colorToken: 'violet',
        openingBalanceMinor: 0,
      },
      {
        key: 'cash',
        name: 'Efectivo',
        kind: 'cash',
        icon: 'money',
        colorToken: 'green',
        openingBalanceMinor: amounts.round(60),
      },
    ],
    categories: [
      {
        key: 'salary',
        name: 'Salario',
        icon: 'money',
        colorToken: 'green',
        isDefault: true,
        templateKey: 'salary',
      },
      {
        key: 'freelance',
        name: 'Freelance',
        icon: 'briefcase',
        colorToken: 'teal',
        isDefault: true,
        templateKey: 'freelance',
      },
      {
        key: 'restaurants',
        name: 'Restaurantes',
        icon: 'fork-knife',
        colorToken: 'coral',
        isDefault: true,
        templateKey: 'restaurants',
        budgetMinor: amounts.round(120),
      },
      {
        key: 'transport',
        name: 'Transporte',
        icon: 'car',
        colorToken: 'blue',
        isDefault: true,
        templateKey: 'transport',
      },
      {
        key: 'utilities',
        name: 'Servicios',
        icon: 'lightning',
        colorToken: 'yellow',
        isDefault: true,
        templateKey: 'utilities',
      },
      {
        key: 'shopping',
        name: 'Compras',
        icon: 'shopping-bag',
        colorToken: 'pink',
        isDefault: true,
        templateKey: 'shopping',
        budgetMinor: amounts.round(150),
      },
      {
        key: 'health',
        name: 'Salud',
        icon: 'heartbeat',
        colorToken: 'red',
        isDefault: true,
        templateKey: 'health',
      },
      {
        key: 'subscriptions',
        name: 'Suscripciones',
        icon: 'credit-card',
        colorToken: 'pink',
        isDefault: true,
        templateKey: 'subscriptions',
      },
      {
        key: 'leisure',
        name: 'Ocio',
        icon: 'game-controller',
        colorToken: 'forest',
        isDefault: true,
        templateKey: 'leisure',
      },
      // Personalizadas: las que alguien crea a su medida.
      {
        key: 'household',
        name: 'Aporte a casa',
        icon: 'hand-coins',
        colorToken: 'indigo',
        isDefault: false,
      },
      {
        key: 'coffee',
        name: 'Café',
        icon: 'coffee',
        colorToken: 'brown',
        isDefault: false,
        budgetMinor: amounts.round(40),
      },
      {
        key: 'gym',
        name: 'Gimnasio',
        icon: 'barbell',
        colorToken: 'teal',
        isDefault: false,
      },
      {
        key: 'personal-care',
        name: 'Cuidado personal',
        icon: 'scissors',
        colorToken: 'plum',
        isDefault: false,
      },
      {
        key: 'gifts',
        name: 'Regalos',
        icon: 'gift',
        colorToken: 'orange',
        isDefault: false,
      },
    ],
  };
}

/**
 * Cuentas y categorías de la casa compartida, con las personalizadas que una
 * pareja crea para sus aportes, sus citas y el hogar.
 */
export function buildCoupleCatalog(amounts: DemoAmounts): DemoCatalog {
  return {
    accounts: [
      {
        key: 'joint',
        name: 'Cuenta conjunta',
        kind: 'bank',
        icon: 'bank',
        colorToken: 'teal',
        openingBalanceMinor: amounts.round(500),
      },
      {
        key: 'vacation',
        name: 'Fondo de viajes',
        kind: 'bank',
        icon: 'piggy-bank',
        colorToken: 'yellow',
        openingBalanceMinor: amounts.round(700),
      },
      {
        key: 'cash',
        name: 'Efectivo de casa',
        kind: 'cash',
        icon: 'money',
        colorToken: 'green',
        openingBalanceMinor: amounts.round(40),
      },
    ],
    categories: [
      {
        key: 'housing',
        name: 'Vivienda',
        icon: 'house',
        colorToken: 'slate',
        isDefault: true,
        templateKey: 'housing',
      },
      {
        key: 'groceries',
        name: 'Supermercado',
        icon: 'shopping-cart',
        colorToken: 'orange',
        isDefault: true,
        templateKey: 'groceries',
        budgetMinor: amounts.round(520),
      },
      {
        key: 'utilities',
        name: 'Servicios',
        icon: 'lightning',
        colorToken: 'yellow',
        isDefault: true,
        templateKey: 'utilities',
      },
      {
        key: 'restaurants',
        name: 'Restaurantes',
        icon: 'fork-knife',
        colorToken: 'coral',
        isDefault: true,
        templateKey: 'restaurants',
        budgetMinor: amounts.round(160),
      },
      {
        key: 'transport',
        name: 'Transporte',
        icon: 'car',
        colorToken: 'blue',
        isDefault: true,
        templateKey: 'transport',
      },
      {
        key: 'subscriptions',
        name: 'Suscripciones',
        icon: 'credit-card',
        colorToken: 'pink',
        isDefault: true,
        templateKey: 'subscriptions',
      },
      {
        key: 'pets',
        name: 'Mascotas',
        icon: 'paw-print',
        colorToken: 'orange',
        isDefault: true,
        templateKey: 'pets',
      },
      {
        key: 'travel',
        name: 'Viajes',
        icon: 'airplane-tilt',
        colorToken: 'blue',
        isDefault: true,
        templateKey: 'travel',
      },
      // Personalizadas de la pareja.
      {
        key: 'contributions',
        name: 'Aportes',
        icon: 'hand-coins',
        colorToken: 'indigo',
        isDefault: false,
      },
      {
        key: 'dates',
        name: 'Citas',
        icon: 'heart',
        colorToken: 'red',
        isDefault: false,
      },
      {
        key: 'home',
        name: 'Hogar y deco',
        icon: 'plant',
        colorToken: 'forest',
        isDefault: false,
      },
    ],
  };
}
