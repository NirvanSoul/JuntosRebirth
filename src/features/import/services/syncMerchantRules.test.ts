import {
  completeLocalMerchantRuleSync,
  failLocalMerchantRuleSync,
  prepareLocalMerchantRuleSync,
} from '@/features/import/repositories/localMerchantRuleRepository';
import { syncLocalMerchantRules } from '@/features/import/services/syncMerchantRules';
import type {
  ImportMerchantRuleSyncGateway,
  ImportMerchantRuleSyncPayload,
} from '@/features/import/types';

jest.mock('@/features/import/repositories/localMerchantRuleRepository');

const payload: ImportMerchantRuleSyncPayload = {
  installationId: 'installation-id',
  userId: 'user-id',
  rules: [
    {
      id: 'rule-id',
      spaceLocalId: 'space-id',
      categoryLocalId: 'category-id',
      normalizedMerchant: 'mercadona',
      confirmations: 1,
      source: 'import_correction',
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
  ],
};

describe('syncLocalMerchantRules', () => {
  const gateway: ImportMerchantRuleSyncGateway = {
    syncMerchantRules: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prepareLocalMerchantRuleSync).mockResolvedValue(payload);
  });

  it('confirma localmente solo tras el conteo remoto completo', async () => {
    jest.mocked(gateway.syncMerchantRules).mockResolvedValue(1);

    await expect(
      syncLocalMerchantRules({ userId: 'user-id', gateway }),
    ).resolves.toBe(1);

    expect(completeLocalMerchantRuleSync).toHaveBeenCalledWith(payload);
    expect(failLocalMerchantRuleSync).not.toHaveBeenCalled();
  });

  it('marca el lote como fallido si la API no confirma todas las reglas', async () => {
    jest.mocked(gateway.syncMerchantRules).mockResolvedValue(0);

    await expect(
      syncLocalMerchantRules({ userId: 'user-id', gateway }),
    ).rejects.toThrow('La API no confirmó todas las reglas de importación');

    expect(failLocalMerchantRuleSync).toHaveBeenCalledWith(payload);
  });
});
