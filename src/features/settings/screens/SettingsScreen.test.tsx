import { fireEvent } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { renderWithTheme } from '@/test/renderWithTheme';
import type { CurrencyPreferences } from '@/state/appPreferences/currencyPreferences';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';

describe('SettingsScreen', () => {
  const renderScreen = async (
    currencyPreferences: CurrencyPreferences = { currencies: ['EUR'] },
    showHomeComparisonIndicators = true,
  ) => {
    const props = {
      activeSpaceId: 'space-1',
      currencyPreferences,
      notificationRules: [],
      onBack: jest.fn(),
      onSaveCurrencyPreferences: jest.fn(),
      onSaveNotificationRule: jest.fn().mockResolvedValue(true),
      onToggleHomeComparisonIndicators: jest.fn(),
      showHomeComparisonIndicators,
    };

    return {
      props,
      screen: await renderWithTheme(<SettingsScreen {...props} />),
    };
  };

  it('muestra iconos en todas las secciones y marca las funciones pendientes', async () => {
    const { screen } = await renderScreen();

    for (const title of [
      'Cuenta',
      'Preferencias',
      'Notificaciones',
      'Datos y privacidad',
      'Ayuda',
    ]) {
      expect(screen.getByTestId(`section-icon-${title}`)).toBeTruthy();
    }

    expect(screen.getByTestId('pending-Editar perfil')).toBeTruthy();
    expect(screen.queryByText('Gestionar espacios')).toBeNull();
    expect(screen.queryByText('Borrar mis datos')).toBeNull();
    expect(screen.queryByText('Cómo funciona Juntos')).toBeNull();
    expect(screen.queryByText('Crear cuenta y proteger mis datos')).toBeNull();
    expect(screen.queryByText('Ocultar importes')).toBeNull();
    expect(screen.queryByText('Gestionar recurrencias')).toBeNull();
    expect(screen.queryByText('Importar y exportar')).toBeNull();
    expect(screen.queryByText('Permisos y privacidad')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('section-icon-Cuenta').props.style),
    ).not.toHaveProperty('backgroundColor');
    expect(
      StyleSheet.flatten(screen.getByTestId('section-glyph-Cuenta').props.style)
        .color,
    ).toBe(colors.textMuted);
    expect(
      StyleSheet.flatten(screen.getByTestId('section-glyph-Cuenta').props.style)
        .textShadowRadius,
    ).toBeUndefined();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('section-glyph-Notificaciones').props.style,
      ).textShadowRadius,
    ).toBe(0.45);
    expect(
      StyleSheet.flatten(screen.getByTestId('row-icon-Moneda').props.style)
        .backgroundColor,
    ).toBe(categoryColors.green);
    expect(
      StyleSheet.flatten(screen.getByTestId('row-icon-Idioma').props.style)
        .backgroundColor,
    ).toBe(categoryColors.blue);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('row-icon-Estado de los datos').props.style,
      ).backgroundColor,
    ).toBe(categoryColors.violet);
    expect(screen.getByTestId('row-glyph-Editar perfil')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('row-glyph-Idioma').props.style)
        .textShadowRadius,
    ).toBe(0.45);
    expect(
      StyleSheet.flatten(screen.getByTestId('settings-header').props.style),
    ).toMatchObject({ justifyContent: 'flex-start' });
    expect(
      StyleSheet.flatten(screen.getByTestId('settings-back-icon').props.style)
        .color,
    ).toBe(colors.textPrimary);
    expect(screen.getByText('juntoss 0.1.0')).toBeTruthy();
  });

  it('explica una opción pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Editar perfil'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Función pendiente',
      expect.stringContaining('falta implementar'),
    );
    alertSpy.mockRestore();
  });

  it('abre las reglas de notificación en vez de mostrar el aviso pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Recordatorios y alertas'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('notification-rules-modal')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('permite volver a la aplicación', async () => {
    const { props, screen } = await renderScreen();

    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('muestra la moneda activa y varias monedas activas en el resumen', async () => {
    const { screen } = await renderScreen();
    expect(screen.getByText('Euro')).toBeTruthy();

    const { screen: multiCurrencyScreen } = await renderScreen({
      currencies: ['EUR', 'USD', 'MXN'],
    });
    expect(multiCurrencyScreen.getByText('EUR · USD · MXN')).toBeTruthy();
  });

  it('permite buscar y elegir varias monedas, hasta un máximo de tres', async () => {
    const { props, screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-USD'));
    await fireEvent.press(screen.getByTestId('currency-option-MXN'));
    await fireEvent.press(screen.getByTestId('currency-preferences-save'));

    expect(props.onSaveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['EUR', 'USD', 'MXN'],
    });
  });

  it('filtra el catálogo con el buscador por país, moneda o código', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'mexico',
    );
    expect(screen.getByTestId('currency-option-MXN')).toBeTruthy();
    expect(screen.queryByTestId('currency-option-USD')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'peso mexicano',
    );
    expect(screen.getByTestId('currency-option-MXN')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId('currency-search-input'),
      'usd',
    );
    expect(screen.getByTestId('currency-option-USD')).toBeTruthy();
    expect(screen.queryByTestId('currency-option-MXN')).toBeNull();
  });

  it('limita a tres monedas activas y avisa al superar el máximo', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-USD'));
    await fireEvent.press(screen.getByTestId('currency-option-MXN'));
    await fireEvent.press(screen.getByTestId('currency-option-GBP'));

    expect(
      screen.getByText('Ya elegiste 3 monedas. Quita una para añadir otra.'),
    ).toBeTruthy();
  });

  it('exige mantener al menos una moneda activa', async () => {
    const { screen } = await renderScreen();

    await fireEvent.press(screen.getByText('Moneda'));
    await fireEvent.press(screen.getByTestId('currency-option-EUR'));

    expect(
      screen.getByText('Debes mantener al menos una moneda activa.'),
    ).toBeTruthy();
  });

  it('permite activar y desactivar la comparación de Inicio', async () => {
    const { props, screen } = await renderScreen(
      { currencies: ['EUR'] },
      true,
    );

    expect(screen.getByTestId('home-comparison-toggle').props.value).toBe(
      true,
    );

    fireEvent(screen.getByTestId('home-comparison-toggle'), 'valueChange', false);

    expect(props.onToggleHomeComparisonIndicators).toHaveBeenCalledWith(false);
  });

  it('refleja el ajuste desactivado de la comparación de Inicio', async () => {
    const { screen } = await renderScreen({ currencies: ['EUR'] }, false);

    expect(screen.getByTestId('home-comparison-toggle').props.value).toBe(
      false,
    );
  });
});
