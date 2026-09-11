import {
  clearStartupMarksForTest,
  getStartupMarks,
  markStartup,
  reportStartupTrace,
} from './startupTrace';

declare let __DEV__: boolean;

describe('startupTrace', () => {
  const originalDev = __DEV__;

  beforeEach(() => {
    clearStartupMarksForTest();
    jest.clearAllMocks();
    __DEV__ = true;
  });

  afterEach(() => {
    __DEV__ = originalDev;
  });

  it('registra marcas correctamente y de forma idempotente', () => {
    markStartup('bundle_evaluated');
    const firstTime = getStartupMarks().get('bundle_evaluated');
    expect(firstTime).toBeDefined();

    // Segunda llamada a la misma marca no cambia el valor registrado
    markStartup('bundle_evaluated');
    expect(getStartupMarks().get('bundle_evaluated')).toBe(firstTime);
  });

  it('no registra nada si __DEV__ es false', () => {
    __DEV__ = false;
    markStartup('fonts_ready');
    expect(getStartupMarks().has('fonts_ready')).toBe(false);
  });

  it('emite el reporte por console.info al marcar init_done', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    markStartup('bundle_evaluated');
    markStartup('fonts_ready');
    markStartup('init_done');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[startup-trace]',
      expect.objectContaining({
        bundle_evaluated: expect.any(Object),
        fonts_ready: expect.any(Object),
        init_done: expect.any(Object),
      }),
    );

    consoleSpy.mockRestore();
  });

  it('no emite reporte si __DEV__ es false al llamar reportStartupTrace', () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    markStartup('bundle_evaluated');
    __DEV__ = false;
    reportStartupTrace();

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
