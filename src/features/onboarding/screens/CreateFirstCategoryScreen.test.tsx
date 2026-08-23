import { fireEvent, waitFor } from '@testing-library/react-native';

import { CreateFirstCategoryScreen } from '@/features/onboarding/screens/CreateFirstCategoryScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

const mockGetLocalProfile = jest.fn();
jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: () => mockGetLocalProfile(),
}));

jest.mock('@/features/spaces/hooks/useSpaces', () => ({
  useSpaces: () => ({
    activeSpace: { id: 'personal', name: 'Personal', type: 'personal' },
  }),
}));

const mockCreateLocalCategory = jest.fn();
const mockCreateLocalCategories = jest.fn();
const mockListLocalCategories = jest.fn();
jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  createLocalCategory: (input: Record<string, unknown>) =>
    mockCreateLocalCategory(input),
  createLocalCategories: (inputs: Record<string, unknown>[]) =>
    mockCreateLocalCategories(inputs),
  listLocalCategories: () => mockListLocalCategories(),
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const navigation = mockNavigation as never;
const route = {} as never;
let nextCreatedCategoryId = 0;

describe('CreateFirstCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nextCreatedCategoryId = 0;
    mockGetLocalProfile.mockResolvedValue({
      avatarUri: null,
      displayName: 'Ana María',
    });
    mockListLocalCategories.mockResolvedValue([]);
    mockCreateLocalCategories.mockImplementation(
      async (inputs: Record<string, unknown>[]) => {
        const created = inputs.map((input, index) => ({
          ...input,
          id: `category-${nextCreatedCategoryId + index}`,
          isArchived: false,
        }));
        nextCreatedCategoryId += inputs.length;
        return created;
      },
    );
  });

  it('usa solo el primer nombre en el título y abre el selector de categorías sugeridas', async () => {
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/¡Empecemos, Ana!/)).toBeTruthy();
    });
    expect(screen.queryByText(/María/)).toBeNull();

    expect(screen.queryByText('Nueva categoría')).toBeNull();
    await fireEvent.press(screen.getByTestId('floating-create-button'));
    expect(
      screen.queryByTestId('onboarding-create-category-action'),
    ).toBeNull();
    expect(
      screen.getByLabelText('Crear ingreso').props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    expect(
      screen.getByLabelText('Crear gasto').props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    expect(
      screen.getByLabelText('Crear categoría').props.accessibilityState,
    ).toMatchObject({
      disabled: false,
    });
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    expect(screen.getByText('Nueva categoría')).toBeTruthy();
    expect(screen.getByLabelText('Salario')).toBeTruthy();
  });

  it('pide tres categorías y continúa al guardar tres plantillas', async () => {
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Te faltan 3 categorías para continuar.'),
      ).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Supermercado'));
    await fireEvent.press(screen.getByLabelText('Vivienda'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await waitFor(() => {
      expect(mockCreateLocalCategories).toHaveBeenCalledWith([
        expect.objectContaining({ spaceId: 'personal', name: 'Salario' }),
        expect.objectContaining({ spaceId: 'personal', name: 'Supermercado' }),
        expect.objectContaining({ spaceId: 'personal', name: 'Vivienda' }),
      ]);
    });
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddFirstIncome');
    });
  });

  it('acumula las categorías creadas antes de avanzar', async () => {
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await waitFor(() => {
      expect(
        screen.getByText('Te faltan 2 categorías para continuar.'),
      ).toBeTruthy();
    });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Supermercado'));
    await fireEvent.press(screen.getByLabelText('Vivienda'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddFirstIncome');
    });
  });

  it('cuenta una categoría personalizada para completar el mínimo', async () => {
    mockCreateLocalCategory.mockImplementation(
      async (input: Record<string, unknown>) => ({
        ...input,
        id: 'category-custom',
        isArchived: false,
      }),
    );
    mockListLocalCategories.mockResolvedValue([
      {
        id: 'category-salary',
        spaceId: 'personal',
        name: 'Salario',
        icon: 'money',
        colorToken: 'green',
        isDefault: true,
        templateKey: 'salary',
        isArchived: false,
      },
      {
        id: 'category-groceries',
        spaceId: 'personal',
        name: 'Supermercado',
        icon: 'shopping-cart',
        colorToken: 'orange',
        isDefault: true,
        templateKey: 'groceries',
        isArchived: false,
      },
    ]);
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Te falta 1 categoría para continuar.'),
      ).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));
    await fireEvent.press(screen.getByLabelText('Crear otra categoría'));
    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Jardinería',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    await waitFor(() => {
      expect(mockCreateLocalCategory).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'personal', name: 'Jardinería' }),
      );
    });
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddFirstIncome');
    });
  });

  it('no permite volver a crear una categoría de plantilla que ya existe en el espacio', async () => {
    // Simula volver a esta lámina con «Atrás» tras haber creado «Salario»
    // en una visita anterior: ya existe en la base de datos aunque el
    // estado local de esta instancia arrancó vacío.
    mockListLocalCategories.mockResolvedValue([
      {
        id: 'category-salary',
        spaceId: 'personal',
        name: 'Salario',
        icon: 'money',
        colorToken: 'emerald',
        isDefault: true,
        templateKey: 'salary',
        isArchived: false,
      },
    ]);
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await fireEvent.press(screen.getByTestId('floating-create-button'));
    await fireEvent.press(screen.getByLabelText('Crear categoría'));

    await waitFor(() => {
      expect(screen.getByLabelText('Salario, ya creada')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Salario, ya creada'));

    expect(mockCreateLocalCategories).not.toHaveBeenCalled();
  });
});
