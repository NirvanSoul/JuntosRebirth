import { useCallback, useState } from 'react';

/**
 * Cubre un cambio de espacio con la carga de la app mientras dura. No impone
 * un mínimo: el fundido de salida de `LoadingState` ya basta para que se lea.
 */
export function useSpaceSwitchLoading() {
  const [isSwitchingSpace, setSwitchingSpace] = useState(false);

  const runSpaceSwitch = useCallback(
    async (change: () => Promise<void> | void) => {
      setSwitchingSpace(true);
      try {
        await change();
      } finally {
        setSwitchingSpace(false);
      }
    },
    [],
  );

  return { isSwitchingSpace, runSpaceSwitch };
}
