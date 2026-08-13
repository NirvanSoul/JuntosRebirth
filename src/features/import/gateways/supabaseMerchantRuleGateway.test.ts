import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseMerchantRuleGateway } from '@/features/import/gateways/supabaseMerchantRuleGateway';
import type { ImportMerchantRuleSyncPayload } from '@/features/import/types';

const payload: ImportMerchantRuleSyncPayload = {
  installationId: 'installation-id',
  userId: 'user-id',
  rules: [
    {
      id: 'rule-id',
      spaceLocalId: 'space-id',
      categoryLocalId: 'category-id',
      normalizedMerchant: 'mercadona',
      confirmations: 2,
      source: 'import_correction',
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
  ],
};

describe('supabaseMerchantRuleGateway', () => {
  it('verifica la sesión y envía únicamente el payload normalizado al RPC', async () => {
    const rpc = jest.fn(async () => ({ data: 1, error: null }));
    const client = {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: 'user-id' } },
          error: null,
        })),
      },
      rpc,
    } as unknown as SupabaseClient;

    await expect(
      createSupabaseMerchantRuleGateway(client).syncMerchantRules(payload),
    ).resolves.toBe(1);

    expect(rpc).toHaveBeenCalledWith('sync_import_merchant_rules', {
      p_installation_id: 'installation-id',
      p_rules: [
        expect.objectContaining({
          space_local_id: 'space-id',
          category_local_id: 'category-id',
          normalized_merchant: 'mercadona',
        }),
      ],
    });
  });

  it('rechaza una sesión que cambió antes de sincronizar', async () => {
    const client = {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: 'other-user' } },
          error: null,
        })),
      },
      rpc: jest.fn(),
    } as unknown as SupabaseClient;

    await expect(
      createSupabaseMerchantRuleGateway(client).syncMerchantRules(payload),
    ).rejects.toThrow('La sesión cambió antes de sincronizar las reglas');
  });
});
