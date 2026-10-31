import { AccessibilityInfo, Alert, type AlertButton } from 'react-native';

import { translateText } from '@/lib/i18n/translateText';

/**
 * Textos que no pasan por JSX: diálogos del sistema y anuncios del lector de
 * pantalla. Se envuelven una sola vez al arrancar.
 */
let installed = false;

const translateOptional = <T>(value: T): T =>
  (typeof value === 'string' ? translateText(value) : value) as T;

export function installTranslationHooks(): void {
  if (installed) return;
  installed = true;

  const alert = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) =>
    alert(
      translateOptional(title),
      translateOptional(message),
      buttons?.map((button): AlertButton =>
        button.text === undefined
          ? button
          : { ...button, text: translateText(button.text) },
      ),
      options,
    );

  const announce =
    AccessibilityInfo.announceForAccessibility.bind(AccessibilityInfo);
  AccessibilityInfo.announceForAccessibility = (announcement) =>
    announce(translateOptional(announcement));
}
