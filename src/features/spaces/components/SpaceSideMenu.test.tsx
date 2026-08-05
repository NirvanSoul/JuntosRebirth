import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import type { Space } from '@/features/spaces/types';
import { colors } from '@/theme/colors';

const spaces: Space[] = [
  { id: 'personal', name: 'Personal', type: 'personal' },
  { id: 'juntos', name: 'Juntos', type: 'couple' },
  { id: 'home', name: 'Casa', type: 'other' },
];

async function renderMenu(
  overrides: Partial<ComponentProps<typeof SpaceSideMenu>> = {},
) {
  const props = {
    activeSpaceId: 'personal',
    onClose: jest.fn(),
    onCreateSpace: jest.fn(async () => spaces[1]!),
    onOpenSettings: jest.fn(),
    onSelectSpace: jest.fn(async () => undefined),
    spaces,
    ...overrides,
  };

  return {
    props,
    screen: await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <SpaceSideMenu {...props} />
      </SafeAreaProvider>,
    ),
  };
}

describe('SpaceSideMenu', () => {
  it('selecciona espacios y abre Ajustes desde el pie', async () => {
    const { props, screen } = await renderMenu();

    await fireEvent.press(screen.getByLabelText('Seleccionar espacio Casa'));

    await waitFor(() =>
      expect(props.onSelectSpace).toHaveBeenCalledWith('home'),
    );
    expect(props.onClose).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Ajustes'));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('no muestra el botón de crear nuevo espacio (pendiente de habilitar)', async () => {
    const { screen } = await renderMenu();

    expect(screen.queryByTestId('add-space-button')).toBeNull();
    expect(screen.queryByText('Crear nuevo espacio')).toBeNull();
  });

  it('presenta las acciones inferiores oscuras sobre una superficie blanca', async () => {
    const { screen } = await renderMenu();

    expect(
      StyleSheet.flatten(screen.getByTestId('settings-menu-icon').props.style)
        .color,
    ).toBe(colors.textPrimary);
    expect(
      StyleSheet.flatten(screen.getByText('Ajustes').props.style).color,
    ).toBe(colors.textPrimary);
  });
});
