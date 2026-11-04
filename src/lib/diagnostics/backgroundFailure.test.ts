import { ApiError } from '@/services/api/client';

import { isNetworkFailure, reportBackgroundFailure } from './backgroundFailure';

describe('isNetworkFailure', () => {
  it('reconoce el corte normalizado por la API y los nativos', () => {
    expect(
      isNetworkFailure(
        new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      ),
    ).toBe(true);
    expect(isNetworkFailure(new TypeError('Network request failed'))).toBe(
      true,
    );
    const aborted = new Error('Aborted');
    aborted.name = 'AbortError';
    expect(isNetworkFailure(aborted)).toBe(true);
  });

  it('no confunde otros fallos con falta de red', () => {
    expect(
      isNetworkFailure(
        new ApiError({ status: 500, code: 'API_ERROR', message: 'x' }),
      ),
    ).toBe(false);
    const parse = new SyntaxError('Network request failed');
    expect(isNetworkFailure(parse)).toBe(false);
    expect(isNetworkFailure(new Error('boom'))).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
  });
});

describe('reportBackgroundFailure', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorSpy.mockRestore());

  it('calla los fallos por falta de red', () => {
    reportBackgroundFailure(
      '[profiles] no se pudo refrescar el censo',
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      { spaceId: 'space-1' },
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('registra el resto, con su contexto', () => {
    const error = new Error('boom');
    reportBackgroundFailure('[profiles] fallo', error, { spaceId: 'space-1' });
    reportBackgroundFailure('[sync] fallo', error);
    expect(errorSpy).toHaveBeenNthCalledWith(1, '[profiles] fallo', {
      spaceId: 'space-1',
      error,
    });
    expect(errorSpy).toHaveBeenNthCalledWith(2, '[sync] fallo', error);
  });
});
