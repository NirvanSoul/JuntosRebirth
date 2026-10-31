import { TurboModuleRegistry } from 'react-native';
import type { NativeAd } from 'react-native-google-mobile-ads';

type MobileAdsSdk = typeof import('react-native-google-mobile-ads');

const homeNativeAdUnitId = 'ca-app-pub-1780084292132285/4128898295';

let mobileAdsSdk: MobileAdsSdk | null = null;
let readyPromise: Promise<MobileAdsSdk | null> | null = null;

function loadMobileAdsSdk(): MobileAdsSdk | null {
  // El SDK exige su módulo nativo al importarse y lanza un error que Metro
  // muestra aunque se capture. Expo Go y los binarios compilados antes de
  // añadir AdMob no lo incluyen: en ese caso Juntos funciona sin anuncios.
  if (!TurboModuleRegistry.get('RNGoogleMobileAdsModule')) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mobileAdsSdk ??= require('react-native-google-mobile-ads') as MobileAdsSdk;
  return mobileAdsSdk;
}

async function prepareMobileAds(): Promise<MobileAdsSdk | null> {
  const sdk = loadMobileAdsSdk();
  if (!sdk) return null;

  try {
    // El mensaje de consentimiento (UMP) se muestra antes de pedir anuncios
    // donde la ley lo exige (EEE, Reino Unido, Suiza y estados de EE. UU.).
    // Rechazarlo no impide los anuncios: solo dejan de personalizarse.
    const consent = await sdk.AdsConsent.gatherConsent().catch(() =>
      sdk.AdsConsent.getConsentInfo(),
    );
    if (!consent.canRequestAds) return null;

    await sdk.default().initialize();
    return sdk;
  } catch {
    return null;
  }
}

/** Resuelve el SDK listo para pedir anuncios, o null si no está disponible. */
function getReadyMobileAds(): Promise<MobileAdsSdk | null> {
  readyPromise ??= prepareMobileAds();
  return readyPromise;
}

/**
 * Carga el anuncio nativo de Inicio. En desarrollo usa siempre el bloque de
 * prueba de Google: pedir anuncios reales desde builds de desarrollo puede
 * suspender la cuenta de AdMob.
 */
export async function loadHomeNativeAd(): Promise<NativeAd | null> {
  const sdk = await getReadyMobileAds();
  if (!sdk) return null;

  const adUnitId = __DEV__ ? sdk.TestIds.NATIVE : homeNativeAdUnitId;
  try {
    return await sdk.NativeAd.createForAdRequest(adUnitId);
  } catch {
    return null;
  }
}

/**
 * Indica si la región de la persona exige ofrecer un acceso permanente para
 * cambiar el consentimiento de anuncios.
 */
export async function isAdsPrivacyOptionsRequired(): Promise<boolean> {
  const sdk = loadMobileAdsSdk();
  if (!sdk) return false;

  try {
    const info = await sdk.AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus ===
      sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** Abre el formulario de Google para revisar el consentimiento de anuncios. */
export async function showAdsPrivacyOptions(): Promise<void> {
  const sdk = loadMobileAdsSdk();
  if (!sdk) return;

  try {
    await sdk.AdsConsent.showPrivacyOptionsForm();
  } catch {
    // El formulario no está disponible; se mantiene la decisión anterior.
  }
}
