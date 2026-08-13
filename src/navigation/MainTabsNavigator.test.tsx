import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

const mockUseSpaces = jest.fn();

jest.mock('@/features/spaces/hooks/useSpaces', () => ({
  useSpaces: () => mockUseSpaces(),
}));

jest.mock('@/features/categories/repositories/localCategoryRepository', () => {
  let nextId = 1;
  const create = async (input: Record<string, unknown>) => ({
    ...input,
    id: `category-${nextId++}`,
    isArchived: false,
  });

  return {
    archiveLocalCategory: jest.fn(async () => undefined),
    createLocalCategory: jest.fn(create),
    createLocalCategories: jest.fn(
      async (inputs: readonly Record<string, unknown>[]) =>
        Promise.all(inputs.map(create)),
    ),
    listLocalCategories: jest.fn(async () => []),
    updateLocalCategory: jest.fn(async (category) => category),
  };
});

jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => {
    let nextId = 1;
    return {
      archiveLocalTransaction: jest.fn(async () => undefined),
      createLocalTransaction: jest.fn(
        async (input: Record<string, unknown>) => [
          {
            ...input,
            id: `transaction-${nextId++}`,
          },
        ],
      ),
      createLocalTransactions: jest.fn(
        async (inputs: readonly Record<string, unknown>[]) =>
          inputs.map((input) => ({ ...input, id: `transaction-${nextId++}` })),
      ),
      listLocalTransactions: jest.fn(async () => []),
      updateLocalTransaction: jest.fn(async (id, draft) => [{ ...draft, id }]),
    };
  },
);

// `SettingsScreen` vive en el mismo drawer que la pantalla principal y
// carga el avatar de perfil al montarse, también contra SQLite real.
jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => ({
    avatarUri: null,
    displayName: null,
  })),
  saveLocalProfileAvatar: jest.fn(async () => ({
    avatarUri: null,
    displayName: null,
  })),
}));

// Reglas de notificación, recordatorios manuales y su caché de programación
// se consultan al montar (`listLocalNotificationRules`) y al reconciliar
// (`reconcileNotificationRules`). Los tres viven en SQLite real; sin este
// mock, `getLocalDatabase()` intenta abrir una base nativa que no existe en
// Jest y falla con "NativeDatabase is not a constructor".
jest.mock(
  '@/features/transactions/repositories/localTransactionNotificationRuleRepository',
  () => ({
    listLocalNotificationRules: jest.fn(async () => []),
    saveLocalNotificationRule: jest.fn(async (input) => ({
      ...input,
      id: 'notification-rule-1',
    })),
  }),
);

jest.mock(
  '@/features/transactions/repositories/localTransactionReminderRepository',
  () => ({
    listLocalTransactionReminders: jest.fn(async () => []),
    getLocalTransactionReminder: jest.fn(async () => null),
    saveLocalTransactionReminder: jest.fn(async (input) => ({
      ...input,
      id: 'reminder-1',
    })),
    deleteLocalTransactionReminder: jest.fn(async () => undefined),
  }),
);

jest.mock(
  '@/features/transactions/repositories/localNotificationRuleScheduleRepository',
  () => ({
    listSchedulesForRule: jest.fn(async () => []),
    replaceSchedulesForRule: jest.fn(async () => undefined),
    countAllScheduledNotifications: jest.fn(async () => 0),
  }),
);

describe('MainTabsNavigator', () => {
  beforeEach(() => {
    mockUseSpaces.mockReturnValue({
      activeSpace: { id: 'personal', name: 'Personal', type: 'personal' },
      createSpace: jest.fn(),
      error: null,
      isReady: true,
      selectSpace: jest.fn(),
      spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }],
    });
  });

  it('mantiene fijo el selector de espacio al cambiar de pantalla', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('persistent-app-header')).toBeTruthy();
    const spaceButton = screen.getByLabelText('Espacio Personal');
    expect(spaceButton).toBeTruthy();
    expect(
      within(spaceButton).getByTestId('active-space-avatar', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(StyleSheet.flatten(spaceButton.props.style)).toMatchObject({
      ...shadows.subtle,
      borderColor: colors.border,
      borderWidth: 1,
    });
    expect(screen.queryByLabelText('Foto de perfil')).toBeNull();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('persistent-app-header').props.style,
      ),
    ).toMatchObject({ position: 'absolute', zIndex: 1 });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('persistent-app-header').props.style,
      ),
    ).not.toHaveProperty('backgroundColor');
    const homeTab = screen.getByRole('tab', { name: 'Inicio' });
    expect(
      StyleSheet.flatten(screen.getByTestId('app-tab-item-Home').props.style)
        .backgroundColor,
    ).toBe(colors.background);
    expect(
      StyleSheet.flatten(within(homeTab).getByText('Inicio').props.style).color,
    ).toBe(colors.textPrimary);
    expect(
      within(homeTab).getByTestId('phosphor-react-native-house-fill'),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('app-tab-bar').props.style),
    ).toMatchObject(shadows.mainMenu);

    await fireEvent.press(screen.getByLabelText('Espacio Personal'));
    expect(await screen.findByText('Espacios')).toBeTruthy();
    expect(screen.queryByText('Crear nuevo espacio')).toBeNull();
    expect(screen.getByText('Ajustes')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ajustes'));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();
    expect(screen.getByText('Datos y privacidad')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver'));

    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));

    expect(screen.getByTestId('persistent-app-header')).toBeTruthy();
    expect(screen.getByLabelText('Espacio Personal')).toBeTruthy();
    const activityTab = screen.getByRole('tab', { name: 'Actividad' });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('app-tab-item-Activity').props.style,
      ).backgroundColor,
    ).toBe(colors.background);
    expect(
      StyleSheet.flatten(within(activityTab).getByText('Actividad').props.style)
        .color,
    ).toBe(colors.textPrimary);
    expect(
      within(activityTab).getByTestId('phosphor-react-native-receipt-fill'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByTestId('map-screen')).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Mapa' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('alterna entre dos monedas desde Inicio y Actividad sin abrir el selector', async () => {
    await AsyncStorage.setItem(
      '@juntoss/currency-preferences/v1',
      JSON.stringify({ currencies: ['EUR', 'USD'], version: 1 }),
    );
    await AsyncStorage.setItem(
      '@juntoss/home-currency-selection/v1',
      JSON.stringify({ currency: 'EUR', version: 1 }),
    );

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Moneda seleccionada: 🇪🇺')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('home-currency-flag-button'));

    await waitFor(() =>
      expect(screen.getByLabelText('Moneda seleccionada: 🇺🇸')).toBeTruthy(),
    );
    expect(screen.queryByTestId('home-currency-picker')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));
    await fireEvent.press(screen.getByTestId('home-currency-flag-button'));

    await waitFor(() =>
      expect(screen.getByLabelText('Moneda seleccionada: 🇪🇺')).toBeTruthy(),
    );
    expect(screen.queryByTestId('home-currency-picker')).toBeNull();
  });

  it('abre el selector de moneda cuando hay tres monedas activas', async () => {
    await AsyncStorage.setItem(
      '@juntoss/currency-preferences/v1',
      JSON.stringify({ currencies: ['EUR', 'USD', 'GBP'], version: 1 }),
    );
    await AsyncStorage.setItem(
      '@juntoss/home-currency-selection/v1',
      JSON.stringify({ currency: 'EUR', version: 1 }),
    );

    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Moneda seleccionada: 🇪🇺')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('home-currency-flag-button'));

    expect(await screen.findByTestId('home-currency-picker')).toBeTruthy();
  });

  it('desplaza el selector y fija el mismo resumen al recorrer movimientos', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));
    await fireEvent(screen.getByTestId('activity-summary-anchor'), 'layout', {
      nativeEvent: { layout: { height: 40, width: 342, x: 0, y: 400 } },
    });

    fireEvent.scroll(screen.getByTestId('activity-screen-scroll-view'), {
      nativeEvent: { contentOffset: { x: 0, y: 400 } },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('activity-summary')).toHaveLength(1);
      expect(
        screen.getByTestId('persistent-app-header', {
          includeHiddenElements: true,
        }).props.pointerEvents,
      ).toBe('none');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('activity-income-badge').props.style,
        ),
      ).toMatchObject({ borderColor: colors.border, borderWidth: 1 });
    });

    fireEvent.scroll(screen.getByTestId('activity-screen-scroll-view'), {
      nativeEvent: { contentOffset: { x: 0, y: 350 } },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('activity-summary')).toHaveLength(1);
      expect(
        screen.getByTestId('persistent-app-header', {
          includeHiddenElements: true,
        }).props.pointerEvents,
      ).toBe('auto');
      expect(
        StyleSheet.flatten(
          screen.getByTestId('activity-income-badge').props.style,
        ).borderWidth,
      ).toBeUndefined();
    });

    fireEvent.scroll(screen.getByTestId('activity-screen-scroll-view'), {
      nativeEvent: { contentOffset: { x: 0, y: 400 } },
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('persistent-app-header', {
          includeHiddenElements: true,
        }).props.pointerEvents,
      ).toBe('none'),
    );

    await fireEvent.press(screen.getByRole('tab', { name: 'Mapa' }));
    expect(
      screen.getByTestId('persistent-app-header').props.pointerEvents,
    ).toBe('auto');
    expect(screen.queryAllByTestId('activity-summary')).toHaveLength(0);
  });

  it('abre categoría y gasto desde las tarjetas vacías de Inicio', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByLabelText('Crear primera categoría'));
    expect(
      await screen.findByText('Elige la categoría que va contigo.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));

    await fireEvent.press(screen.getByLabelText('Crear primer gasto'));
    expect(await screen.findByLabelText('Título del movimiento')).toBeTruthy();
    expect(
      screen.getByLabelText('Gasto').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
  });

  it('navega desde Ver más a cada bloque de Actividad', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByLabelText('Ver más de Categorías'));
    expect(screen.getByRole('button', { name: 'Categorías' })).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Actividad' }).props.accessibilityState,
    ).toMatchObject({ selected: true });

    await fireEvent.press(screen.getByRole('tab', { name: 'Inicio' }));
    await fireEvent.press(
      screen.getByLabelText('Ver más de Movimientos Recientes'),
    );
    expect(screen.getByText('Movimientos')).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Actividad' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('abre el menú desde el botón flotante y continúa al modal de gasto', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    expect(await screen.findByLabelText('Crear gasto')).toBeTruthy();
    expect(screen.getByTestId('floating-create-button')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Crear gasto'));

    expect(await screen.findByLabelText('Título del movimiento')).toBeTruthy();
    expect(
      screen.getByLabelText('Gasto').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('floating-create-button')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Agregar categoría'));
    expect(
      await screen.findByText('Elige la categoría que va contigo.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Crear otra categoría'));
    expect(await screen.findByText('Ponle un nombre')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Comida',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    expect(await screen.findByText('Dale tu estilo')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    expect(await screen.findByLabelText('Categoría Comida')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(await screen.findByTestId('floating-create-button')).toBeTruthy();
    expect(screen.getByTestId('home-balance').props.children).toContain('-5');
    expect(screen.getByTestId('home-expense-amount').props.children).toContain(
      '5',
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));

    expect(await screen.findByTestId('transaction-preview-card')).toBeTruthy();
    expect(
      screen.getAllByTestId('category-preview-card').length,
    ).toBeGreaterThan(0);
  });

  it('conserva un único tipo correcto al abrir el modal desde distintos accesos', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear ingreso'));

    expect(
      screen.getByLabelText('Ingreso').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-type-indicator-income').props.style,
      ).backgroundColor,
    ).toBe(colors.income);
    expect(StyleSheet.flatten(screen.getByText('+').props.style).color).toBe(
      colors.income,
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-currency').props.style,
      ).color,
    ).toBe(colors.income);

    await fireEvent.press(screen.getByLabelText('Cerrar'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Título del movimiento')).toBeNull(),
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Salario, gastado/ }),
    );
    const categoryDetail = await screen.findByTestId('category-detail-modal');
    await fireEvent.press(
      within(categoryDetail).getByRole('button', {
        name: 'Añadir movimiento',
      }),
    );

    expect(
      screen.getByLabelText('Gasto').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(screen.getByLabelText('Categoría Salario')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-type-indicator-expense').props.style,
      ).backgroundColor,
    ).toBe(colors.expense);
    expect(StyleSheet.flatten(screen.getByText('+').props.style).color).toBe(
      colors.expense,
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-currency').props.style,
      ).color,
    ).toBe(colors.expense);

    await fireEvent.press(screen.getByLabelText('Cerrar'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Título del movimiento')).toBeNull(),
    );
    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear ingreso'));

    expect(
      screen.getByLabelText('Ingreso').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(StyleSheet.flatten(screen.getByText('+').props.style).color).toBe(
      colors.income,
    );
  });

  it('aparta el botón flotante al bajar y lo recupera al subir', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const scrollView = screen.getByTestId('home-screen-scroll-view');
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { x: 0, y: 16 } },
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('floating-create-button-container', {
          includeHiddenElements: true,
        }).props.pointerEvents,
      ).toBe('none'),
    );

    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('floating-create-button-container').props
          .pointerEvents,
      ).toBe('auto'),
    );
  });

  it('crea una categoría desde el acceso rápido sin crear un movimiento', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    expect(await screen.findByLabelText('Salario')).toBeTruthy();
    expect(screen.getByLabelText('Salidas')).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-template-pages').props.style,
      ).height,
    ).toBeGreaterThanOrEqual(280);
    expect(screen.getByLabelText('Cerrar')).toBeTruthy();
    expect(screen.queryByText('Cancelar')).toBeNull();
    expect(screen.queryByText('Continuar')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Crear otra categoría'));
    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Jardinería',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));

    expect(await screen.findByText('Jardinería')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Jardinería' })).toBeTruthy();
    expect(screen.queryByText('0 movimientos')).toBeNull();
    expect(screen.queryByTestId('transaction-preview-card')).toBeNull();
  });

  it('selecciona varias plantillas, las muestra con degradado y las guarda juntas', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));
    expect(screen.queryByTestId('category-preview-card')).toBeNull();

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    expect(screen.getByText('Elige la categoría que va contigo.')).toBeTruthy();

    expect(
      StyleSheet.flatten(
        screen.getByLabelText('Guardar categorías').props.style,
      ).backgroundColor,
    ).toBe(colors.cta);
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Supermercado'));

    expect(
      screen.getByLabelText('Salario').props.accessibilityState,
    ).toMatchObject({
      checked: true,
      disabled: false,
    });
    expect(
      screen.getByTestId('category-template-salary-selected-gradient'),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByLabelText('Salario').props.style)
        .borderWidth,
    ).toBe(0);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-template-salary-icon').props.style,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      screen.getByTestId('phosphor-react-native-money-fill').props.color,
    ).toBe(colors.onBrand);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('category-page-indicator-0').props.style,
      ),
    ).toMatchObject({
      backgroundColor: 'rgba(76, 90, 80, 1)',
      height: spacing.xs,
      width: spacing.xl,
    });

    await fireEvent(
      screen.getByTestId('category-template-pages'),
      'momentumScrollEnd',
      { nativeEvent: { contentOffset: { x: 390, y: 0 } } },
    );
    expect(screen.getByLabelText('Página 2 de 2')).toBeTruthy();
    expect(screen.getByLabelText('Freelance')).toBeTruthy();

    expect(screen.queryByTestId('category-preview-card')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    expect(screen.getAllByTestId('category-preview-card')).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    const createdSalary = screen.getByLabelText('Salario, ya creada');
    expect(createdSalary.props.accessibilityState).toMatchObject({
      checked: false,
      disabled: true,
    });
    await fireEvent.press(createdSalary);
    expect(screen.getByText('Ya creaste esta categoría.')).toBeTruthy();
  });

  it('muestra solo las categorías creadas al asignar una a un movimiento', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear gasto'));
    await fireEvent.press(screen.getByLabelText('Agregar categoría'));

    expect(await screen.findByText('Elige una categoría')).toBeTruthy();
    expect(screen.getByLabelText('Salario')).toBeTruthy();
    expect(screen.queryByLabelText('Supermercado')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    expect(await screen.findByText('Nueva categoría')).toBeTruthy();
    expect(screen.getByLabelText('Supermercado')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Crear otra categoría'));

    expect(await screen.findByText('Ponle un nombre')).toBeTruthy();
  });

  it('confirma una categoría copiada con su nombre y espacio de destino', async () => {
    mockUseSpaces.mockReturnValue({
      activeSpace: { id: 'personal', name: 'Personal', type: 'personal' },
      createSpace: jest.fn(),
      error: null,
      isReady: true,
      selectSpace: jest.fn(),
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal' },
        { id: 'couple', name: 'Pareja', type: 'couple' },
      ],
    });
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));
    await fireEvent.press(screen.getByRole('tab', { name: 'Actividad' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salario' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Copiar en otro espacio' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Copiar a Pareja' }),
    );

    expect(
      await screen.findByLabelText('Salario copiado en Pareja exitosamente.'),
    ).toBeTruthy();
  });

  it('abre los detalles desde Inicio y confirma la copia de un movimiento', async () => {
    mockUseSpaces.mockReturnValue({
      activeSpace: { id: 'personal', name: 'Personal', type: 'personal' },
      createSpace: jest.fn(),
      error: null,
      isReady: true,
      selectSpace: jest.fn(),
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal' },
        { id: 'couple', name: 'Pareja', type: 'other' },
      ],
    });
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider initialAppearance="light">
          <NavigationContainer>
            <MainTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await fireEvent.press(
      screen.getByRole('button', { name: /Salario, gastado/ }),
    );
    expect(await screen.findByTestId('category-detail-modal')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear gasto'));
    await fireEvent.press(screen.getByLabelText('Agregar categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    await fireEvent.press(
      screen.getByRole('button', { name: /Gasto: Salario/ }),
    );
    const detail = await screen.findByTestId('transaction-detail-modal');
    expect(within(detail).queryByText(/presupuesto/i)).toBeNull();
    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Copiar en otro espacio' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Copiar a Pareja' }),
    );

    expect(
      await screen.findByLabelText('Salario copiado en Pareja exitosamente.'),
    ).toBeTruthy();

    await fireEvent.press(
      within(detail).getByRole('button', { name: 'Editar movimiento' }),
    );
    expect(await screen.findByLabelText('5 euros')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('Guardar cambios'));
    expect(screen.getByTestId('home-balance').props.children).toContain('-50');

    await fireEvent.press(
      screen.getByRole('button', { name: /Gasto: Salario,.*50/ }),
    );
    const updatedDetail = await screen.findByTestId('transaction-detail-modal');
    await fireEvent.press(
      within(updatedDetail).getByRole('button', {
        name: 'Eliminar movimiento',
      }),
    );
    await fireEvent.press(
      within(updatedDetail).getByRole('button', { name: 'Eliminar' }),
    );

    expect(await screen.findByText('Aún no hay movimientos')).toBeTruthy();
  });
});
