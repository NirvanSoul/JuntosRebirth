import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingCreateButton } from '@/components/navigation/FloatingCreateButton/FloatingCreateButton';
import { layout } from '@/theme/layout';

type MainFloatingActionsProps = {
  areSpaceActionsBlocked: boolean;
  isCreateButtonVisible: boolean;
  onCreatePress: () => void;
};

export function MainFloatingActions({
  areSpaceActionsBlocked,
  isCreateButtonVisible,
  onCreatePress,
}: MainFloatingActionsProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + layout.floatingActionTabOffset;

  return (
    <FloatingCreateButton
      bottom={bottom}
      onPress={onCreatePress}
      visible={isCreateButtonVisible && !areSpaceActionsBlocked}
    />
  );
}
