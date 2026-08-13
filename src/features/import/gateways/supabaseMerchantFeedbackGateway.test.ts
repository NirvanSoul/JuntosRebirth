import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseMerchantFeedbackGateway } from '@/features/import/gateways/supabaseMerchantFeedbackGateway';

describe('supabaseMerchantFeedbackGateway', () => {
  it('envía el ítem y la clave canónica al RPC', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await createSupabaseMerchantFeedbackGateway(client).recordMerchantFeedback({
      importItemId: 'item-1',
      canonicalCategoryKey: 'groceries',
    });

    expect(rpc).toHaveBeenCalledWith('record_merchant_feedback', {
      p_import_item_id: 'item-1',
      p_canonical_category_key: 'groceries',
    });
  });

  it('lanza si el servidor rechaza el voto', async () => {
    const client = {
      rpc: jest.fn(async () => ({
        data: null,
        error: {
          message: 'import item is not eligible for community feedback',
        },
      })),
    } as unknown as SupabaseClient;

    await expect(
      createSupabaseMerchantFeedbackGateway(client).recordMerchantFeedback({
        importItemId: 'item-1',
        canonicalCategoryKey: 'groceries',
      }),
    ).rejects.toThrow('No pudimos enviar tu confirmación');
  });
});
