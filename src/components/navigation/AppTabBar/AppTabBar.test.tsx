import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';
import { renderWithTheme } from '@/test/renderWithTheme';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

function createTabBarProps() {
  const navigate = jest.fn();
  const onCreatePress = jest.fn();
  const routes = [
    { key: 'Home-key', name: 'Home' },
    { key: 'Activity-key', name: 'Activity' },
    { key: 'Map-key', name: 'Map' },
  ];
  const props = {
    state: {
      index: 0,
      key: 'main-tabs',
      routeNames: routes.map((route) => route.name),
      routes,
      stale: false,
      type: 'tab',
    },
    descriptors: Object.fromEntries(
      routes.map((route) => [route.key, { options: {} }]),
    ),
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate,
    },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;

  return { navigate, onCreatePress, props };
}

describe('AppTabBar', () => {
  it('impide abrir Actividad y Mapa cuando esas rutas están bloqueadas', async () => {
    const { navigate, onCreatePress, props } = createTabBarProps();
    const screen = await renderWithTheme(
      <AppTabBar
        {...props}
        disabledRoutes={['Activity', 'Map']}
        onCreatePress={onCreatePress}
      />,
    );

    const activityTab = screen.getByLabelText('Actividad');
    const mapTab = screen.getByLabelText('Mapa');
    expect(activityTab.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(mapTab.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(activityTab);
    fireEvent.press(mapTab);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('mantiene las rutas navegables cuando el espacio está listo', async () => {
    const { navigate, onCreatePress, props } = createTabBarProps();
    const screen = await renderWithTheme(
      <AppTabBar {...props} onCreatePress={onCreatePress} />,
    );

    fireEvent.press(screen.getByLabelText('Actividad'));

    expect(navigate).toHaveBeenCalledWith('Activity', undefined);
  });

  it('presenta las tres pestañas en una cápsula y el botón morado separado en la misma línea', async () => {
    const { onCreatePress, props } = createTabBarProps();
    const screen = await renderWithTheme(
      <AppTabBar {...props} onCreatePress={onCreatePress} />,
    );

    expect(
      StyleSheet.flatten(screen.getByTestId('app-tab-bar').props.style),
    ).toMatchObject({
      alignItems: 'center',
      backgroundColor: 'transparent',
      bottom: 0,
      flexDirection: 'row',
      gap: spacing.md,
      left: 0,
      position: 'absolute',
      right: 0,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('app-tab-bar-tabs').props.style),
    ).toMatchObject({
      ...shadows.mainMenu,
      backgroundColor: colors.surface,
      borderRadius: radii.round,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('app-tab-item-Home').props.style),
    ).toMatchObject({
      backgroundColor: 'rgba(242, 242, 247, 1)',
      borderRadius: radii.round,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button-container').props.style,
      ).position,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('floating-create-button').props.style,
      ).backgroundColor,
    ).toBe(colors.cta);

    fireEvent.press(screen.getByTestId('floating-create-button'));
    expect(onCreatePress).toHaveBeenCalledTimes(1);
  });

  it('se oculta cuando su pantalla deja de estar disponible', async () => {
    const { onCreatePress, props } = createTabBarProps();
    const screen = await renderWithTheme(
      <AppTabBar {...props} onCreatePress={onCreatePress} visible={false} />,
    );

    expect(
      screen.getByTestId('app-tab-bar', { includeHiddenElements: true }).props
        .pointerEvents,
    ).toBe('none');
  });
});
