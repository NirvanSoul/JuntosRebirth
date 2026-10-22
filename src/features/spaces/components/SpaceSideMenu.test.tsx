import type { ComponentProps } from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { SpaceSideMenu } from '@/features/spaces/components/SpaceSideMenu';
import type { Space } from '@/features/spaces/types';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors, darkColors, lightColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import type { AppearancePreference } from '@/theme/types';

const spaces: Space[] = [
  { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
  { id: 'juntos', name: 'Juntos', type: 'couple', currency: 'EUR' },
  { id: 'home', name: 'Casa', type: 'other', currency: 'EUR' },
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
    profileAvatarUri: 'file:///avatar.jpg?v=1',
    profileName: 'Farruel',
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
  it('selecciona espacios y abre Ajustes desde el bloque de acciones', async () => {
    const { props, screen } = await renderMenu();

    await fireEvent.press(screen.getByLabelText('Seleccionar espacio Casa'));

    await waitFor(() =>
      expect(props.onSelectSpace).toHaveBeenCalledWith('home'),
    );
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    await fireEvent.press(screen.getByText('Ajustes'));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('cambia primero el botón y, al terminar, cierra el menú y cambia de espacio', async () => {
    jest.useFakeTimers();
    try {
      let finishSelection: (() => void) | undefined;
      const onSelectSpace = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            finishSelection = resolve;
          }),
      );
      const { props, screen } = await renderMenu({ onSelectSpace });

      await fireEvent.press(
        screen.getByLabelText('Seleccionar espacio Juntos'),
      );

      expect(
        screen.getByLabelText('Seleccionar espacio Juntos').props
          .accessibilityState?.checked,
      ).toBe(true);
      expect(
        screen.getByLabelText('Seleccionar espacio Personal').props
          .accessibilityState?.checked,
      ).toBe(false);
      expect(onSelectSpace).not.toHaveBeenCalled();

      expect(props.onClose).not.toHaveBeenCalled();

      // Al asentarse la píldora se cierra el menú y empieza el cambio, sin
      // esperar a que termine de persistirse la selección.
      await act(async () => {
        jest.advanceTimersByTime(motion.spaceSelectionDuration);
      });
      expect(onSelectSpace).toHaveBeenCalledWith('juntos');
      expect(props.onClose).toHaveBeenCalledTimes(1);

      finishSelection?.();
    } finally {
      jest.useRealTimers();
    }
  });

  it('cierra el menú sin transición al tocar el espacio que ya está activo', async () => {
    const { props, screen } = await renderMenu();

    await fireEvent.press(
      screen.getByLabelText('Seleccionar espacio Personal'),
    );

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSelectSpace).not.toHaveBeenCalled();
  });

  it('vuelve a marcar el espacio anterior si el cambio falla', async () => {
    const { screen } = await renderMenu({
      onSelectSpace: jest.fn(async () => {
        throw new Error('fallo');
      }),
    });

    await fireEvent.press(screen.getByLabelText('Seleccionar espacio Casa'));

    expect(
      await screen.findByText(
        'No pudimos cambiar de espacio. Inténtalo de nuevo.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Seleccionar espacio Personal').props
        .accessibilityState?.checked,
    ).toBe(true);
  });

  it('mantiene Personal primero y Juntos después aunque cambie el orden recibido', async () => {
    const { screen } = await renderMenu({
      activeSpaceId: 'juntos',
      spaces: [spaces[1]!, spaces[2]!, spaces[0]!],
    });

    const rows = screen.getAllByRole('radio');
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
      'Seleccionar espacio Personal',
      'Seleccionar espacio Juntos',
      'Seleccionar espacio Casa',
    ]);
    expect(rows.map((row) => row.props.accessibilityState?.checked)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('no muestra el botón de crear nuevo espacio (pendiente de habilitar)', async () => {
    const { screen } = await renderMenu();

    expect(screen.queryByTestId('add-space-button')).toBeNull();
    expect(screen.queryByText('Crear nuevo espacio')).toBeNull();
  });

  it('muestra "Juntos" debajo de Personal y dispara onInvitePartner al tocarlo', async () => {
    const { props, screen } = await renderMenu({
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
      ],
    });

    const button = screen.getByLabelText('Seleccionar espacio Juntos');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);

    await fireEvent.press(button);
    await waitFor(() => expect(props.onInvitePartner).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });

  it('el botón "Juntos" se ve como un botón real, con borde propio del tema claro y oscuro', async () => {
    const lightRender = await renderMenu(
      {
        spaces: [
          {
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
          },
        ],
      },
      'light',
    );
    expect(
      StyleSheet.flatten(
        lightRender.screen.getByTestId('space-icon-invite-juntos-surface').props
          .style,
      ).borderColor,
    ).toBe(lightColors.border);

    const darkRender = await renderMenu(
      {
        spaces: [
          {
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            currency: 'EUR',
          },
        ],
      },
      'dark',
    );
    expect(
      StyleSheet.flatten(
        darkRender.screen.getByTestId('space-icon-invite-juntos-surface').props
          .style,
      ).borderColor,
    ).toBe(darkColors.border);
  });

  it('no duplica el botón de espacio de pareja si ya existe uno real', async () => {
    const { screen } = await renderMenu();

    expect(screen.getAllByText('Juntos')).toHaveLength(1);
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
    expect(
      StyleSheet.flatten(
        screen.getByLabelText('Cerrar menú de espacios').props.style,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(screen.getByTestId('side-menu-close-icon').props.style)
        .color,
    ).toBe(colors.textMuted);
  });

  it('resalta Espacio de pareja y desmarca el espacio personal cuando isInvitePartnerActive es true', async () => {
    const { screen } = await renderMenu({
      activeSpaceId: 'personal',
      isInvitePartnerActive: true,
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
      ],
    });

    const personalRow = screen.getByLabelText('Seleccionar espacio Personal');
    expect(personalRow.props.accessibilityState?.checked).toBe(false);

    const coupleButton = screen.getByLabelText('Seleccionar espacio Juntos');
    expect(coupleButton.props.accessibilityState?.selected).toBe(true);
    // La superficie propia del botón se retira para dejar ver la píldora.
    expect(
      StyleSheet.flatten(
        screen.getByTestId('space-icon-invite-juntos-surface').props.style,
      ).opacity,
    ).toBe(0);
    expect(
      StyleSheet.flatten(within(coupleButton).getByText('Juntos').props.style)
        .color,
    ).toBe(colors.onBrand);
    expect(
      StyleSheet.flatten(within(coupleButton).getByText('Juntos').props.style)
        .fontSize,
    ).toBe(20);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('space-icon-invite-juntos').props.style,
      ).color,
    ).toBe(colors.onBrand);
  });

  it('coloca la píldora de marca detrás del espacio activo y la desliza al elegido', async () => {
    jest.useFakeTimers();
    try {
      const { screen } = await renderMenu();
      const layoutRow = (label: string, y: number) =>
        fireEvent(screen.getByLabelText(label), 'layout', {
          nativeEvent: { layout: { x: 0, y, width: 300, height: 64 } },
        });
      const pillStyle = () =>
        getAnimatedStyle(screen.getByTestId('space-selection-pill'));
      const settle = () =>
        act(async () => {
          jest.advanceTimersByTime(1000);
        });

      await layoutRow('Seleccionar espacio Personal', 0);
      await layoutRow('Seleccionar espacio Juntos', 72);
      await layoutRow('Seleccionar espacio Casa', 144);
      await settle();
      expect(
        StyleSheet.flatten(
          screen.getByTestId('space-selection-pill').props.style,
        ).backgroundColor,
      ).toBe(colors.cta);
      expect(pillStyle()).toMatchObject({
        height: 64,
        opacity: 1,
        transform: [{ translateY: 0 }],
      });

      await fireEvent.press(screen.getByLabelText('Seleccionar espacio Casa'));
      await settle();
      expect(pillStyle().transform).toEqual([{ translateY: 144 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('muestra la foto y el nombre de perfil y abre su editor', async () => {
    const { screen } = await renderMenu();

    expect(screen.getByText('Farruel')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Espacios' })).toBeTruthy();
    expect(screen.getByTestId('side-menu-profile-avatar').props.source).toEqual(
      { uri: 'file:///avatar.jpg?v=1' },
    );

    await fireEvent.press(screen.getByTestId('side-menu-profile-button'));

    expect(screen.getByTestId('profile-editor-modal')).toBeTruthy();
    expect(screen.getByTestId('profile-editor-name-input')).toBeTruthy();
  });

  it('permite cambiar el tema desde el propio menú y adapta el icono', async () => {
    const { screen } = await renderMenu();

    expect(
      screen.getByTestId('appearance-menu-icon-light', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('side-menu-dark-mode-toggle').props.style,
      ).transform,
    ).toEqual([{ scale: 0.84 }]);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('side-menu-dark-mode-toggle').props.style,
      ).marginTop,
    ).toBe(8);
    fireEvent(
      screen.getByTestId('side-menu-dark-mode-toggle'),
      'valueChange',
      true,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('appearance-menu-icon-dark', {
          includeHiddenElements: true,
        }),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId('side-menu-dark-mode-toggle').props.value).toBe(
      true,
    );
  });
});
