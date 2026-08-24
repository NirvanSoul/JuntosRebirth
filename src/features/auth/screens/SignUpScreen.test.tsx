import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';

import { signUp } from '@/features/auth/services/signUpService';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { privacyPolicy } from '@/features/legal/content/privacyPolicy';
import { termsOfService } from '@/features/legal/content/termsOfService';
import { renderWithTheme } from '@/test/renderWithTheme';
import appConfig from '../../../../app.json';

jest.mock('@/features/auth/services/signUpService');

const mockSavePendingIntention = jest.fn();
jest.mock(
  '@/features/legal/persistence/pendingLegalAcceptanceRepository',
  () => ({
    savePendingLegalAcceptance: (intention: unknown) =>
      mockSavePendingIntention(intention),
  }),
);

function ControlledSignUpScreen({
  onNavigateToLogin,
  onSuccess,
}: {
  onNavigateToLogin?: () => void;
  onSuccess: (result: { email: string }) => void;
}) {
  const [step, setStep] = useState(1);
  return (
    <SignUpScreen
      onNavigateToLogin={onNavigateToLogin}
      onStepChange={setStep}
      onSuccess={onSuccess}
      step={step}
    />
  );
}

async function renderWizard(onNavigateToLogin?: () => void) {
  const onSuccess = jest.fn();
  await renderWithTheme(
    <ControlledSignUpScreen
      onNavigateToLogin={onNavigateToLogin}
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess };
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide un dato por paso, en 5 pasos, antes de crear la cuenta', async () => {
    jest.mocked(signUp).mockResolvedValue(undefined);
    const { onSuccess } = await renderWizard();

    expect(screen.getByTestId('signup-display-name')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('signup-display-name'),
      'Ana',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByTestId('signup-email')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('signup-email'),
      'ana@ejemplo.com',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByTestId('signup-password')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('signup-password'),
      'secret1234',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByTestId('signup-confirm-password')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('signup-confirm-password'),
      'secret1234',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    // Paso legal: la cuenta aún no se crea hasta aceptar y confirmar.
    expect(await screen.findByTestId('signup-legal-terms-toggle')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('signup-legal-terms-toggle'));
    await fireEvent.press(screen.getByTestId('signup-legal-privacy-toggle'));
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUp).toHaveBeenCalledWith({
      email: 'ana@ejemplo.com',
      password: 'secret1234',
      displayName: 'Ana',
    });
    expect(onSuccess).toHaveBeenCalledWith({ email: 'ana@ejemplo.com' });
  });

  it('exige que la confirmación de contraseña coincida antes de crear la cuenta', async () => {
    await renderWizard();

    await fireEvent.changeText(
      screen.getByTestId('signup-display-name'),
      'Ana',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-email'),
      'ana@ejemplo.com',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-password'),
      'secret1234',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await fireEvent.changeText(
      await screen.findByTestId('signup-confirm-password'),
      'otra-clave',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(
      await screen.findByText('Las contraseñas no coinciden.'),
    ).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('el botón «Atrás» regresa al paso anterior sin perder lo escrito', async () => {
    await renderWizard();

    await fireEvent.changeText(
      screen.getByTestId('signup-display-name'),
      'Ana',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await screen.findByTestId('signup-email');
    await fireEvent.press(screen.getByTestId('signup-back'));

    const nameField = await screen.findByTestId('signup-display-name');
    expect(nameField.props.value).toBe('Ana');
  });

  it('en el primer paso ofrece ir a iniciar sesión en vez de un botón de atrás', async () => {
    const onNavigateToLogin = jest.fn();
    await renderWizard(onNavigateToLogin);

    expect(screen.queryByTestId('signup-back')).toBeNull();
    await fireEvent.press(screen.getByTestId('signup-navigate-login'));

    expect(onNavigateToLogin).toHaveBeenCalled();
  });

  it('no persiste la contraseña en AsyncStorage ni SecureStore (ADR-074)', async () => {
    jest.mocked(signUp).mockResolvedValue(undefined);
    const asyncStorageSetItem = jest.spyOn(AsyncStorage, 'setItem');
    const secureStoreSetItem = jest.spyOn(SecureStore, 'setItemAsync');
    const plainPassword = 'super-secreto-1234';

    await renderWizard();

    await fireEvent.changeText(
      screen.getByTestId('signup-display-name'),
      'Ana',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-email'),
      'ana@ejemplo.com',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-password'),
      plainPassword,
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-confirm-password'),
      plainPassword,
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    // El paso legal se completa con las dos acciones diferenciadas.
    await fireEvent.press(
      await screen.findByTestId('signup-legal-terms-toggle'),
    );
    await fireEvent.press(
      await screen.findByTestId('signup-legal-privacy-toggle'),
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(signUp).toHaveBeenCalled());

    const persistedCalls = [
      ...asyncStorageSetItem.mock.calls,
      ...secureStoreSetItem.mock.calls,
    ];
    for (const call of persistedCalls) {
      expect(JSON.stringify(call)).not.toContain(plainPassword);
    }
  });
});

describe('SignUpScreen — paso legal previo a crear la cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function llegarAlPasoLegal(opciones?: {
    password?: string;
    confirmPassword?: string;
  }) {
    const password = opciones?.password ?? 'secret1234';
    await renderWizard();

    await fireEvent.changeText(
      screen.getByTestId('signup-display-name'),
      'Ana',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-email'),
      'ana@ejemplo.com',
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-password'),
      password,
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));
    await fireEvent.changeText(
      await screen.findByTestId('signup-confirm-password'),
      opciones?.confirmPassword ?? password,
    );
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await screen.findByTestId('signup-legal-terms-toggle');
  }

  it('no crea la cuenta sin aceptar Términos ni confirmar la consulta de la Política', async () => {
    jest.mocked(signUp).mockResolvedValue(undefined);
    await llegarAlPasoLegal();

    // Sin acciones legales, continuar no crea la cuenta.
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(
      await screen.findByText(/Acepta los Términos y confirma/),
    ).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
    expect(mockSavePendingIntention).not.toHaveBeenCalled();

    // Con solo una de las dos acciones, tampoco.
    await fireEvent.press(screen.getByTestId('signup-legal-terms-toggle'));
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(signUp).not.toHaveBeenCalled();
  });

  it('persiste la intención legal antes de llamar a signUp, con la instantánea canónica', async () => {
    const callOrder: string[] = [];
    jest.mocked(signUp).mockImplementation(async () => {
      callOrder.push('signUp');
    });
    mockSavePendingIntention.mockImplementation(() => {
      callOrder.push('persist');
      return Promise.resolve();
    });
    await llegarAlPasoLegal();

    await fireEvent.press(screen.getByTestId('signup-legal-terms-toggle'));
    await fireEvent.press(screen.getByTestId('signup-legal-privacy-toggle'));
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(signUp).toHaveBeenCalled());

    expect(mockSavePendingIntention).toHaveBeenCalledTimes(1);
    const intention = mockSavePendingIntention.mock.calls[0]?.[0];
    expect(intention).toEqual(
      expect.objectContaining({
        email: 'ana@ejemplo.com',
        locale: 'es-ES',
        source: 'access-signup',
        appVersion: appConfig.expo.version,
      }),
    );
    expect(intention.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'terms-of-service',
          documentVersion: termsOfService.version,
          action: 'accepted',
        }),
        expect.objectContaining({
          documentId: 'privacy-policy',
          documentVersion: privacyPolicy.version,
          action: 'consulted',
        }),
      ]),
    );

    // La intención se guarda antes de pedir la creación de la cuenta.
    expect(callOrder).toEqual(['persist', 'signUp']);
  });

  it('abrir y cerrar los documentos no borra nombre, correo ni contraseña en memoria', async () => {
    jest.mocked(signUp).mockResolvedValue(undefined);
    await llegarAlPasoLegal();

    await fireEvent.press(await screen.findByTestId('signup-legal-open-terms'));
    expect(screen.getByTestId('legal-document-screen')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));
    await waitFor(() =>
      expect(screen.queryByTestId('legal-document-screen')).toBeNull(),
    );

    await fireEvent.press(
      await screen.findByTestId('signup-legal-open-privacy'),
    );
    expect(screen.getByTestId('legal-document-screen')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cerrar'));

    // Volver al paso de la contraseña confirma que los datos siguen vivos.
    await fireEvent.press(screen.getByTestId('signup-back'));
    const confirmField = await screen.findByTestId('signup-confirm-password');
    expect(confirmField.props.value).toBe('secret1234');
  });
});
