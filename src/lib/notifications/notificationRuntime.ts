import { isRunningInExpoGo } from 'expo';
import type * as Notifications from 'expo-notifications';

/** Avoids loading the remote-push module, which Expo Go Android rejects. */
export function getNotificationModule(): typeof Notifications | null {
  if (isRunningInExpoGo()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must only load the native module outside Expo Go.
  return require('expo-notifications') as typeof Notifications;
}

export function isNotificationModuleAvailable(): boolean {
  return !isRunningInExpoGo();
}
