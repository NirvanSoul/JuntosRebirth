import { fireEvent, render } from '@testing-library/react-native';

import { AuthTextField } from '@/features/auth/screens/components/AuthTextField';
import { ThemeProvider } from '@/theme/ThemeProvider';

type AuthTextFieldTestProps = Parameters<typeof AuthTextField>[0];

function renderField(overrides: Partial<AuthTextFieldTestProps> = {}) {
  return render(
    <ThemeProvider initialAppearance="light">
      <AuthTextField
        label="Contraseña"
        onChangeText={() => undefined}
        secureTextEntry
        testID="auth-field"
        value="secret1234"
        {...overrides}
      />
    </ThemeProvider>,
  );
}

describe('AuthTextField', () => {
  describe('campo de contraseña', () => {
    it('oculta el texto por defecto', async () => {
      const screen = await renderField();

      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(true);
    });

    it('muestra el texto al pulsar el botón de visibilidad', async () => {
      const screen = await renderField();
      const toggle = screen.getByTestId('auth-field-toggle-visibility');

      expect(toggle.props.accessibilityLabel).toBe('Mostrar contraseña');

      await fireEvent.press(toggle);

      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(
        false,
      );
    });

    it('alterna el icono entre ojo y ojo tachado', async () => {
      const screen = await renderField();

      expect(
        screen.getByTestId('phosphor-react-native-eye-regular'),
      ).toBeTruthy();
      expect(
        screen.queryByTestId('phosphor-react-native-eye-slash-regular'),
      ).toBeNull();

      await fireEvent.press(screen.getByTestId('auth-field-toggle-visibility'));

      expect(
        screen.getByTestId('phosphor-react-native-eye-slash-regular'),
      ).toBeTruthy();
      expect(
        screen.queryByTestId('phosphor-react-native-eye-regular'),
      ).toBeNull();
    });

    it('vuelve a ocultar el texto al pulsar de nuevo', async () => {
      const screen = await renderField();
      const toggle = screen.getByTestId('auth-field-toggle-visibility');

      await fireEvent.press(toggle);
      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(
        false,
      );
      expect(
        screen.getByTestId('auth-field-toggle-visibility').props
          .accessibilityLabel,
      ).toBe('Ocultar contraseña');

      await fireEvent.press(toggle);
      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(true);
      expect(
        screen.getByTestId('auth-field-toggle-visibility').props
          .accessibilityLabel,
      ).toBe('Mostrar contraseña');
    });

    it('deshabilita el botón de visibilidad cuando el campo no es editable', async () => {
      const screen = await renderField({ editable: false });

      expect(
        screen.getByTestId('auth-field-toggle-visibility').props
          .accessibilityState,
      ).toEqual({ disabled: true });
    });

    it('revelar un campo no revela otro campo de contraseña simultáneo', async () => {
      const screen = await render(
        <ThemeProvider initialAppearance="light">
          <AuthTextField
            label="Contraseña"
            onChangeText={() => undefined}
            secureTextEntry
            testID="field-password"
            value="secreto-a"
          />
          <AuthTextField
            label="Confirmar contraseña"
            onChangeText={() => undefined}
            secureTextEntry
            testID="field-confirm"
            value="secreto-b"
          />
        </ThemeProvider>,
      );

      await fireEvent.press(
        screen.getByTestId('field-password-toggle-visibility'),
      );

      expect(screen.getByTestId('field-password').props.secureTextEntry).toBe(
        false,
      );
      expect(screen.getByTestId('field-confirm').props.secureTextEntry).toBe(
        true,
      );
    });

    it('al desmontar y volver a montar reaparece oculta', async () => {
      const screen = await render(
        <ThemeProvider initialAppearance="light">
          <AuthTextField
            key="montaje-1"
            label="Contraseña"
            onChangeText={() => undefined}
            secureTextEntry
            testID="auth-field"
            value="secret1234"
          />
        </ThemeProvider>,
      );

      await fireEvent.press(screen.getByTestId('auth-field-toggle-visibility'));
      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(
        false,
      );

      // Cambiar la key fuerza a React a desmontar el campo y montar uno nuevo,
      // cuyo estado de visibilidad arranca de nuevo en "oculta".
      await screen.rerender(
        <ThemeProvider initialAppearance="light">
          <AuthTextField
            key="montaje-2"
            label="Contraseña"
            onChangeText={() => undefined}
            secureTextEntry
            testID="auth-field"
            value="secret1234"
          />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('auth-field').props.secureTextEntry).toBe(true);
    });
  });

  it('no muestra el botón de visibilidad en campos que no son de contraseña', async () => {
    const screen = await renderField({
      label: 'Correo',
      secureTextEntry: false,
      testID: 'auth-email',
      value: 'tucorreo@ejemplo.com',
    });

    expect(screen.queryByTestId('auth-email-toggle-visibility')).toBeNull();
    expect(screen.getByTestId('auth-email').props.secureTextEntry).toBe(false);
  });
});
