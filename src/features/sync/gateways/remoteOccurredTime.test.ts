import { readRemoteOccurredTime } from '@/features/sync/gateways/remoteOccurredTime';

describe('readRemoteOccurredTime', () => {
  it('distingue una clave ausente de una hora borrada', () => {
    expect(readRemoteOccurredTime({ id: 'tx' })).toBeUndefined();
    expect(readRemoteOccurredTime({ occurredTime: null })).toBeNull();
    expect(readRemoteOccurredTime({ occurredTime: '14:35' })).toBe('14:35');
  });

  it('trata una hora malformada como ausente para no borrar la local', () => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(readRemoteOccurredTime({ occurredTime: '2:35 PM' })).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
