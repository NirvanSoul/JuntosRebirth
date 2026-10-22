import { renderHook } from '@testing-library/react-native';

import { useStableCallback } from './useStableCallback';

describe('useStableCallback', () => {
  it('conserva la identidad y ejecuta la última versión del callback', async () => {
    const first = jest.fn((value: number) => value + 1);
    const second = jest.fn((value: number) => value + 2);
    const { result, rerender } = await renderHook(
      ({ callback }: { callback: (value: number) => number }) =>
        useStableCallback(callback),
      { initialProps: { callback: first } },
    );
    const stable = result.current;

    await rerender({ callback: second });

    expect(result.current).toBe(stable);
    expect(result.current(1)).toBe(3);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });
});
