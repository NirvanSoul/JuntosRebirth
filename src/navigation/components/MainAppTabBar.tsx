import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useDrawerStatus } from '@react-navigation/drawer';

import { AppTabBar } from '@/components/navigation/AppTabBar/AppTabBar';
import { useIsPreviewSelecting } from '@/components/overlays/PreviewActions/previewSelection';

type MainAppTabBarProps = BottomTabBarProps & {
  createDisabled: boolean;
  onCreatePress: () => void;
};

/**
 * Une la barra de pestañas con la visibilidad del drawer que la contiene. En
 * la selección múltiple de tarjetas baja fuera de la pantalla para dejar sitio
 * a la barra de la selección.
 */
export function MainAppTabBar({
  createDisabled,
  onCreatePress,
  ...props
}: MainAppTabBarProps) {
  const drawerStatus = useDrawerStatus();
  const isSelecting = useIsPreviewSelecting();

  return (
    <AppTabBar
      {...props}
      createDisabled={createDisabled}
      disabledRoutes={createDisabled ? ['Activity', 'Map'] : undefined}
      lowered={isSelecting}
      onCreatePress={onCreatePress}
      visible={drawerStatus === 'closed'}
    />
  );
}
