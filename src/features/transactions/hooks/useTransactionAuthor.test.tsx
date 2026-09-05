import { Text } from 'react-native';

import { SpaceMembershipProvider } from '@/features/profile/state/SpaceMembershipContext';
import { useTransactionAuthor } from '@/features/transactions/hooks/useTransactionAuthor';
import { formatAuthorName } from '@/features/transactions/utils/transactionAuthor';
import type { Space } from '@/features/spaces/types';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(async () => 'uuid-ana'),
}));

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    listSpaceMemberProfiles: jest.fn(async () => [
      {
        userId: 'uuid-ana',
        displayName: 'Ana',
        avatarPath: null,
        avatarUpdatedAt: null,
        avatarUri: null,
      },
      {
        userId: 'uuid-beto',
        displayName: 'Beto',
        avatarPath: null,
        avatarUpdatedAt: null,
        avatarUri: null,
      },
    ]),
  }),
);

jest.mock('@/features/profile/services/syncOwnAvatar', () => ({
  syncOwnAvatar: jest.fn(async () => false),
}));

jest.mock('@/features/profile/services/syncSpaceMemberProfiles', () => ({
  syncSpaceMemberProfiles: jest.fn(async () => true),
}));

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(async () => ({
    getFirstAsync: jest.fn(async () => ({
      avatar_path: 'file:///avatar.jpg',
      avatar_updated_at: '2026-09-02T10:00:00Z',
      avatar_remote_path: 'remote/avatar.jpg',
      avatar_remote_updated_at: '2026-09-02T10:00:00Z',
      display_name: 'Ana',
    })),
  })),
}));

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

function AuthorProbe({ createdBy }: { createdBy: string }) {
  const author = useTransactionAuthor(createdBy);
  return (
    <Text testID="probe">
      {author ? formatAuthorName(author) : 'sin autor'}
    </Text>
  );
}

describe('useTransactionAuthor', () => {
  it('nombra a la otra persona en un espacio juntos', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={coupleSpace}>
        <AuthorProbe createdBy="uuid-beto" />
      </SpaceMembershipProvider>,
    );

    expect(await screen.findByText('Beto')).toBeTruthy();
  });

  it('nombra al propio usuario en un espacio juntos con su nombre de perfil', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={coupleSpace}>
        <AuthorProbe createdBy="uuid-ana" />
      </SpaceMembershipProvider>,
    );

    expect(await screen.findByText('Ana')).toBeTruthy();
  });

  it('no devuelve autor en un espacio personal, donde el dato sería ruido', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={personalSpace}>
        <AuthorProbe createdBy="uuid-ana" />
      </SpaceMembershipProvider>,
    );

    expect(await screen.findByText('sin autor')).toBeTruthy();
  });

  it('no atribuye una fila antigua sin autor autenticado', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={coupleSpace}>
        <AuthorProbe createdBy="install-abc" />
      </SpaceMembershipProvider>,
    );

    expect(await screen.findByText('Desconocido')).toBeTruthy();
  });
});
