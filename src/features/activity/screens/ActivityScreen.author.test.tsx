import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActivityScreen } from '@/features/activity/screens/ActivityScreen';
import type { Category } from '@/features/categories/types';
import { SpaceMembershipScope } from '@/features/profile/state/SpaceMembershipContext';
import type { SpaceMemberProfile } from '@/features/profile/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  ),
  useScrollToTop: jest.fn(),
}));

const baseTransaction = {
  spaceId: 'couple',
  type: 'expense',
  amountMinor: 1000,
  currency: 'EUR',
  categoryId: 'general',
  occurredOn: '2026-07-30',
  recurrence: 'once',
  updatedAt: '2026-07-30T12:00:00.000Z',
} as const;

const transactions: SessionTransaction[] = [
  { ...baseTransaction, id: 'own', createdBy: 'me', title: 'Mi compra' },
  // Creado antes de iniciar sesión: firmado con el id de la instalación.
  {
    ...baseTransaction,
    id: 'offline',
    createdBy: 'install-1',
    title: 'Compra sin conexión',
  },
  {
    ...baseTransaction,
    id: 'partner',
    createdBy: 'partner',
    title: 'Compra de Sam',
  },
];

const categories: Category[] = [
  {
    id: 'general',
    spaceId: 'couple',
    name: 'General',
    icon: 'dots-three-circle',
    colorToken: 'slate',
    isDefault: false,
    isArchived: false,
  },
];

const profile = (userId: string, displayName: string) =>
  ({ userId, displayName }) as SpaceMemberProfile;

const membership = {
  isSharedSpace: true,
  ownUserId: 'me',
  profilesByUserId: {
    me: profile('me', 'Alex'),
    partner: profile('partner', 'Sam'),
  },
};

function renderScreen(onOpenCategoryDetail = jest.fn()) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider initialAppearance="light">
        <SpaceMembershipScope value={membership}>
          <ActivityScreen
            categories={categories}
            onOpenCategoryDetail={onOpenCategoryDetail}
            transactions={transactions}
          />
        </SpaceMembershipScope>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

async function applyAuthor(
  screen: Awaited<ReturnType<typeof renderScreen>>,
  label: string,
) {
  // El grupo de autor abre desplegado: la fecha ya no vive en el modal.
  await fireEvent.press(screen.getByRole('button', { name: /^Filtros/ }));
  await fireEvent.press(screen.getByLabelText(`Autor: ${label}`));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Aplicar filtros' }),
  );
  await waitFor(() =>
    expect(screen.queryByTestId('transaction-filters-modal')).toBeNull(),
  );
}

describe('ActivityScreen · filtro de autor', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-30T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('muestra Ambos, Yo y la pareja con el nombre completo', async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Filtros/ }));

    for (const value of ['all', 'own', 'partner']) {
      expect(
        StyleSheet.flatten(
          screen.getByTestId(`author-filter-${value}`).props.style,
        ),
      ).toMatchObject({ flexGrow: 1 });
      // Sin base cero: cada opción mide al menos su nombre y no lo recorta.
      expect(
        StyleSheet.flatten(
          screen.getByTestId(`author-filter-${value}`).props.style,
        ).flexBasis,
      ).toBeUndefined();
    }
    expect(screen.getByLabelText('Autor: Sam')).toBeTruthy();
  });

  it('separa lo propio, incluido lo creado sin sesión, de lo de la pareja', async () => {
    const screen = await renderScreen();

    await applyAuthor(screen, 'Yo');
    expect(screen.getByText('Mi compra')).toBeTruthy();
    expect(screen.getByText('Compra sin conexión')).toBeTruthy();
    expect(screen.queryByText('Compra de Sam')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Filtros, 1 activos' }),
    ).toBeTruthy();

    await applyAuthor(screen, 'Sam');
    expect(screen.queryByText('Mi compra')).toBeNull();
    expect(screen.queryByText('Compra sin conexión')).toBeNull();
    expect(screen.getByText('Compra de Sam')).toBeTruthy();
  });

  it('avisa al aplicar y al quitar el filtro', async () => {
    const screen = await renderScreen();

    await applyAuthor(screen, 'Yo');
    expect(screen.getByLabelText('Filtro aplicado')).toBeTruthy();

    await applyAuthor(screen, 'Ambos');
    expect(screen.getByLabelText('Filtros quitados')).toBeTruthy();
  });

  it('conserva el filtro al volver a la pantalla', async () => {
    const first = await renderScreen();
    await applyAuthor(first, 'Sam');
    await first.unmount();

    const screen = await renderScreen();
    expect(screen.queryByText('Mi compra')).toBeNull();
    expect(screen.getByText('Compra de Sam')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Filtros, 1 activos' }),
    ).toBeTruthy();
  });

  it('abre el modal de gastos y el detalle de categoría con el autor elegido', async () => {
    const onOpenCategoryDetail = jest.fn();
    const screen = await renderScreen(onOpenCategoryDetail);

    await applyAuthor(screen, 'Sam');
    await fireEvent.press(
      screen.getByLabelText(/Gastos de los movimientos mostrados/),
    );

    const periodFilter = await screen.findByTestId(
      'expense-period-filter-button',
    );
    expect(periodFilter.props.accessibilityLabel).toBe('Filtros, 1 activos');

    await fireEvent.press(screen.getByRole('button', { name: /^General,/ }));
    expect(onOpenCategoryDetail).toHaveBeenCalledWith(
      'general',
      'EUR',
      'partner',
    );
  });
});
