import { Text } from 'react-native';

import { useSpaceMemberAvatars } from '@/features/profile/hooks/useSpaceMemberAvatars';
import type { Space } from '@/features/spaces/types';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockListSpaceMemberProfiles = jest.fn();

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => ({
    avatarUri: 'file:///yo.jpg',
    displayName: 'Ana',
  })),
}));

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    listSpaceMemberProfiles: () => mockListSpaceMemberProfiles(),
  }),
);

const coupleSpace: Space = {
  id: 'space-couple',
  name: 'Juntos',
  type: 'couple',
  currency: 'EUR',
};

const personalSpace: Space = {
  id: 'personal',
  name: 'Personal',
  type: 'personal',
  currency: 'EUR',
};

function AvatarsProbe({ space }: { space: Space }) {
  const uris = useSpaceMemberAvatars(space);
  return <Text testID="probe">{JSON.stringify(uris)}</Text>;
}

describe('useSpaceMemberAvatars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('uuid-ana');
    mockListSpaceMemberProfiles.mockResolvedValue([
      { userId: 'uuid-ana', avatarUri: 'file:///yo-cache.jpg' },
      { userId: 'uuid-beto', avatarUri: 'file:///beto.jpg' },
    ]);
  });

  it('devuelve la foto propia y la de la pareja en un espacio juntos', async () => {
    const screen = await renderWithTheme(<AvatarsProbe space={coupleSpace} />);

    expect(
      await screen.findByText('["file:///yo.jpg","file:///beto.jpg"]'),
    ).toBeTruthy();
  });

  it('devuelve una sola foto en un espacio personal', async () => {
    const screen = await renderWithTheme(
      <AvatarsProbe space={personalSpace} />,
    );

    expect(await screen.findByText('["file:///yo.jpg"]')).toBeTruthy();
  });

  it('no coloca una foto ajena en el hueco de la pareja sin saber quién eres', async () => {
    // Modo invitado: sin uuid propio no se puede distinguir quién es «el otro»,
    // y elegir al azar pondría la foto equivocada en el botón.
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    const screen = await renderWithTheme(<AvatarsProbe space={coupleSpace} />);

    expect(await screen.findByText('["file:///yo.jpg",null]')).toBeTruthy();
  });
});
