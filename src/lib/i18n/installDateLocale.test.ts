import { formatMonthKey } from '@/features/categories/utils/categorySummary';
import { formatTransactionPeriod } from '@/features/dashboard/utils/transactionPeriod';
import { formatTransactionDetailDate } from '@/features/transactions/components/TransactionDetailModal/transactionDetailPresentation';
import { formatNumericLocalDate } from '@/lib/date/localDate';
import { i18n } from '@/lib/i18n/i18n';
import { translateText } from '@/lib/i18n/translateText';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

describe('fechas en el idioma activo', () => {
  it('mantiene el formato español como referencia', () => {
    expect(formatNumericLocalDate('2026-10-03')).toBe('03/10/2026');
    expect(formatTransactionDetailDate('2026-10-03')).toBe(
      '3 de octubre de 2026',
    );
  });

  it('usa el formato estadounidense en inglés, también en formateadores creados al cargar', async () => {
    await i18n.changeLanguage('en');

    expect(formatNumericLocalDate('2026-10-03')).toBe('10/03/2026');
    expect(formatTransactionDetailDate('2026-10-03')).toBe('October 3, 2026');
    expect(formatTransactionPeriod('month', new Date(2026, 9, 3, 12))).toBe(
      'October 2026',
    );
    expect(formatMonthKey('2026-10')).toBe('October 2026');
  });

  it('reordena la fecha compuesta del recordatorio y pasa las horas a 12 h', async () => {
    await i18n.changeLanguage('en');

    expect(translateText('Saturday, 3 de October de 2026')).toBe(
      'Saturday, October 3, 2026',
    );
    expect(translateText('20:05')).toBe('8:05 PM');
    expect(translateText('00:30')).toBe('12:30 AM');
    expect(translateText('Quitar recordatorio de las 09:00')).toBe(
      'Remove the 9:00 AM reminder',
    );
  });
});
