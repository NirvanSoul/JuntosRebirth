import { useEffect, useState } from 'react';

import { WifiOffIcon } from '@/components/icons/WifiOffIcon';
import {
  NoticeToast,
  type ToastNotice,
} from '@/components/overlays/NoticeToast/NoticeToast';
import type { SyncIssue } from '@/features/sync/hooks/useSessionStartup';
import { useNetworkAvailability } from '@/hooks/useNetworkAvailability';
import { iconSize } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type SyncIssueToastProps = {
  issue: SyncIssue | null;
  onDismiss: (issueId: number) => void;
  onRetry: () => void;
};

/**
 * Un corte breve (cambiar de wifi a datos) no merece aviso: solo se muestra
 * si la desconexión dura más que esto.
 */
export const offlineNoticeDelayMs = 1_500;

const offlineMessage =
  'Sin conexión. Tus cambios se guardan aquí y se subirán al reconectar.';

/** Sin conexión confirmada tras el margen de `offlineNoticeDelayMs`. */
function useSettledOffline(isOffline: boolean) {
  const [isSettled, setSettled] = useState(false);
  const [prevIsOffline, setPrevIsOffline] = useState(isOffline);
  if (prevIsOffline !== isOffline) {
    setPrevIsOffline(isOffline);
    setSettled(false);
  }
  useEffect(() => {
    if (!isOffline) return;
    const timer = setTimeout(() => setSettled(true), offlineNoticeDelayMs);
    return () => clearTimeout(timer);
  }, [isOffline]);
  return isOffline && isSettled;
}

/**
 * Estado de la conexión y de la sincronización en un único aviso arriba.
 *
 * Sin red (al abrir o al perderla en uso) queda una tarjeta fija que explica
 * que lo nuevo se guarda en el dispositivo; tocarla la oculta hasta el
 * siguiente corte. Al volver la red se confirma brevemente. Un fallo
 * recuperable de la sincronización inicial se avisa aparte, con reintento.
 */
export function SyncIssueToast({
  issue,
  onDismiss,
  onRetry,
}: SyncIssueToastProps) {
  const { colors } = useTheme();
  const { isOffline } = useNetworkAvailability();
  const isSettledOffline = useSettledOffline(isOffline);
  // El sistema puede no saber que no hay red (iOS) aunque las peticiones
  // fallen: ese fallo también cuenta como sin conexión.
  const showOffline = isSettledOffline || issue?.kind === 'offline';

  const [offlineEpisode, setOfflineEpisode] = useState(0);
  const [wasShowingOffline, setWasShowingOffline] = useState(false);
  const [isOfflineHidden, setOfflineHidden] = useState(false);
  const [hasSettledOffline, setHasSettledOffline] = useState(false);
  const [isReconnectedVisible, setReconnectedVisible] = useState(false);

  // Cada corte es un aviso nuevo y vuelve a mostrarse aunque se ocultara el
  // anterior.
  if (showOffline !== wasShowingOffline) {
    setWasShowingOffline(showOffline);
    if (showOffline) {
      setOfflineEpisode((episode) => episode + 1);
      setOfflineHidden(false);
      setReconnectedVisible(false);
    }
  }
  // Solo el sistema confirma que volvió la red; un reintento manual que
  // limpia el fallo no basta para anunciarlo.
  if (isSettledOffline && !hasSettledOffline) {
    setHasSettledOffline(true);
  } else if (hasSettledOffline && !isOffline) {
    setHasSettledOffline(false);
    setReconnectedVisible(true);
  }

  // Ids negativos por corte: no chocan con los de `SyncIssue`, desde 1.
  const offlineNoticeId = -2 * offlineEpisode - 1;
  const reconnectedNoticeId = -2 * offlineEpisode - 2;

  let notice: ToastNotice | null = null;
  if (showOffline) {
    notice = isOfflineHidden
      ? null
      : {
          id: offlineNoticeId,
          message: offlineMessage,
          tone: 'info',
          persistent: true,
          pressHint: 'Oculta el aviso',
          leading: (
            <WifiOffIcon
              color={colors.onInverse}
              size={iconSize.md}
              testID="sync-issue-toast-offline-icon"
            />
          ),
          // Con red pero sin haber logrado sincronizar, reintentar ya.
          action: isOffline
            ? undefined
            : { label: 'Reintentar', onPress: onRetry },
        };
  } else if (issue?.kind === 'recoverable') {
    notice = {
      id: issue.id,
      message:
        'No pudimos sincronizar tus datos. Lo guardado en este dispositivo sigue intacto.',
      tone: 'warning',
      action: { label: 'Reintentar', onPress: onRetry },
    };
  } else if (isReconnectedVisible) {
    notice = {
      id: reconnectedNoticeId,
      message: 'Conexión recuperada.',
      tone: 'success',
    };
  }

  const handleDismiss = (noticeId: number) => {
    if (noticeId === offlineNoticeId) setOfflineHidden(true);
    else if (noticeId === reconnectedNoticeId) setReconnectedVisible(false);
    else onDismiss(noticeId);
  };

  return (
    <NoticeToast
      notice={notice}
      onDismiss={handleDismiss}
      testID="sync-issue-toast"
    />
  );
}
