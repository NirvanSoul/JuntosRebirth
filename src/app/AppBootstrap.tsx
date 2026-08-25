import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { ensureNotificationHandlerRegistered } from '@/lib/notifications/localNotifications';
import { InvitationPushRegistration } from '@/lib/notifications/InvitationPushRegistration';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useTheme } from '@/theme/useTheme';
import { fontAssets } from '@/theme/fonts';

ensureNotificationHandlerRegistered();

function AppStatusBar() {
  const { isDark } = useTheme();

  return (
    <StatusBar
      backgroundColor="transparent"
      style={isDark ? 'light' : 'dark'}
      translucent
    />
  );
}

export function AppBootstrap() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <AppStatusBar />
      <RootNavigator />
      <InvitationPushRegistration />
    </>
  );
}
