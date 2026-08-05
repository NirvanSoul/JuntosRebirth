import { LogBox } from 'react-native';

import { AppBootstrap } from '@/app/AppBootstrap';
import { AppProviders } from '@/app/AppProviders';
import { ErrorBoundary } from '@/app/ErrorBoundary';

// juntoss solo programa notificaciones locales (ver Bible/JUNTOSS_NOTIFICATIONS.md);
// Expo Go en Android SDK 53+ avisa igualmente porque expo-notifications ya no
// soporta remote push ahí. No aplica a este proyecto: aviso esperable a ignorar.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppBootstrap />
      </AppProviders>
    </ErrorBoundary>
  );
}
