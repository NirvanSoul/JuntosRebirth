import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import { signInWithGoogleNative } from '@/features/auth/services/googleAuth';
import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import { listRemoteSpaces } from '@/services/api/spaces';
import { spacing } from '@/theme/spacing';

type GoogleAuthButtonProps = {
  disabled?: boolean;
  label: string;
  onSuccess: () => void;
  testID: string;
};

/** Reutiliza el mismo OAuth nativo para entrar o crear una cuenta con Google. */
export function GoogleAuthButton({
  disabled = false,
  label,
  onSuccess,
  testID,
}: GoogleAuthButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setStarting] = useState(false);
  const [isAwaitingSession, setAwaitingSession] = useState(false);
  const { isReady, session } = useBetterAuthSession();
  const hasCompleted = useRef(false);
  const isDisabled = disabled || isStarting || isAwaitingSession;

  const handlePress = async () => {
    if (isDisabled) return;

    hasCompleted.current = false;
    setError(null);
    setStarting(true);
    try {
      const result = await signInWithGoogleNative();
      if (result.status === 'cancelled') {
        setError('Cancelaste el inicio de sesión con Google.');
        return;
      }

      if (result.status === 'unsupported') {
        setError(
          'No se detectó el módulo nativo de Google. En Xcode, compila la app (Cmd + R) para enlazar los Pods recién instalados.',
        );
        return;
      }

      if (result.status === 'error') {
        setError(result.message);
        return;
      }

      // La sesión se autentica en Better Auth y notifica useSession.
      setAwaitingSession(true);
    } catch {
      setError('No pudimos continuar con Google. Inténtalo de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!isAwaitingSession || !isReady || hasCompleted.current) return;
    if (!session?.user) return;

    hasCompleted.current = true;
    void initializeAuthenticatedSession()
      .then(() => listRemoteSpaces())
      .then(onSuccess)
      .catch(() => {
        hasCompleted.current = false;
        setAwaitingSession(false);
        setError('Iniciaste sesión, pero no pudimos preparar tus espacios.');
      });
  }, [isAwaitingSession, isReady, onSuccess, session]);

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
        iconContent={<GoogleLogo />}
        label={isDisabled ? 'Conectando con Google…' : label}
        onPress={() => void handlePress()}
        testID={testID}
        variant="surface"
      />
    </View>
  );
}

/** Marca oficial de Google a cuatro colores, sin depender del glyph monocromo. */
function GoogleLogo() {
  return (
    <Svg accessible={false} height={18} viewBox="0 0 18 18" width={18}>
      <Path
        d="M18 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h5.06a4.33 4.33 0 0 1-1.83 2.71v2.26h2.91C16.84 14.25 18 11.95 18 9.2Z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.59-5.05-3.72H.9V12.95A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <Path
        d="M3.95 10.69A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.15.28-1.69V5.05H.9A9 9 0 0 0 0 9c0 1.55.37 3.01.9 3.95l3.05-2.26Z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 5.05l3.05 2.26C4.66 5.17 6.65 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.sm } });
