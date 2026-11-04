import {
  resetOccurredTimeSupportForTests,
  sendWithOccurredTimeSupport,
} from '@/features/sync/services/occurredTimeUploadSupport';
import { ApiError } from '@/services/api/client';

const rejection = new ApiError({
  status: 400,
  code: 'INVALID_SYNC_PAYLOAD',
  details: {
    path: ['transactions', 0, 'occurredTime'],
    reason: 'FIELD_NOT_ALLOWED',
  },
  message: 'Payload inválido',
});

const transactions = [
  { id: 'tx-1', occurredOn: '2026-11-04', occurredTime: '14:35' },
];

describe('sendWithOccurredTimeSupport', () => {
  beforeEach(() => resetOccurredTimeSupportForTests());

  it('envía la hora cuando el servidor la admite', async () => {
    const send = jest.fn(async () => 'ok');

    await expect(sendWithOccurredTimeSupport(transactions, send)).resolves.toBe(
      'ok',
    );
    expect(send).toHaveBeenCalledWith(transactions);
  });

  it('reenvía sin la hora si el servidor no la conoce y deja de enviarla', async () => {
    const send = jest
      .fn<Promise<string>, [Record<string, unknown>[]]>()
      .mockRejectedValueOnce(rejection)
      .mockResolvedValue('ok');

    await expect(sendWithOccurredTimeSupport(transactions, send)).resolves.toBe(
      'ok',
    );
    expect(send).toHaveBeenLastCalledWith([
      { id: 'tx-1', occurredOn: '2026-11-04' },
    ]);

    await sendWithOccurredTimeSupport(transactions, send);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[2]![0][0]).not.toHaveProperty('occurredTime');
  });

  it('no oculta otros rechazos del lote', async () => {
    const otherRejection = new ApiError({
      status: 400,
      code: 'INVALID_SYNC_PAYLOAD',
      details: { path: ['transactions', 0, 'amountMinor'], reason: 'INVALID' },
      message: 'Payload inválido',
    });
    const send = jest.fn(async () => {
      throw otherRejection;
    });

    await expect(sendWithOccurredTimeSupport(transactions, send)).rejects.toBe(
      otherRejection,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
