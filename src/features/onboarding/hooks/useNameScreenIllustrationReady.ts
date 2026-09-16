import { useEffect, useState } from 'react';

import { preloadNameScreenIllustration } from '@/features/onboarding/utils/preloadOnboardingIllustrations';

/** Tope de espera: si la imagen tarda más, se abre el onboarding igualmente. */
export const nameScreenIllustrationMaxWaitMs = 1500;

/**
 * Indica cuándo la ilustración de la lámina de nombre ya está en caché, para
 * abrir el onboarding con la imagen lista en lugar de pintarla tarde. La
 * espera está acotada: un Metro lento o un fallo de red nunca bloquean el
 * arranque.
 */
export function useNameScreenIllustrationReady(
  maxWaitMs = nameScreenIllustrationMaxWaitMs,
): boolean {
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    const timeout = setTimeout(() => {
      if (isActive) setReady(true);
    }, maxWaitMs);

    void preloadNameScreenIllustration().finally(() => {
      if (!isActive) return;
      clearTimeout(timeout);
      setReady(true);
    });

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [maxWaitMs]);

  return isReady;
}
