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

jest.mock('@/features/profile/services/syncSpaceMemberProfiles', () => ({
  syncSpaceMemberProfiles: jest.fn(async () => true),
}));

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(async () => ({})),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'install-abc'),
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

  it('no devuelve autor en un espacio personal, donde el dato sería ruido', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={personalSpace}>
        <AuthorProbe createdBy="uuid-ana" />
      </SpaceMembershipProvider>,
    );

    expect(await screen.findByText('sin autor')).toBeTruthy();
  });

  it('reconoce como propia la fila firmada con el id de instalación', async () => {
    const screen = await renderWithTheme(
      <SpaceMembershipProvider space={coupleSpace}>
        <AuthorProbe createdBy="install-abc" />
      </SpaceMembershipProvider>,
    );

    // Cae en el perfil propio, no en «Desconocido».
    expect(await screen.findByText('Ana')).toBeTruthy();
  });
});
