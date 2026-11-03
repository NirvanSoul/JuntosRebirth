import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModalPrimaryAction } from '@/components/overlays/ModalPrimaryAction/ModalPrimaryAction';
import { Text } from '@/components/ui/Text/Text';
import { spacing } from '@/theme/spacing';
import type { ColorTokens } from '@/theme/types';
import { useThemedStyles } from '@/theme/useThemedStyles';

type LocalCacheBlockedStateProps = {
  onRetry: () => void;
  /** Cierra la sesión sin borrar nada del dispositivo. */
  onSignOut: () => Promise<void>;
};

/**
 * Sustituye a la navegación principal cuando la caché del dispositivo no se
 * pudo atribuir o apartar de forma segura. No muestra ningún dato de esa
 * caché: explica qué pasa y ofrece reintentar o, si el fallo persiste (por
 * ejemplo, sin espacio libre), cerrar sesión para entrar con otra cuenta o
 * volver más tarde. Ninguna de las dos borra nada.
 */
export function LocalCacheBlockedState({
  onRetry,
  onSignOut,
}: LocalCacheBlockedStateProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [isSigningOut, setSigningOut] = useState(false);
  const [hasSignOutFailed, setSignOutFailed] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await onSignOut();
    } catch (error) {
      console.error(
        '[LocalCacheBlockedState] No se pudo cerrar sesión:',
        error,
      );
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      testID="local-cache-blocked"
    >
      <View style={styles.text}>
        <Text accessibilityRole="header" variant="heading" weight="semibold">
          No pudimos preparar tus datos
        </Text>
        <Text tone="secondary" variant="body">
          Este dispositivo guarda datos que no podemos asociar con seguridad a
          tu cuenta. No los mostramos ni los subimos, y no se ha borrado nada.
          Vuelve a intentarlo en unos momentos.
        </Text>
        <Text tone="secondary" variant="body">
          Si sigue pasando, libera espacio en el dispositivo o cierra sesión.
          Cerrar sesión tampoco borra nada.
        </Text>
        {hasSignOutFailed ? (
          <Text
            accessibilityLiveRegion="polite"
            testID="local-cache-blocked-sign-out-error"
            tone="expense"
            variant="body"
          >
            No pudimos cerrar sesión. Inténtalo de nuevo en unos momentos.
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <ModalPrimaryAction
          accessibilityLabel="Reintentar"
          disabled={isSigningOut}
          label="Reintentar"
          onPress={onRetry}
          testID="local-cache-blocked-retry"
        />
        <ModalPrimaryAction
          accessibilityLabel="Cerrar sesión"
          disabled={isSigningOut}
          label="Cerrar sesión"
          onPress={() => void handleSignOut()}
          testID="local-cache-blocked-sign-out"
          variant="surface"
        />
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.xl,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.background,
    },
    text: { gap: spacing.sm },
    actions: { gap: spacing.sm },
  });
}
