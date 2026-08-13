import type { AuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import {
  confirmGuestDataMerge,
  login,
} from '@/features/auth/services/loginService';
import { listLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { loadSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { initialSpacesState, type SpacesState } from '@/features/spaces/types';
import { syncPendingLocalDataForCurrentSession } from '@/features/sync/services/migrateAuthenticatedGuestData';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import type { SessionTransaction } from '@/features/transactions/types';

jest.mock('@/features/auth/gateways/supabaseAuthGateway');
jest.mock('@/features/categories/repositories/localCategoryRepository');
jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/features/sync/services/migrateAuthenticatedGuestData');
jest.mock('@/features/sync/services/restoreRemoteAccount');
jest.mock('@/features/transactions/repositories/localTransactionRepository');

function createGatewayStub(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signUp: jest.fn(),
    verifyOtp: jest.fn(),
    resendSignUpCode: jest.fn(),
    resendRecoveryCode: jest.fn(),
    signInWithPassword: jest.fn(async () => ({ userId: 'user-1' })),
    requestPasswordReset: jest.fn(),
    setNewPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    ...overrides,
  };
}

describe('loginService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createSupabaseAuthGateway).mockReturnValue(createGatewayStub());
    jest.mocked(loadSpaces).mockResolvedValue(initialSpacesState);
    jest.mocked(listLocalCategories).mockResolvedValue([]);
    jest.mocked(listLocalTransactions).mockResolvedValue([]);
    jest.mocked(restoreRemoteAccountForCurrentSession).mockResolvedValue({
      spaces: initialSpacesState.spaces,
      localCategoryIdByRemoteId: new Map(),
      localSpaceIdByRemoteId: new Map(),
    });
  });

  it('inicia sesión sin pedir confirmación cuando el dispositivo solo tiene el estado por defecto', async () => {
    const outcome = await login({ email: 'a@b.com', password: 'secret1234' });

    expect(outcome).toEqual({ status: 'signed-in' });
    expect(syncPendingLocalDataForCurrentSession).not.toHaveBeenCalled();
    expect(restoreRemoteAccountForCurrentSession).toHaveBeenCalled();
  });

  it('pide confirmación cuando hay transacciones guardadas como invitado', async () => {
    jest
      .mocked(listLocalTransactions)
      .mockResolvedValue([{ id: 't1' } as unknown as SessionTransaction]);

    const outcome = await login({ email: 'a@b.com', password: 'secret1234' });

    expect(outcome).toEqual({ status: 'needs-merge-confirmation' });
  });

  it('pide confirmación cuando hay categorías creadas por la persona, no solo las de fábrica', async () => {
    jest
      .mocked(listLocalCategories)
      .mockResolvedValue([
        { id: 'c1', isDefault: false } as unknown as Category,
      ]);

    const outcome = await login({ email: 'a@b.com', password: 'secret1234' });

    expect(outcome).toEqual({ status: 'needs-merge-confirmation' });
  });

  it('no pide confirmación si las únicas categorías presentes son las de fábrica', async () => {
    jest
      .mocked(listLocalCategories)
      .mockResolvedValue([
        { id: 'c1', isDefault: true } as unknown as Category,
      ]);

    const outcome = await login({ email: 'a@b.com', password: 'secret1234' });

    expect(outcome).toEqual({ status: 'signed-in' });
  });

  it('pide confirmación cuando hay más espacios que los que trae la app de fábrica', async () => {
    const state: SpacesState = {
      activeSpaceId: 'personal',
      spaces: [
        ...initialSpacesState.spaces,
        { id: 'extra', name: 'Otro', type: 'other' },
      ],
    };
    jest.mocked(loadSpaces).mockResolvedValue(state);

    const outcome = await login({ email: 'a@b.com', password: 'secret1234' });

    expect(outcome).toEqual({ status: 'needs-merge-confirmation' });
  });

  it('confirmGuestDataMerge sincroniza con confirmOwnership en true', async () => {
    await confirmGuestDataMerge();

    expect(syncPendingLocalDataForCurrentSession).toHaveBeenCalledWith({
      spaces: initialSpacesState.spaces,
      confirmOwnership: true,
    });
  });
});
