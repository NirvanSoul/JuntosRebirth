import { useEffect } from 'react';
import { useFonts } from 'expo-font';

import { ensureNotificationHandlerRegistered } from '@/lib/notifications/localNotifications';
import { InvitationPushRegistration } from '@/lib/notifications/InvitationPushRegistration';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoadingProgressProvider } from '@/components/feedback/LoadingState/LoadingProgressProvider';
import { fontAssets } from '@/theme/fonts';
import { markStartup } from '@/lib/diagnostics/startupTrace';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { preloadAppIllustrations } from '@/features/onboarding/utils/preloadOnboardingIllustrations';
import { warmUpAuthSession } from '@/features/auth/services/googleAuth';
import { restoreAnalyticsPreference } from '@/features/legal/services/analyticsPreferenceService';

export function AppBootstrap() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    // Abrir y migrar SQLite no depende de fuentes ni de sesión: empezar aquí
    // hace que la caché esté lista cuando la pantalla principal la pida, en
    // vez de abrirla recién entonces. Un fallo se reintenta en ese momento.
    void getLocalDatabase().catch(() => undefined);
    void ensureNotificationHandlerRegistered();
    void preloadAppIllustrations();
    void restoreAnalyticsPreference();
    warmUpAuthSession();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      markStartup('fonts_ready');
    }
  }, [fontsLoaded]);

  if (fontError) {
    throw fontError;
  }

  return (
    <LoadingProgressProvider>
      <RootNavigator fontsReady={fontsLoaded} />
      {fontsLoaded && <InvitationPushRegistration />}
    </LoadingProgressProvider>
  );
}
