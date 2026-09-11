import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useEffect, useState } from 'react';

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

/** Sigue la conectividad del dispositivo mientras el componente está montado. */
export function useNetworkAvailability(): NetworkAvailability {
  const [isOffline, setOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // La lectura inicial evita esperar al primer cambio para saber el estado.
    void getNetworkStateAsync()
      .then((state) => {
        if (isMounted) setOffline(isOfflineState(state));
      })
      .catch(() => undefined);
    const subscription = addNetworkStateListener((state) => {
      setOffline(isOfflineState(state));
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return { isOffline };
}
