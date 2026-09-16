import type { SharedValue } from 'react-native-reanimated';

import { createLoadingProgress } from '@/components/feedback/LoadingState/LoadingProgressProvider';

jest.mock('react-native-reanimated', () => ({
  Easing: { out: () => undefined, quad: undefined, cubic: undefined },
  ReduceMotion: { System: 'system' },
  cancelAnimation: jest.fn(),
  useSharedValue: jest.fn(),
  withSequence: (...steps: number[]) => steps[steps.length - 1],
  withTiming: (target: number) => target,
}));

function createProgress() {
  const progress = { value: 0 } as SharedValue<number>;
  return { progress, controller: createLoadingProgress(progress) };
}

describe('createLoadingProgress', () => {
  it('avanza una sola vez desde cero y termina al completar', () => {
    const { progress, controller } = createProgress();
    controller.begin();
    expect(progress.value).toBe(0.92);
    controller.complete();
    expect(progress.value).toBe(1);
    controller.begin();
    expect(progress.value).toBe(0.92);
  });

  it('continúa la barra que otra etapa suelta en el mismo commit', () => {
    const { progress, controller } = createProgress();
    controller.begin();
    progress.value = 0.5;
    controller.release();
    controller.begin();
    expect(progress.value).toBe(0.5);
  });

  it('vuelve a empezar si nadie toma el relevo de inmediato', async () => {
    const { progress, controller } = createProgress();
    controller.begin();
    progress.value = 0.5;
    controller.release();
    await Promise.resolve();
    controller.begin();
    expect(progress.value).toBe(0.92);
  });
});
