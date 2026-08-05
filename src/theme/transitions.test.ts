import { getDisclosureStaggerDelay } from '@/theme/transitions';

describe('disclosure transitions', () => {
  it('acota el stagger aunque haya muchos elementos', () => {
    expect(getDisclosureStaggerDelay(0)).toBe(0);
    expect(getDisclosureStaggerDelay(100)).toBe(120);
  });
});
