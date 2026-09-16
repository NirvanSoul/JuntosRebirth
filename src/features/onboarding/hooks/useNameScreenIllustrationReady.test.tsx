import { act, renderHook } from '@testing-library/react-native';

import { useNameScreenIllustrationReady } from './useNameScreenIllustrationReady';

let resolvePreload: () => void = () => {};

jest.mock('@/features/onboarding/utils/preloadOnboardingIllustrations', () => ({
  preloadNameScreenIllustration: jest.fn(
    () =>
      new Promise<void>((resolve) => {
        resolvePreload = resolve;
      }),
  ),
}));

describe('useNameScreenIllustrationReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pasa a listo cuando la ilustración termina de cargar', async () => {
    const { result } = await renderHook(() => useNameScreenIllustrationReady());
    expect(result.current).toBe(false);

    await act(async () => {
      resolvePreload();
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });

  it('no bloquea el arranque más allá del tope de espera', async () => {
    const { result } = await renderHook(() =>
      useNameScreenIllustrationReady(400),
    );
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current).toBe(true);
  });
});
