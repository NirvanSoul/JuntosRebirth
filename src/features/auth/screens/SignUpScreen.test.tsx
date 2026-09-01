import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';

import { signUp } from '@/features/auth/services/signUpService';
import { savePendingEmailVerification } from '@/features/auth/services/pendingEmailVerification';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('@/features/auth/services/signUpService');
jest.mock('@/features/auth/services/pendingEmailVerification', () => ({
  savePendingEmailVerification: jest.fn(async () => undefined),
}));
jest.mock('@/features/auth/components/GoogleAuthButton', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    GoogleAuthButton: ({ label }: { label: string }) => <Text>{label}</Text>,
  };
});

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
  await render(
    <ThemeProvider initialAppearance="light">
      <ControlledSignUpScreen
        onNavigateToLogin={onNavigateToLogin}
        onSuccess={onSuccess}
      />
    </ThemeProvider>,
  );
  return { onSuccess };
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pide un dato por paso, en 4 pasos, antes de crear la cuenta', async () => {
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

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUp).toHaveBeenCalledWith({
      email: 'ana@ejemplo.com',
      password: 'secret1234',
      displayName: 'Ana',
    });
    expect(savePendingEmailVerification).toHaveBeenCalledWith(
      'ana@ejemplo.com',
    );
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
