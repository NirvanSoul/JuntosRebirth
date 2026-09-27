import {
  getInitialMapCalendarRangeEnd,
  getNextMapCalendarRangeEnd,
  mapCalendarFutureMonthsPerBatch,
} from '@/features/map/model/calendarRange';

describe('calendarRange', () => {
  it('carga inicialmente solo veinticuatro meses por delante', () => {
    expect(mapCalendarFutureMonthsPerBatch).toBe(24);
    expect(getInitialMapCalendarRangeEnd('2026-02-02')).toBe('2028-02-29');
  });

  it('amplía el calendario en lotes de veinticuatro meses', () => {
    expect(getNextMapCalendarRangeEnd('2028-02-29')).toBe('2030-02-28');
  });

  it('no supera el límite máximo del calendario', () => {
    expect(getNextMapCalendarRangeEnd('2079-12-31')).toBe('2080-12-31');
  });
});
