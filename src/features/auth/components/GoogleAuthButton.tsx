import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import { authClient } from '@/lib/auth-client';
import { listRemoteSpaces } from '@/services/api/spaces';
import { spacing } from '@/theme/spacing';

type GoogleAuthButtonProps = {
  disabled?: boolean;
  label: string;
  onSuccess: () => void;
  testID: string;
};

const googleBlue = '#4285F4';
const googleCallbackUrl = 'juntoss://oauth/google';
const expoGoError =
  'Para continuar con Google, abre Juntoss desde una development build o la app instalada. Expo Go no admite este retorno seguro.';

/** Reutiliza el mismo OAuth para entrar o crear una cuenta con Google. */
export function GoogleAuthButton({
  disabled = false,
  label,
  onSuccess,
  testID,
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setStarting] = useState(false);
  const { isReady, session } = useBetterAuthSession();
  const isAwaitingSession = useRef(false);
  const hasCompleted = useRef(false);
  const isDisabled = disabled || isStarting || isAwaitingSession.current;

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handlePress = async () => {
    if (isDisabled) return;

    // Expo Go no registra el esquema privado `juntoss://`, necesario para que
    // el navegador devuelva el resultado OAuth a la aplicación.
    if (Constants.appOwnership === 'expo') {
      setError(expoGoError);
      return;
    }

    hasCompleted.current = false;
    setError(null);
    setStarting(true);
    try {
      const result = await authClient.signIn.social({
        callbackURL: googleCallbackUrl,
        provider: 'google',
      });
      if (result.error) {
        setError('No pudimos continuar con Google. Inténtalo de nuevo.');
        return;
      }

      if (!result.data) {
        setError('Cancelaste el inicio de sesión con Google.');
        return;
      }

      // expoClient guarda la cookie de la devolución OAuth y notifica
      // useSession. Consultarla de inmediato puede adelantarse a esa señal.
      isAwaitingSession.current = true;
    } catch {
      setError('No pudimos continuar con Google. Inténtalo de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!isAwaitingSession.current || !isReady || hasCompleted.current) return;
    if (!session?.user) return;

    hasCompleted.current = true;
    void initializeAuthenticatedSession()
      .then(() => listRemoteSpaces())
      .then(onSuccess)
      .catch(() => {
        hasCompleted.current = false;
        isAwaitingSession.current = false;
        setError('Iniciaste sesión, pero no pudimos preparar tus espacios.');
      });
  }, [isReady, onSuccess, session]);

  return (
    <View style={styles.container}>
      {error ? (
        <Text tone="expense" variant="footnote">
          {error}
        </Text>
      ) : null}
      <ModalPrimaryAction
        accessibilityLabel={label}
        disabled={isDisabled}
        icon="logo-google"
        iconColor={googleBlue}
        label={isDisabled ? 'Conectando con Google…' : label}
        onPress={() => void handlePress()}
        testID={testID}
        variant="surface"
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.sm } });
