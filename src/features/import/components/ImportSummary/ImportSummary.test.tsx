import { ImportSummary } from '@/features/import/components/ImportSummary/ImportSummary';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('ImportSummary', () => {
  it('muestra los cuatro contadores de la revisión', async () => {
    const screen = await renderWithTheme(
      <ImportSummary
        counts={{ detected: 47, ready: 38, needsReview: 6, duplicates: 3 }}
      />,
    );

    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('Encontrados')).toBeTruthy();
    expect(screen.getByText('38')).toBeTruthy();
    expect(screen.getByText('Listos')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('Para revisar')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Ya existen')).toBeTruthy();
  });
});
