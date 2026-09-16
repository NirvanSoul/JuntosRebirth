import { Asset } from 'expo-asset';
import { Image } from 'react-native';

/**
 * Ilustración de la primera lámina del onboarding (nombre). Se precarga sola
 * y antes que todo lo demás: es lo primero que ve el usuario y no debe
 * competir por red/disco con las otras doce.
 */
export const nameScreenIllustration: number = require('../../../../assets/Onboarding/1_Hola.png');

/**
 * Resto de ilustraciones principales (onboarding, acceso e invitaciones a
 * pareja), en el orden en que aparecen en el flujo. Se precargan de una en
 * una mientras el usuario escribe su nombre, así cada lámina siguiente
 * encuentra su imagen ya en caché.
 */
export const deferredIllustrations: number[] = [
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

/** Todas las ilustraciones, listadas de forma centralizada. */
export const appIllustrations = [
  nameScreenIllustration,
  ...deferredIllustrations,
];

/**
 * `Asset.loadAsync` resuelve la fuente en Expo Asset, y `Image.prefetch`
 * calienta la caché nativa de `Image` (RCTImageLoader / Fresco) cuando la
 * URL la sirve Metro o es remota.
 */
/** Módulo de `require` de una imagen empaquetada. */
type BundledImage = number;

async function preloadIllustration(source: BundledImage): Promise<void> {
  let uri: string | undefined;
  try {
    uri = Image.resolveAssetSource(source)?.uri;
  } catch {
    uri = undefined;
  }
  const tasks: Promise<unknown>[] = [Asset.loadAsync(source).catch(() => [])];
  if (typeof uri === 'string' && /^https?:\/\//i.test(uri)) {
    tasks.push(Image.prefetch(uri).catch(() => false));
  }
  await Promise.all(tasks);
}

let firstIllustrationPromise: Promise<void> | null = null;
let preloadPromise: Promise<void> | null = null;

/**
 * Precarga solo la ilustración de la lámina de nombre. Termina en cuanto esa
 * imagen está lista, sin esperar al resto.
 */
export function preloadNameScreenIllustration(): Promise<void> {
  if (!firstIllustrationPromise) {
    firstIllustrationPromise = preloadIllustration(
      nameScreenIllustration,
    ).catch(() => undefined);
  }
  return firstIllustrationPromise;
}

/**
 * Descarga y cachea las ilustraciones en segundo plano, sin bloquear la UI.
 * Primero la de la lámina de nombre; el resto, secuencialmente y en orden de
 * flujo, solo cuando la primera ya está en caché.
 */
export function preloadAppIllustrations(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = preloadNameScreenIllustration()
      .then(async () => {
        for (const source of deferredIllustrations) {
          await preloadIllustration(source);
        }
      })
      .catch(() => undefined);
  }

  return preloadPromise;
}

/** Alias retrocompatible para el flujo de onboarding. */
export const preloadOnboardingIllustrations = preloadAppIllustrations;
