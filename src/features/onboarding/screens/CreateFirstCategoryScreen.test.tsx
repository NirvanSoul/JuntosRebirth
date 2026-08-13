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

describe('CreateFirstCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalProfile.mockResolvedValue({
      avatarUri: null,
      displayName: 'Ana María',
    });
    mockListLocalCategories.mockResolvedValue([]);
    mockCreateLocalCategories.mockImplementation(
      async (inputs: Record<string, unknown>[]) =>
        inputs.map((input, index) => ({
          ...input,
          id: `category-${index}`,
          isArchived: false,
        })),
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
    await fireEvent.press(
      screen.getByTestId('onboarding-create-category-action'),
    );
    expect(screen.getByText('Nueva categoría')).toBeTruthy();
    expect(screen.getByLabelText('Salario')).toBeTruthy();
  });

  it('al guardar plantillas elegidas, las crea y continúa hacia el primer ingreso', async () => {
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await fireEvent.press(
      screen.getByTestId('onboarding-create-category-action'),
    );
    await fireEvent.press(screen.getByLabelText('Salario'));
    await fireEvent.press(screen.getByLabelText('Guardar categorías'));

    await waitFor(() => {
      expect(mockCreateLocalCategories).toHaveBeenCalledWith([
        expect.objectContaining({ spaceId: 'personal', name: 'Salario' }),
      ]);
    });
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddFirstIncome');
    });
  });

  it('si ninguna sugerencia sirve, abre el formulario de categoría personalizada', async () => {
    mockCreateLocalCategory.mockImplementation(
      async (input: Record<string, unknown>) => ({
        ...input,
        id: 'category-custom',
        isArchived: false,
      }),
    );
    const screen = await renderWithTheme(
      <CreateFirstCategoryScreen navigation={navigation} route={route} />,
    );

    await fireEvent.press(
      screen.getByTestId('onboarding-create-category-action'),
    );
    await fireEvent.press(screen.getByLabelText('Crear otra categoría'));
    await fireEvent.changeText(
      screen.getByLabelText('Nombre de la categoría'),
      'Jardinería',
    );
    await fireEvent.press(screen.getByLabelText('Continuar personalización'));
    // Hay dos botones con esta etiqueta: el que abre el selector (pantalla de
    // onboarding) y el de enviar dentro del formulario personalizado; este
    // último es el último en el árbol.
    const submitButtons = screen.getAllByLabelText('Crear categoría');
    await fireEvent.press(submitButtons[submitButtons.length - 1]!);

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

    await fireEvent.press(
      screen.getByTestId('onboarding-create-category-action'),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Salario, ya creada')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Salario, ya creada'));

    expect(mockCreateLocalCategories).not.toHaveBeenCalled();
  });
});
