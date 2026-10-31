import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSyncExternalStore } from 'react';

type NetworkAvailability = {
  /**
   * `true` solo cuando el sistema afirma que Internet no es alcanzable. Un
   * estado desconocido (iOS lo devuelve a menudo) cuenta como conectado: es
   * preferible intentar una petición y fallar que retener trabajo por una
   * duda del sistema.
   */
  isOffline: boolean;
};

function isOfflineState(state: { isInternetReachable?: boolean | null }) {
  return state.isInternetReachable === false;
}

// Una sola suscripción nativa compartida por todos los consumidores (arranque,
// polling y aviso sin conexión); se abre con el primero y se cierra con el
// último.
let isOfflineSnapshot = false;
const listeners = new Set<() => void>();
let nativeSubscription: { remove: () => void } | null = null;

function setOfflineSnapshot(next: boolean) {
  if (next === isOfflineSnapshot) return;
  isOfflineSnapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!nativeSubscription) {
    const subscription = addNetworkStateListener((state) => {
      setOfflineSnapshot(isOfflineState(state));
    });
    nativeSubscription = subscription;
    // La lectura inicial evita esperar al primer cambio para saber el estado.
    void getNetworkStateAsync()
      .then((state) => {
        if (nativeSubscription === subscription) {
          setOfflineSnapshot(isOfflineState(state));
        }
      })
      .catch(() => undefined);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && nativeSubscription) {
      nativeSubscription.remove();
      nativeSubscription = null;
      // Sin nadie escuchando el valor envejece: se vuelve a lo desconocido.
      isOfflineSnapshot = false;
    }
  };
}

function getSnapshot() {
  return isOfflineSnapshot;
}

/** Sigue la conectividad del dispositivo mientras el componente está montado. */
export function useNetworkAvailability(): NetworkAvailability {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { isOffline };
}
