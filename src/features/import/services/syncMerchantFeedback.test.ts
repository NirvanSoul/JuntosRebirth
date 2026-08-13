import {
  completeLocalMerchantFeedbackSync,
  failLocalMerchantFeedbackSync,
  prepareLocalMerchantFeedbackSync,
} from '@/features/import/repositories/localMerchantFeedbackQueueRepository';
import { syncLocalMerchantFeedback } from '@/features/import/services/syncMerchantFeedback';
import type { MerchantFeedbackSyncGateway } from '@/features/import/types';

jest.mock(
  '@/features/import/repositories/localMerchantFeedbackQueueRepository',
);

const mockPrepare = prepareLocalMerchantFeedbackSync as jest.Mock;
const mockComplete = completeLocalMerchantFeedbackSync as jest.Mock;
const mockFail = failLocalMerchantFeedbackSync as jest.Mock;

describe('syncLocalMerchantFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirma cada voto por separado, sin dejar que uno rechazado bloquee los demás', async () => {
    mockPrepare.mockResolvedValueOnce([
      { id: 'a', importItemId: 'item-a', canonicalCategoryKey: 'groceries' },
      { id: 'b', importItemId: 'item-b', canonicalCategoryKey: 'transport' },
    ]);
    const recordMerchantFeedback = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('no elegible'));
    const gateway: MerchantFeedbackSyncGateway = { recordMerchantFeedback };

    await expect(syncLocalMerchantFeedback({ gateway })).resolves.toEqual({
      syncedCount: 1,
      failedCount: 1,
    });

    expect(mockComplete).toHaveBeenCalledWith('a');
    expect(mockFail).toHaveBeenCalledWith('b');
  });

  it('no llama al gateway cuando no hay votos pendientes', async () => {
    mockPrepare.mockResolvedValueOnce([]);
    const recordMerchantFeedback = jest.fn();

    await expect(
      syncLocalMerchantFeedback({ gateway: { recordMerchantFeedback } }),
    ).resolves.toEqual({ syncedCount: 0, failedCount: 0 });
    expect(recordMerchantFeedback).not.toHaveBeenCalled();
  });
});
