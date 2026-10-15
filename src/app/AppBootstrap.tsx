import { useEffect } from 'react';
import { useFonts } from 'expo-font';

import { ensureNotificationHandlerRegistered } from '@/lib/notifications/localNotifications';
import { InvitationPushRegistration } from '@/lib/notifications/InvitationPushRegistration';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoadingProgressProvider } from '@/components/feedback/LoadingState/LoadingProgressProvider';
import { fontAssets } from '@/theme/fonts';
import { markStartup } from '@/lib/diagnostics/startupTrace';
import { preloadAppIllustrations } from '@/features/onboarding/utils/preloadOnboardingIllustrations';
import { warmUpAuthSession } from '@/features/auth/services/googleAuth';

export function AppBootstrap() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    void ensureNotificationHandlerRegistered();
    void preloadAppIllustrations();
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
