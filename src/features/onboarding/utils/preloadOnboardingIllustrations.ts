import { Asset } from 'expo-asset';
import { Image } from 'react-native';

/**
 * Todas las ilustraciones principales de la aplicación (onboarding, acceso e
 * invitaciones a pareja), listadas de forma centralizada para poder
 * precargarlas en segundo plano y evitar parpadeos o demoras en su renderizado.
 */
export const appIllustrations = [
  require('../../../../assets/Onboarding/1_Hola.png'),
  require('../../../../assets/Onboarding/2_Pais.png'),
  require('../../../../assets/Onboarding/3_Menos_dudas.png'),
  require('../../../../assets/Onboarding/4_Tu_mes.png'),
  require('../../../../assets/Onboarding/5_Juntos.png'),
  require('../../../../assets/Onboarding/5.5_Notificaciones.png'),
  require('../../../../assets/Onboarding/6_Crea_tu_categoria.png'),
  require('../../../../assets/Onboarding/7_Bien.png'),
  require('../../../../assets/Onboarding/8_Gastos.png'),
  require('../../../../assets/Onboarding/9_Abrazo.png'),
  require('../../../../assets/Onboarding/10_loginicon.png'),
  require('../../../../assets/Onboarding/Happy_Couple.png'),
  require('../../../../assets/Onboarding/Waiting.png'),
];

/**
 * Descarga y cachea las ilustraciones en segundo plano, sin bloquear la UI.
 * `Asset.loadAsync` resuelve las fuentes en Expo Asset, y `Image.prefetch`
 * calienta la caché nativa de `Image` (RCTImageLoader / Fresco) para las URLs
 * servidas por Metro o remotas.
 */
let preloadPromise: Promise<void> | null = null;

export function preloadAppIllustrations(): Promise<void> {
  if (!preloadPromise) {
    const httpUrls = appIllustrations
      .map((source) => {
        try {
          const resolved = Image.resolveAssetSource(source);
          return resolved?.uri;
        } catch {
          return null;
        }
      })
      .filter(
        (uri): uri is string =>
          typeof uri === 'string' && /^https?:\/\//i.test(uri),
      );

    const prefetchTasks = httpUrls.map((uri) =>
      Image.prefetch(uri).catch(() => false),
    );

    preloadPromise = Promise.all([
      Asset.loadAsync(appIllustrations).catch(() => []),
      ...prefetchTasks,
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }

  return preloadPromise;
}

/** Alias retrocompatible para el flujo de onboarding. */
export const preloadOnboardingIllustrations = preloadAppIllustrations;
