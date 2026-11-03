import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import {
  countDeviceOnlyData,
  countPendingLocalChanges,
  type DeviceOnlyData,
  uploadPendingLocalChanges,
} from '@/features/auth/services/pendingLocalChanges';
import { isDemoSessionActive } from '@/state/demoSession/demoSessionStore';

type SignOutOptions = {
  /** Se ejecuta tras cerrar la sesión, p. ej. reiniciar el onboarding. */
  afterSignOut?: () => Promise<void>;
  /** Quien llama ya pidió confirmación: sin pendientes, se cierra directamente. */
  isConfirmed?: boolean;
};

/** Sin poder contar los pendientes, se avisa como si los hubiera. */
const unknownPendingCount = -1;
const noDeviceOnlyData: DeviceOnlyData = {
  importBatches: 0,
  notificationRules: 0,
};

/**
 * Cierre de sesión que no pierde cambios sin avisar.
 *
 * Cerrar sesión borra la caché del dispositivo (`PROJECT_RULES.md` §15). Si
 * en ella quedan cambios sin subir, antes se ofrece subirlos; si no se puede,
 * se explica que se borrarán y que no habrá forma de recuperarlos, y la
 * persona decide. Cancelar nunca cierra la sesión.
 */
export function useSignOutFlow() {
  const { t } = useTranslation();
  // Un doble toque no debe lanzar dos subidas ni dos cierres.
  const isBusyRef = useRef(false);

  const runExclusive = async (task: () => Promise<void>) => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      await task();
    } finally {
      isBusyRef.current = false;
    }
  };

  const performSignOut = async (afterSignOut?: () => Promise<void>) => {
    try {
      await createJuntossAuthGateway().signOut();
      await discardBackedLocalSessionCache().catch((error: unknown) => {
        // La sesión ya se cerró. Si la caché no se pudo borrar queda
        // bloqueada y la próxima sesión reintenta borrarla antes de usarla.
        console.error('[Settings] No se pudo limpiar la sesión local:', error);
      });
      await afterSignOut?.();
    } catch {
      Alert.alert(
        t('settings.signOut.errorTitle'),
        t('settings.signOut.errorMessage'),
      );
    }
  };

  const signOut = (afterSignOut?: () => Promise<void>) =>
    runExclusive(() => performSignOut(afterSignOut));

  // Lo que no tiene subida se borra pase lo que pase: se nombra en cada aviso
  // para que la decisión sea informada aunque no haya nada pendiente.
  const withDeviceOnlyNote = (message: string, deviceOnly: DeviceOnlyData) => {
    const items = [
      deviceOnly.importBatches > 0
        ? t('settings.signOut.deviceOnlyImports', {
            count: deviceOnly.importBatches,
          })
        : null,
      deviceOnly.notificationRules > 0
        ? t('settings.signOut.deviceOnlyRules', {
            count: deviceOnly.notificationRules,
          })
        : null,
    ].filter((item): item is string => item !== null);
    if (items.length === 0) return message;
    const note = t('settings.signOut.deviceOnlyNote', {
      items: items.join(t('settings.signOut.deviceOnlyJoin')),
    });
    return `${message}\n\n${note}`;
  };

  const confirmDiscard = (
    pending: number,
    deviceOnly: DeviceOnlyData,
    options: SignOutOptions,
  ) => {
    Alert.alert(
      t('settings.signOut.uploadFailedTitle'),
      withDeviceOnlyNote(
        pending === unknownPendingCount
          ? t('settings.signOut.unknownPendingMessage')
          : t('settings.signOut.uploadFailedMessage', { count: pending }),
        deviceOnly,
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut.discardAndSignOut'),
          style: 'destructive',
          onPress: () => void signOut(options.afterSignOut),
        },
      ],
    );
  };

  const uploadThenSignOut = (
    deviceOnly: DeviceOnlyData,
    options: SignOutOptions,
  ) =>
    runExclusive(async () => {
      const remaining = await uploadPendingLocalChanges().catch(
        () => unknownPendingCount,
      );
      if (remaining === 0) {
        await performSignOut(options.afterSignOut);
        return;
      }
      confirmDiscard(remaining, deviceOnly, options);
    });

  const requestSignOut = async (options: SignOutOptions = {}) => {
    if (isBusyRef.current) return;
    // El usuario demo (solo en desarrollo) no tiene cuenta a la que subir:
    // todo lo suyo vive en la caché y se pierde al salir, como siempre.
    const [pending, deviceOnly] = isDemoSessionActive()
      ? [0, noDeviceOnlyData]
      : await Promise.all([
          countPendingLocalChanges().catch(() => unknownPendingCount),
          // Si no se pueden contar, el aviso de recuento desconocido ya advierte
          // de que cualquier cambio se borrará.
          countDeviceOnlyData().catch(() => noDeviceOnlyData),
        ]);
    const hasDeviceOnlyData =
      deviceOnly.importBatches > 0 || deviceOnly.notificationRules > 0;
    if (pending === 0) {
      // La confirmación previa no mencionaba lo que se pierde sin remedio.
      if (options.isConfirmed && !hasDeviceOnlyData) {
        await signOut(options.afterSignOut);
        return;
      }
      Alert.alert(
        t('settings.signOut.title'),
        withDeviceOnlyNote(t('settings.signOut.message'), deviceOnly),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.signOut.confirm'),
            style: 'destructive',
            onPress: () => void signOut(options.afterSignOut),
          },
        ],
      );
      return;
    }
    Alert.alert(
      t('settings.signOut.pendingTitle'),
      withDeviceOnlyNote(
        pending === unknownPendingCount
          ? t('settings.signOut.unknownPendingMessage')
          : t('settings.signOut.pendingMessage', { count: pending }),
        deviceOnly,
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut.uploadAndSignOut'),
          onPress: () => void uploadThenSignOut(deviceOnly, options),
        },
      ],
    );
  };

  return { requestSignOut };
}
