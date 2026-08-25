import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent } from '@testing-library/react-native';

import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';
import { renderWithTheme } from '@/test/renderWithTheme';

function createTabBarProps() {
  const navigate = jest.fn();
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

  return { navigate, props };
}

describe('AppTabBar', () => {
  it('impide abrir Actividad y Mapa cuando esas rutas están bloqueadas', async () => {
    const { navigate, props } = createTabBarProps();
    const screen = await renderWithTheme(
      <AppTabBar {...props} disabledRoutes={['Activity', 'Map']} />,
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
    const { navigate, props } = createTabBarProps();
    const screen = await renderWithTheme(<AppTabBar {...props} />);

    fireEvent.press(screen.getByLabelText('Actividad'));

    expect(navigate).toHaveBeenCalledWith('Activity', undefined);
  });
});
