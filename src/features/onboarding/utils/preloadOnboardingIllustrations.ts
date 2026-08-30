import { Asset } from 'expo-asset';
import { Image } from 'react-native';

/**
 * Todas las ilustraciones de cabecera del onboarding, listadas aparte de
 * cada lámina para poder precargarlas de una sola vez apenas empieza el
 * flujo, en vez de que cada una decodifique la suya la primera vez que se
 * dibuja.
 */
const onboardingIllustrations = [
  require('../../../../assets/Onboarding/1_Hola.png'),
  require('../../../../assets/Onboarding/2_Pais.png'),
  require('../../../../assets/Onboarding/3_Menos_dudas.png'),
  require('../../../../assets/Onboarding/4_Tu_mes.png'),
  require('../../../../assets/Onboarding/5_Juntos.png'),
  require('../../../../assets/Onboarding/6_Crea_tu_categoria.png'),
  require('../../../../assets/Onboarding/7_Bien.png'),
  require('../../../../assets/Onboarding/8_Gastos.png'),
  require('../../../../assets/Onboarding/9_Abrazo.png'),
];

/**
 * Descarga y cachea las ilustraciones antes de que se monte la primera
 * lámina. `Asset.loadAsync` resuelve las fuentes empaquetadas y `prefetch`
 * adelanta también la caché nativa de `Image`.
 */
let preloadPromise: Promise<void> | null = null;

export function preloadOnboardingIllustrations(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Asset.loadAsync(onboardingIllustrations)
      .then((assets) => {
        const httpUrls = assets
          .map((asset) => asset.localUri ?? asset.uri)
          .filter(
            (uri): uri is string =>
              typeof uri === 'string' && /^https?:\/\//i.test(uri),
          );

        if (httpUrls.length === 0) return;
        return Promise.all(httpUrls.map((uri) => Image.prefetch(uri)));
      })
      // Un fallo de caché nunca puede bloquear el inicio de onboarding: la
      // imagen se seguirá resolviendo de forma normal al renderizarse.
      .then(() => undefined)
      .catch(() => undefined);
  }

  return preloadPromise;
}

// Este módulo se carga como dependencia de RootNavigator, antes de comprobar
// la sesión y el estado de onboarding. Así los nueve assets empiezan a cargar
// durante el arranque, no después de pintar la pantalla de nombre.
void preloadOnboardingIllustrations();
