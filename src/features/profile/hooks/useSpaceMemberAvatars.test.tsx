import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSpaceMemberAvatars } from '@/features/profile/hooks/useSpaceMemberAvatars';
import type {
  LocalProfile,
  SpaceMemberProfile,
} from '@/features/profile/types';
import type { Space } from '@/features/spaces/types';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockListSpaceMemberProfiles = jest.fn();
let mockLocalProfile: LocalProfile;
let mockLocalProfileSubscriber: ((profile: LocalProfile) => void) | null;
let mockMemberProfileSubscriber: (() => void) | null;

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => mockLocalProfile),
  subscribeToLocalProfile: jest.fn(
    (subscriber: (profile: LocalProfile) => void) => {
      mockLocalProfileSubscriber = subscriber;
      return () => {
        mockLocalProfileSubscriber = null;
      };
    },
  ),
}));

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    listSpaceMemberProfiles: () => mockListSpaceMemberProfiles(),
    subscribeToSpaceMemberProfiles: jest.fn(
      (_spaceId: string, subscriber: () => void) => {
        mockMemberProfileSubscriber = subscriber;
        return () => {
          mockMemberProfileSubscriber = null;
        };
      },
    ),
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
    mockLocalProfile = {
      avatarPath: null,
      avatarUpdatedAt: null,
      avatarUri: 'file:///yo.jpg',
      countryCode: null,
      displayName: 'Ana',
    };
    mockLocalProfileSubscriber = null;
    mockMemberProfileSubscriber = null;
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

  it('actualiza las fotos propia y de la pareja sin remontar el encabezado', async () => {
    const screen = await renderWithTheme(<AvatarsProbe space={coupleSpace} />);
    expect(
      await screen.findByText('["file:///yo.jpg","file:///beto.jpg"]'),
    ).toBeTruthy();

    mockLocalProfile = {
      ...mockLocalProfile,
      avatarUri: 'file:///yo-nueva.jpg',
    };
    await act(async () => {
      mockLocalProfileSubscriber?.(mockLocalProfile);
    });
    expect(
      screen.getByText('["file:///yo-nueva.jpg","file:///beto.jpg"]'),
    ).toBeTruthy();

    const updatedProfiles: SpaceMemberProfile[] = [
      {
        userId: 'uuid-ana',
        avatarPath: null,
        avatarUpdatedAt: null,
        avatarUri: 'file:///yo-cache.jpg',
        defaultCurrency: null,
        displayName: 'Ana',
      },
      {
        userId: 'uuid-beto',
        avatarPath: 'remote/beto.jpg',
        avatarUpdatedAt: '2026-09-16T10:00:00.000Z',
        avatarUri: 'file:///beto-nueva.jpg',
        defaultCurrency: null,
        displayName: 'Beto',
      },
    ];
    mockListSpaceMemberProfiles.mockResolvedValue(updatedProfiles);
    await act(async () => {
      mockMemberProfileSubscriber?.();
    });

    expect(
      await screen.findByText(
        '["file:///yo-nueva.jpg","file:///beto-nueva.jpg"]',
      ),
    ).toBeTruthy();
  });
});
