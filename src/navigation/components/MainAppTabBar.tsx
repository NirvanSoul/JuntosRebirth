import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useDrawerStatus } from '@react-navigation/drawer';

import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';

type MainAppTabBarProps = BottomTabBarProps & {
  createDisabled: boolean;
  onCreatePress: () => void;
};

/** Une la barra de pestañas con la visibilidad del drawer que la contiene. */
export function MainAppTabBar({
  createDisabled,
  onCreatePress,
  ...props
}: MainAppTabBarProps) {
  const drawerStatus = useDrawerStatus();

  return (
    <AppTabBar
      {...props}
      createDisabled={createDisabled}
      disabledRoutes={createDisabled ? ['Activity', 'Map'] : undefined}
      onCreatePress={onCreatePress}
      visible={drawerStatus === 'closed'}
    />
  );
}
