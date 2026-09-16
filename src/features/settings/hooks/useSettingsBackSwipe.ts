import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';

const activationDistance = 20;
const commitDistance = 72;
const commitVelocity = 600;
const verticalTolerance = 15;

/** Gesto horizontal de vuelta que no compite con el scroll vertical. */
export function useSettingsBackSwipe(onBack: () => void) {
  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(activationDistance)
        .failOffsetX(-activationDistance)
        .failOffsetY([-verticalTolerance, verticalTolerance])
        .runOnJS(true)
        .onEnd(({ translationX, velocityX }) => {
          if (translationX >= commitDistance || velocityX >= commitVelocity) {
            onBack();
          }
        })
        .withTestId('settings-back-swipe'),
    [onBack],
  );
}
