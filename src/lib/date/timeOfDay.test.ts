import {
  isValidTimeOfDay,
  resolveRegistrationTimeOfDay,
} from '@/lib/date/timeOfDay';

describe('timeOfDay', () => {
  it('acepta solo horas HH:mm de 24 h', () => {
    expect(isValidTimeOfDay('00:00')).toBe(true);
    expect(isValidTimeOfDay('23:59')).toBe(true);
    expect(isValidTimeOfDay('24:00')).toBe(false);
    expect(isValidTimeOfDay('9:05')).toBe(false);
    expect(isValidTimeOfDay('09:05:00')).toBe(false);
    expect(isValidTimeOfDay(null)).toBe(false);
  });

  it('usa la hora actual solo si el movimiento es de hoy', () => {
    const now = new Date(2026, 10, 4, 14, 35);

    expect(resolveRegistrationTimeOfDay('2026-11-04', now)).toBe('14:35');
    expect(resolveRegistrationTimeOfDay('2026-11-03', now)).toBeUndefined();
  });
});
