import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalMoneyAccount } from '@/features/accounts/repositories/localMoneyAccountRepository';
import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { createLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import { assignDemoAuthorship } from '@/features/demo/repositories/demoAuthorshipRepository';
import { applyDemoExchangeSnapshots } from '@/features/demo/repositories/demoExchangeSnapshotRepository';
import { buildDemoExchangeSnapshot } from '@/features/demo/utils/demoVenezuelaRates';
import {
  createDemoUser,
  deleteDemoUser,
} from '@/features/demo/services/demoUserService';
import { replaceSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { saveSpaces } from '@/features/spaces/repositories/localSpaceRepository';
import { claimLocalCacheOwnership } from '@/features/sync/repositories/localSyncAccountRepository';
import {
  createLocalTransaction,
  createLocalTransactions,
} from '@/features/transactions/repositories/localTransactionRepository';
import type { CreateTransactionDraft } from '@/features/transactions/types';
import {
  loadCurrencyPreferences,
  saveCurrencyPreferences,
} from '@/state/appPreferences/currencyPreferencesRepository';
import {
  getDemoSession,
  resetDemoSessionStoreForTests,
} from '@/state/demoSession/demoSessionStore';

jest.mock('@/features/accounts/repositories/localMoneyAccountRepository');
jest.mock('@/features/auth/services/discardBackedLocalSessionCache');
jest.mock('@/features/categories/repositories/localCategoryRepository');
jest.mock('@/features/demo/repositories/demoAuthorshipRepository');
jest.mock('@/features/demo/repositories/demoExchangeSnapshotRepository');
jest.mock('@/features/profile/repositories/localProfileRepository');
jest.mock('@/features/profile/repositories/localSpaceMemberProfileRepository');
jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/features/sync/repositories/localSyncAccountRepository');
jest.mock('@/features/transactions/repositories/localTransactionRepository');
jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: jest.fn(async () => ({})),
}));
jest.mock('@/state/appPreferences/currencyPreferencesRepository');

let nextId = 0;
const newId = () => `id-${(nextId += 1)}`;

describe('demoUserService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetDemoSessionStoreForTests();
    nextId = 0;
    jest.mocked(discardBackedLocalSessionCache).mockResolvedValue(true);
    jest.mocked(saveCurrencyPreferences).mockResolvedValue();
    jest.mocked(loadCurrencyPreferences).mockResolvedValue({
      currencies: ['USD'],
    });
    jest
      .mocked(createLocalCategories)
      .mockImplementation(async (inputs) =>
        inputs.map((input) => ({ ...input, id: newId(), isArchived: false })),
      );
    jest.mocked(createLocalMoneyAccount).mockImplementation(async (input) => ({
      ...input,
      id: newId(),
      isArchived: false,
    }));
    const toRow = (draft: CreateTransactionDraft) => ({
      ...draft,
      id: newId(),
      createdBy: 'installation',
      updatedAt: '2026-10-17T10:00:00.000Z',
      recurrenceSeriesId: draft.recurrence === 'once' ? undefined : newId(),
    });
    jest
      .mocked(createLocalTransaction)
      .mockImplementation(async (draft) => [toRow(draft)]);
    jest
      .mocked(createLocalTransactions)
      .mockImplementation(async (drafts) => drafts.map(toRow));
  });

  it('siembra los dos espacios y abre la sesión solo al terminar', async () => {
    const savedSession = jest.fn();
    jest.mocked(assignDemoAuthorship).mockImplementation(async () => {
      savedSession(getDemoSession());
    });

    await createDemoUser('MXN');

    // Mientras se escribían los datos la navegación seguía en Acceso.
    expect(savedSession).toHaveBeenCalledWith(null);
    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['MXN'],
    });
    const spaces = jest.mocked(saveSpaces).mock.calls[0]![0].spaces;
    expect(spaces.map((space) => space.type)).toEqual(['personal', 'couple']);
    expect(spaces.every((space) => space.currency === 'MXN')).toBe(true);

    const session = getDemoSession()!;
    expect(session.currency).toBe('MXN');
    expect(session.email).toMatch(/@demo\.juntoss\.invalid$/);
    expect(session.previousCurrencyPreferences).toBe('["USD"]');
    expect(claimLocalCacheOwnership).toHaveBeenCalledWith({}, session.userId);

    const coupleId = spaces[1]!.id;
    const members = jest.mocked(replaceSpaceMemberProfiles).mock.calls[0]!;
    expect(members[0]).toBe(coupleId);
    expect(members[1].map((member) => member.displayName)).toEqual([
      session.displayName,
      session.partnerDisplayName,
    ]);

    const authorship = jest.mocked(assignDemoAuthorship).mock.calls[0]![0];
    expect(authorship.selfUserId).toBe(session.userId);
    expect(authorship.partnerUserId).toBe(session.partnerUserId);
    expect(authorship.partnerTransactionIds.length).toBeGreaterThan(10);
    expect(authorship.partnerSeriesIds.length).toBeGreaterThan(0);
  });

  it('deja la caché vacía y sin sesión si la siembra falla', async () => {
    jest
      .mocked(createLocalTransactions)
      .mockRejectedValueOnce(new Error('disco lleno'));

    await expect(createDemoUser('EUR')).rejects.toThrow('disco lleno');

    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(2);
    expect(saveCurrencyPreferences).toHaveBeenLastCalledWith({
      currencies: ['USD'],
    });
    expect(getDemoSession()).toBeNull();
  });

  it('al eliminarlo borra la caché y devuelve las monedas anteriores', async () => {
    await createDemoUser('COP');
    jest.clearAllMocks();

    await deleteDemoUser();

    expect(getDemoSession()).toBeNull();
    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['USD'],
    });
  });

  it('crea un usuario venezolano en USD con snapshots de tasa', async () => {
    await createDemoUser('VES');

    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['USD', 'VES'],
    });
    const spaces = jest.mocked(saveSpaces).mock.calls[0]![0].spaces;
    expect(spaces.every((space) => space.currency === 'USD')).toBe(true);
    const accounts = jest.mocked(createLocalMoneyAccount).mock.calls;
    expect(
      accounts.every(([input]) =>
        input.balances.every((balance) => balance.currency === 'USD'),
      ),
    ).toBe(true);
    const onceDrafts = jest
      .mocked(createLocalTransactions)
      .mock.calls.flatMap(([drafts]) => drafts);
    expect(onceDrafts.some((draft) => draft.currency === 'VES')).toBe(true);
    expect(applyDemoExchangeSnapshots).toHaveBeenCalledWith(
      buildDemoExchangeSnapshot,
    );
  });

  it('no añade snapshots de tasa fuera de Venezuela', async () => {
    await createDemoUser('EUR');

    expect(applyDemoExchangeSnapshots).not.toHaveBeenCalled();
  });
});
