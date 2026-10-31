import { Alert, Text, View } from 'react-native';

import { i18n } from '@/lib/i18n/i18n';
import { installTranslationHooks } from '@/lib/i18n/installTranslationHooks';
import { translateText } from '@/lib/i18n/translateText';
import { renderWithTheme } from '@/test/renderWithTheme';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

describe('translateText', () => {
  it('devuelve el texto en español sin cambios', () => {
    expect(translateText('Ver más')).toBe('Ver más');
  });

  it('traduce coincidencias exactas conservando espacios', async () => {
    await i18n.changeLanguage('en');
    expect(translateText('Ver más')).toBe('See more');
    expect(translateText(' Ver más ')).toBe(' See more ');
  });

  it.each([
    ['Oculta el contenido de gastos', 'Hides the content of expenses'],
    [
      'No hay ingresos efectivos en este periodo.',
      'There is no actual income in this period.',
    ],
    ['vs. año anterior', 'vs. previous year'],
    ['🇪🇸  España · EUR', '🇪🇸  Spain · EUR'],
    ['Comida por 20 €', 'Food for 20 €'],
    [
      'sube 5 % respecto al periodo anterior',
      'up 5 % from the previous period',
    ],
    [
      'Gasto: Supermercado, 20 €, 3 oct 2026. Autor: Ana',
      'Expense: Groceries, 20 €, 3 Oct 2026. Author: Ana',
    ],
    [
      'Caja, Efectivo, saldo 20 €, subió 5% respecto al mes anterior',
      'Caja, Cash, balance 20 €, up 5% from the previous month',
    ],
    [
      'Ana te invitó a compartir "Casa" en Juntos.',
      'Ana invited you to share "Casa" on Juntos.',
    ],
  ])('traduce el texto compuesto «%s»', async (spanish, english) => {
    await i18n.changeLanguage('en');
    expect(translateText(spanish)).toBe(english);
  });

  it('deja intacto un texto sin traducción', async () => {
    await i18n.changeLanguage('en');
    expect(translateText('Texto inventado sin entrada')).toBe(
      'Texto inventado sin entrada',
    );
  });

  it('traduce fechas formadas por días y meses', async () => {
    await i18n.changeLanguage('en');
    expect(translateText('lunes, 3 de octubre de 2026')).toBe(
      'Monday, October 3, 2026',
    );
    expect(translateText('Octubre 2026')).toBe('October 2026');
  });
});

describe('runtime JSX traducido', () => {
  it('traduce hijos, frases troceadas y etiquetas de accesibilidad', async () => {
    await i18n.changeLanguage('en');
    const errorSpy = jest.spyOn(console, 'error');
    const name = 'Ana';
    const screen = await renderWithTheme(
      <View accessibilityLabel="Ver más">
        <Text>Ver más</Text>
        <Text>Categoría {name}</Text>
      </View>,
    );

    expect(screen.getByText('See more')).toBeTruthy();
    expect(screen.getByText('Category Ana')).toBeTruthy();
    expect(screen.getByLabelText('See more')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Static children should always be an array'),
    );
    errorSpy.mockRestore();
  });

  it('traduce los diálogos del sistema', async () => {
    installTranslationHooks();
    const alertSpy = jest.spyOn(Alert, 'alert');
    await i18n.changeLanguage('en');

    Alert.alert('Ver más', undefined, [{ text: 'Ver más' }]);

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
