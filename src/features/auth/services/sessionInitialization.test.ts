import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';

jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/features/sync/services/bootstrapRemoteAccount');
jest.mock('@/features/sync/services/restoreRemoteAccount');
jest.mock('@/features/sync/services/syncCoupleSpaceData');

describe('initializeAuthenticatedSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadSpaces as jest.Mock).mockResolvedValue({
      spaces: [
        { id: 'personal', name: 'Personal', type: 'personal' },
        { id: 'couple-space-1', name: 'Juntos', type: 'couple' },
      ],
    });
    (bootstrapRemoteAccount as jest.Mock).mockResolvedValue(undefined);
    (restoreRemoteAccountForCurrentSession as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('ejecuta bootstrap, sincroniza los espacios y restaura la cuenta', async () => {
    await initializeAuthenticatedSession();

    expect(bootstrapRemoteAccount).toHaveBeenCalled();
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'personal',
      includeLocalOnly: false,
    });
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'couple-space-1',
      includeLocalOnly: false,
    });
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalled();
  });

  it('no inicia una migración de invitado sin su confirmación explícita', async () => {
    await initializeAuthenticatedSession();

    expect(bootstrapRemoteAccount).toHaveBeenCalled();
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'personal',
      includeLocalOnly: false,
    });
    expect(syncSpaceDataForCurrentSession).toHaveBeenCalledWith({
      spaceId: 'couple-space-1',
      includeLocalOnly: false,
    });
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalled();
  });
});
