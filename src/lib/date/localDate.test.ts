import { getLocalTodayKey, toLocalDateKey } from '@/lib/date/localDate';

describe('toLocalDateKey', () => {
  it('rellena con ceros mes y día de un solo dígito', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('cambia de año al pasar del 31 de diciembre', () => {
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('admite el 29 de febrero en año bisiesto', () => {
    expect(toLocalDateKey(new Date(2028, 1, 29))).toBe('2028-02-29');
  });

  it('usa la hora local, no la UTC: una hora tardía no salta de día', () => {
    // 23:30 hora local. Si la implementación pasara a toISOString().slice(0, 10),
    // en zonas al oeste de UTC la clave saltaría al día siguiente y los
    // movimientos de noche se registrarían con fecha del día siguiente.
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('getLocalTodayKey', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('devuelve la fecha de hoy en hora local', () => {
    jest.useFakeTimers({ now: new Date(2026, 0, 5, 12, 0) });
    expect(getLocalTodayKey()).toBe('2026-01-05');
  });
});
