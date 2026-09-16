import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useLocalDisplayName } from '@/features/profile/hooks/useLocalDisplayName';
import type { LocalProfile } from '@/features/profile/types';
import { renderWithTheme } from '@/test/renderWithTheme';

let mockProfile: LocalProfile = {
  avatarPath: null,
  avatarUpdatedAt: null,
  avatarUri: null,
  countryCode: null,
  displayName: 'Ana',
};
let mockProfileSubscriber: ((profile: LocalProfile) => void) | null = null;

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => mockProfile),
  subscribeToLocalProfile: jest.fn(
    (subscriber: (profile: LocalProfile) => void) => {
      mockProfileSubscriber = subscriber;
      return () => {
        mockProfileSubscriber = null;
      };
    },
  ),
}));
function DisplayNameProbe() {
  return <Text>{useLocalDisplayName() ?? 'sin nombre'}</Text>;
}

describe('useLocalDisplayName', () => {
  beforeEach(() => {
    mockProfile = { ...mockProfile, displayName: 'Ana' };
    mockProfileSubscriber = null;
  });

  it('refleja inmediatamente los cambios del perfil local', async () => {
    const screen = await renderWithTheme(<DisplayNameProbe />);
    expect(await screen.findByText('Ana')).toBeTruthy();

    mockProfile = { ...mockProfile, displayName: 'Beatriz' };
    await act(async () => {
      mockProfileSubscriber?.(mockProfile);
    });

    expect(screen.getByText('Beatriz')).toBeTruthy();
  });
});
