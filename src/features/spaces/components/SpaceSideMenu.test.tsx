import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import type { Space } from '@/features/spaces/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors, darkColors, lightColors } from '@/theme/colors';
import type { AppearancePreference } from '@/theme/types';

const spaces: Space[] = [
  { id: 'personal', name: 'Personal', type: 'personal' },
  { id: 'juntos', name: 'Juntos', type: 'couple' },
  { id: 'home', name: 'Casa', type: 'other' },
];

async function renderMenu(
  overrides: Partial<ComponentProps<typeof SpaceSideMenu>> = {},
  appearance: AppearancePreference = 'light',
) {
  const props = {
    activeSpaceId: 'personal',
    onClose: jest.fn(),
    onCreateSpace: jest.fn(async () => spaces[1]!),
    onInvitePartner: jest.fn(),
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
        <ThemeProvider initialAppearance={appearance}>
          <SpaceSideMenu {...props} />
        </ThemeProvider>
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

  it('muestra "Espacio de pareja" debajo del espacio personal y dispara onInvitePartner al tocarlo', async () => {
    const { props, screen } = await renderMenu({
      spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }],
    });

    const button = screen.getByLabelText('Espacio de pareja');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);

    await fireEvent.press(button);
    expect(props.onInvitePartner).toHaveBeenCalledTimes(1);
  });

  it('el botón "Espacio de pareja" se ve como un botón real, con borde propio del tema claro y oscuro', async () => {
    const lightRender = await renderMenu(
      { spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }] },
      'light',
    );
    expect(
      StyleSheet.flatten(
        lightRender.screen.getByLabelText('Espacio de pareja').props.style,
      ).borderColor,
    ).toBe(lightColors.border);

    const darkRender = await renderMenu(
      { spaces: [{ id: 'personal', name: 'Personal', type: 'personal' }] },
      'dark',
    );
    expect(
      StyleSheet.flatten(
        darkRender.screen.getByLabelText('Espacio de pareja').props.style,
      ).borderColor,
    ).toBe(darkColors.border);
  });

  it('no duplica el botón de espacio de pareja si ya existe uno real', async () => {
    const { screen } = await renderMenu();

    expect(screen.queryByText('Espacio de pareja')).toBeNull();
    expect(screen.getByLabelText('Seleccionar espacio Juntos')).toBeTruthy();
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
