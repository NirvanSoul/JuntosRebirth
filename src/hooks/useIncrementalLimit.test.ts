import { act, renderHook } from '@testing-library/react-native';

import { useIncrementalLimit } from './useIncrementalLimit';

describe('useIncrementalLimit', () => {
  it('crece por páginas y vuelve a la primera al cambiar los filtros', async () => {
    const { result, rerender } = await renderHook(
      ({ filter }: { filter: string }) => useIncrementalLimit(40, [filter]),
      { initialProps: { filter: 'all' } },
    );
    expect(result.current.limit).toBe(40);

    await act(async () => result.current.showMore());
    await act(async () => result.current.showMore());
    expect(result.current.limit).toBe(120);

    await rerender({ filter: 'all' });
    expect(result.current.limit).toBe(120);

    await rerender({ filter: 'expense' });
    expect(result.current.limit).toBe(40);
  });
});
